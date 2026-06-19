import { UMS_BASE_URL } from '~utils/constants';
import { parseHTML } from 'linkedom';
import type {
  UMSStudentBasicInfo,
  UMSStudentCourse,
  UMSAnnouncement,
  UMSAnnouncementCategory,
  UMSSeatingPlan,
  UMSMessage,
  UMSHead,
  UMSAttendanceSummary,
  UMSApiData,
} from './types';

const DASHBOARD_BASE = `${UMS_BASE_URL}/lpuums/StudentDashboard.aspx`;

// Fixed category list — won't change between users
const ANNOUNCEMENT_CATEGORIES: UMSAnnouncementCategory[] = [
  { code: 'AC', name: 'Academic',                       displayorder: 1, today: 0, total: 0 },
  { code: 'AM', name: 'Administrative/Misc',             displayorder: 2, today: 0, total: 0 },
  { code: 'CU', name: 'Co-curricular/Sports/Cultural',   displayorder: 5, today: 0, total: 0 },
  { code: 'EX', name: 'Examination',                    displayorder: 6, today: 0, total: 0 },
  { code: 'PL', name: 'Placement',                      displayorder: 7, today: 0, total: 0 },
  { code: 'RE', name: 'Research',                       displayorder: 8, today: 0, total: 0 },
];

export const CATEGORY_NAME: Record<string, string> = Object.fromEntries(
  ANNOUNCEMENT_CATEGORIES.map(c => [c.code, c.name])
);

