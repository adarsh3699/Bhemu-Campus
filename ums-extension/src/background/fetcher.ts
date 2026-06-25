import { UMS_RESULTS_URL } from '~utils/constants';
import { parseHTML } from 'linkedom';
import { parseResultsPage } from '~parsers/results';

function htmlToDoc(html: string): Document {
  const { document } = parseHTML(html);
  return document as unknown as Document;
}
import { fetchSyncData } from '~lib/ums-api';
import type { SyncResult, Course, ExamMark, CourseAssessment } from '~lib/types';

function mapAttendance(apiData: Awaited<ReturnType<typeof fetchSyncData>>): SyncResult['attendance'] {
  return (apiData.attendance ?? []).map(a => ({
    courseCode: a.CourseCode,
    courseName: a.CourseName,
    totalLectures: a.TotalDuty,
    attendedLectures: a.Present,
    percentage: a.Percentage,
  }));
}

async function fetchPage(url: string): Promise<string> {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${url}`);
  return response.text();
}

async function fetchTermData(termId: string, viewState: string, eventValidation: string, vstate: string): Promise<string> {
  const boundary = `----WebKitFormBoundary${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  let formData = '';

  const addField = (name: string, value: string) => {
    formData += `--${boundary}\r\n`;
    formData += `Content-Disposition: form-data; name="${name}"\r\n\r\n`;
    formData += `${value}\r\n`;
  };

  addField('ctl00_RadScriptManager1_TSM', '');
  addField('__EVENTTARGET', 'ctl00$cphHeading$rdTerm');
  addField('__EVENTARGUMENT', `{"Command":"Select","Index":0}`);
  addField('__LASTFOCUS', '');
  addField('__VSTATE', vstate);
  addField('__VIEWSTATE', viewState);
  addField('__EVENTVALIDATION', eventValidation);
  addField('ctl00$cphHeading$rdTerm', termId);
  addField(
    'ctl00_cphHeading_rdTerm_ClientState',
    `{"logEntries":[],"value":"${termId}","text":"${termId}","enabled":true,"checkedIndices":[],"checkedItemsTextOverflows":false}`
  );
  formData += `--${boundary}--\r\n`;

  const response = await fetch(UMS_RESULTS_URL, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body: formData,
  });

  if (!response.ok) throw new Error(`HTTP ${response.status} selecting term ${termId}`);
  return response.text();
}

export async function fetchAttendanceOnly(): Promise<Pick<SyncResult, 'attendance'>> {
  const apiData = await fetchSyncData();
  return { attendance: mapAttendance(apiData) };
}

export async function fetchAllData(): Promise<SyncResult | { error: string }> {
  // Fetch HTML pages + JSON APIs in parallel
  // Timetable (frmStudentTimeTable.aspx) uses SSRS ReportViewer — JS-rendered, not scrapable via fetch.
  // Attendance now comes from JSON API (StudentAttendanceSummary), not HTML scraping
  const [resultsHtml, apiData] = await Promise.all([
    fetchPage(UMS_RESULTS_URL),
    fetchSyncData(),
  ]);

  // Parse initial results page
  const resultsDoc = htmlToDoc(resultsHtml);
  const resultsResult = parseResultsPage(resultsDoc);
  if ('error' in resultsResult) return { error: resultsResult.error ?? 'Unknown error' };

  // Extract ViewState for term switching
  const viewStateEl = resultsDoc.querySelector('input[name="__VIEWSTATE"]') as HTMLInputElement | null;
  const eventValidationEl = resultsDoc.querySelector('input[name="__EVENTVALIDATION"]') as HTMLInputElement | null;
  const vstateEl = resultsDoc.querySelector('input[name="__VSTATE"]') as HTMLInputElement | null;

  const viewState = viewStateEl?.value ?? '';
  const eventValidation = eventValidationEl?.value ?? '';
  const vstate = vstateEl?.value ?? '';

  // Fetch data for all terms
  const allCourses: Course[] = [...resultsResult.courses];
  const allExamMarks: ExamMark[] = [...resultsResult.examMarks];
  const allAssessments: CourseAssessment[] = [...resultsResult.courseAssessments];

  const termResults = await Promise.allSettled(
    resultsResult.allTermIds.map(termId =>
      fetchTermData(termId, viewState, eventValidation, vstate)
        .then(html => parseResultsPage(htmlToDoc(html), termId))
    )
  );

  for (const [i, result] of termResults.entries()) {
    if (result.status === 'rejected') {
      console.warn(`Failed to fetch term ${resultsResult.allTermIds[i]}:`, result.reason);
      continue;
    }
    const termResult = result.value;
    if (!('error' in termResult)) {
      allCourses.push(...termResult.courses);
      allExamMarks.push(...termResult.examMarks);
      allAssessments.push(...termResult.courseAssessments);
    }
  }

  // Deduplicate courses
  const courseMap = new Map<string, Course>();
  allCourses.forEach(c => {
    const key = `${c.courseCode}-${c.grade}-${c.termId ?? ''}`;
    if (!courseMap.has(key)) courseMap.set(key, c);
  });

  const attendance = mapAttendance(apiData);

  // Timetable (frmStudentTimeTable.aspx) uses SSRS ReportViewer — JS-rendered, not fetchable.
  const timetable: SyncResult['timetable'] = [];

  // Prefer API student info (cleaner) over HTML-parsed, fallback to HTML
  const studentInfo = apiData.studentInfo
    ? {
        vid: apiData.studentInfo.Registrationnumber ?? apiData.studentInfo.StudentUid ?? null,
        name: apiData.studentInfo.StudentName ?? null,
        program: apiData.studentInfo.Program ?? null,
        batchYear: apiData.studentInfo.BatchYear ?? null,
        cgpa: apiData.studentInfo.CGPA ?? null,
      }
    : undefined;

  return {
    studentInfo,
    courses: Array.from(courseMap.values()),
    examMarks: allExamMarks,
    courseAssessments: allAssessments,
    attendance,
    timetable,
    terms: resultsResult.terms,
    apiData,
  };
}