async function postApi<T>(endpoint: string, body: Record<string, string> = {}): Promise<T | null> {
  try {
    const response = await fetch(`${DASHBOARD_BASE}/${endpoint}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.warn(`API ${endpoint} returned ${response.status}`);
      return null;
    }

    const json = await response.json();
    // ASP.NET wraps responses in a `d` property
    return (json?.d ?? json) as T;
  } catch (err) {
    console.warn(`API ${endpoint} failed:`, err);
    return null;
  }
}

function parseJsonD<T>(raw: unknown): T | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
  if (Array.isArray(raw)) return raw as T;
  if (typeof raw === 'object') return raw as T;
  return null;
}

function htmlDoc(html: string): Document {
  const { document } = parseHTML(`<html><body>${html}</body></html>`);
  return document as unknown as Document;
}

function parseAttendanceHtml(html: string): UMSAttendanceSummary[] {
  const doc = htmlDoc(html);
  const results: UMSAttendanceSummary[] = [];
  doc.querySelectorAll('tr').forEach(tr => {
    const tds = Array.from(tr.querySelectorAll('td'));
    if (tds.length < 6) return;
    const firstText = tds[0].textContent?.trim() ?? '';
    // Skip the aggregate row
    if (firstText.includes('Aggregate')) return;
    const colonIdx = firstText.indexOf(':');
    if (colonIdx === -1) return;
    const courseCode = firstText.slice(0, colonIdx).trim();
    const courseName = firstText.slice(colonIdx + 1).trim();
    results.push({
      CourseCode: courseCode,
      CourseName: courseName,
      ExamDate: tds[1].textContent?.trim() ?? '',
      Slot: parseInt(tds[2].textContent?.trim() ?? '0') || 0,
      TotalDuty: parseInt(tds[3].textContent?.trim() ?? '0') || 0,
      Present: parseInt(tds[4].textContent?.trim() ?? '0') || 0,
      Percentage: parseInt(tds[5].textContent?.trim() ?? '0') || 0,
    });
  });
  return results;
}

function parseCoursesHtml(html: string): UMSStudentCourse[] {
  const doc = htmlDoc(html);
  const results: UMSStudentCourse[] = [];
  doc.querySelectorAll('.mycoursesdiv').forEach(div => {
    // Attendance % from c100 p{N} class e.g. "c100 p90 small green"
    const circleEl = div.querySelector('[class*="c100"]');
    const pctClass = Array.from(circleEl?.classList ?? []).find(c => /^p\d+$/.test(c));
    const attendancePct = pctClass ? parseInt(pctClass.slice(1)) : 0;

    const paras = Array.from(div.querySelectorAll('p.font-weight-medium'));
    if (!paras.length) return;

    // First p: "<b>CSE211 </b> : COURSE NAME<br/> <b>Term : </b>25262"
    const firstP = paras[0]?.innerHTML ?? '';
    const boldTags = paras[0]?.querySelectorAll('b') ?? [];
    const courseCodeRaw = boldTags[0]?.textContent?.trim() ?? '';
    const courseCode = courseCodeRaw.replace(/\s+/g, '');

    // Everything after the first bold+colon up to <br
    const afterColon = firstP.replace(/<b>[^<]*<\/b>\s*:\s*/, '');
    const courseName = afterColon.split(/<br\s*\/?>/i)[0].replace(/<[^>]+>/g, '').trim();

    // Term from first paragraph text
    const termText = paras[0]?.textContent ?? '';
    const termNum = termText.match(/Term\s*:\s*(\d+)/i)?.[1] ?? '';

    // Roll No from second p
    const rollText = paras[1]?.textContent ?? '';
    const rollNo = rollText.replace(/Roll\s*No\s*:\s*/i, '').trim();

    // Exam pattern from third p
    const examText = paras[2]?.textContent ?? '';
    const examPattern = examText.replace(/Exam\s*Pattern\s*:\s*/i, '').trim();

    if (!courseCode) return;
    results.push({ CourseCode: courseCode, CourseName: courseName, Term: termNum, RollNo: rollNo, ExamPattern: examPattern, AttendancePct: attendancePct });
  });
  return results;
}

function parseSeatingHtml(html: string): UMSSeatingPlan[] {
  const doc = htmlDoc(html);
  const results: UMSSeatingPlan[] = [];
  doc.querySelectorAll('.mycoursesdiv').forEach(div => {
    // Header: "Date : 19 Jun 2026 MTH302 : PROBABILITY AND STATISTICS <span...>Upcoming</span>"
    const headerEl = div.querySelector('.right-arrow, .font-weight-medium');
    const headerText = headerEl?.textContent?.trim() ?? '';

    // Extract date
    const dateMatch = headerText.match(/Date\s*:\s*(\d{1,2}\s+\w+\s+\d{4})/i);
    const examDate = dateMatch?.[1] ?? '';

    // Extract course code and name: after the date, pattern "CODE : NAME"
    const afterDate = dateMatch ? headerText.slice(dateMatch.index! + dateMatch[0].length).trim() : headerText;
    const courseMatch = afterDate.match(/([A-Z]{2,4}\d{3,})\s*:\s*(.+?)(?:\s*$)/);
    const courseCode = courseMatch?.[1] ?? '';
    const courseName = courseMatch?.[2]?.split(/\s{2,}/)[0].trim() ?? afterDate.trim();

    // Status badge
    const status = headerEl?.querySelector?.('.badge')?.textContent?.trim() ?? '';

    // Body lines from text-muted paragraphs
    const bodyParas = Array.from(div.querySelectorAll('.text-muted'));
    const examType = bodyParas[0]?.textContent?.replace(/Exam\s*:/i, '').trim() ?? '';
    const roomLine = bodyParas[1]?.textContent ?? '';
    const roomMatch = roomLine.match(/Room\s*No\s*:\s*(\S+)/i);
    const room = roomMatch?.[1] ?? '';

    if (!courseCode) return;
    results.push({ CourseCode: courseCode, CourseName: courseName, ExamDate: examDate, ExamType: examType, Room: room, Status: status });
  });
  return results;
}

function parseMessagesHtml(html: string): UMSMessage[] {
  const doc = htmlDoc(html);
  const results: UMSMessage[] = [];
  doc.querySelectorAll('.mycoursesdiv').forEach(div => {
    // Header div: "Subject text - By SenderName (Date)"
    const headerEl = div.querySelector('.right-arrow, .font-weight-medium');
    const headerText = headerEl?.textContent?.trim() ?? '';

    // Use lastIndexOf to handle subjects with " - " embedded (e.g. multi-line subjects with newlines)
    const lastByIdx = headerText.lastIndexOf(' - By ');
    let subject = headerText;
    let senderName = '';
    let date = '';
    if (lastByIdx !== -1) {
      subject = headerText.slice(0, lastByIdx).trim();
      const rest = headerText.slice(lastByIdx + 6).trim();
      const parenMatch = rest.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
      senderName = parenMatch?.[1]?.trim() ?? rest;
      date = parenMatch?.[2]?.trim() ?? '';
    }

    const bodyEl = div.querySelector('.text-muted');
    const body = bodyEl?.textContent?.trim() ?? '';

    results.push({ Subject: subject, SenderName: senderName, Date: date, Body: body });
  });
  return results;
}

export async function fetchAllApiData(): Promise<UMSApiData> {
  const [
    rawBasicInfo,
    rawCoursesHtml,
    rawAnnouncements,
    rawSeatingHtml,
    rawMessagesHtml,
    rawHeads,
    rawAttendanceHtml,
  ] = await Promise.all([
    postApi<UMSStudentBasicInfo[]>('GetStudentBasicInformation'),
    postApi<string>('GetStudentCourses'),
    postApi<UMSAnnouncement[]>('AnnouncementDetails', { LoginId: 'Reg', Type: 'S' }),
    postApi<string>('GetSeatingPlan'),
    postApi<string>('GetStudentMessages'),
    postApi<UMSHead[]>('GetHeads'),
    postApi<string>('StudentAttendanceSummary'),
  ]);

  const result: UMSApiData = {};

  // GetStudentBasicInformation returns [{...}] — an array with one element
  const basicInfo = Array.isArray(rawBasicInfo) ? rawBasicInfo[0] : null;
  if (basicInfo) result.studentInfo = basicInfo;

  // HTML-returning endpoints
  if (typeof rawAttendanceHtml === 'string' && rawAttendanceHtml.trim()) {
    result.attendance = parseAttendanceHtml(rawAttendanceHtml);
  }
  if (typeof rawCoursesHtml === 'string' && rawCoursesHtml.trim()) {
    result.courses = parseCoursesHtml(rawCoursesHtml);
  }
  if (typeof rawSeatingHtml === 'string' && rawSeatingHtml.trim()) {
    result.seatingPlan = parseSeatingHtml(rawSeatingHtml);
  }
  if (typeof rawMessagesHtml === 'string' && rawMessagesHtml.trim()) {
    result.messages = parseMessagesHtml(rawMessagesHtml);
  }

  // Proper JSON endpoints
  const announcements = parseJsonD<UMSAnnouncement[]>(rawAnnouncements);
  if (announcements) result.announcements = announcements;

  result.announcementCategories = ANNOUNCEMENT_CATEGORIES;

  const heads = parseJsonD<UMSHead[]>(rawHeads);
  if (heads) result.heads = heads;

  return result;
}
