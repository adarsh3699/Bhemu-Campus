import { UMS_BASE_URL } from '~utils/constants';
import { parseHTML } from 'linkedom';
import type {
  UMSStudentBasicInfo,
  UMSAttendanceSummary,
  UMSStudentCourse,
  UMSAnnouncement,
  UMSAnnouncementCategory,
  UMSSeatingPlan,
  UMSMessage,
  UMSApiData,
  TimetableEntry,
} from './types';

const DASHBOARD_BASE = `${UMS_BASE_URL}/lpuums/StudentDashboard.aspx`;
const TIMETABLE_BASE = `${UMS_BASE_URL}/lpuums/frmMyCurrentTimeTable.aspx`;

// Used by data-viewer to display announcement category labels
export const CATEGORY_NAME: Record<string, string> = {
  AC: 'Academic', AM: 'Administrative/Misc', CU: 'Co-curricular/Sports/Cultural',
  EX: 'Examination', PL: 'Placement', RE: 'Research',
};

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
    return (json?.d ?? json) as T;
  } catch (err) {
    console.warn(`API ${endpoint} failed:`, err);
    return null;
  }
}

function htmlDoc(html: string): Document {
  const { document } = parseHTML(`<html><body>${html}</body></html>`);
  return document as unknown as Document;
}

// ─── Attendance parser ────────────────────────────────────────────────────────

function parseAttendanceHtml(html: string): UMSAttendanceSummary[] {
  const doc = htmlDoc(html);
  const results: UMSAttendanceSummary[] = [];
  doc.querySelectorAll('tr').forEach(tr => {
    const tds = Array.from(tr.querySelectorAll('td'));
    if (tds.length < 6) return;
    const firstText = tds[0].textContent?.trim() ?? '';
    if (firstText.includes('Aggregate')) return;
    const colonIdx = firstText.indexOf(':');
    if (colonIdx === -1) return;
    results.push({
      CourseCode: firstText.slice(0, colonIdx).trim(),
      CourseName: firstText.slice(colonIdx + 1).trim(),
      ExamDate: tds[1].textContent?.trim() ?? '',
      Slot: parseInt(tds[2].textContent?.trim() ?? '0') || 0,
      TotalDuty: parseInt(tds[3].textContent?.trim() ?? '0') || 0,
      Present: parseInt(tds[4].textContent?.trim() ?? '0') || 0,
      Percentage: parseFloat(tds[5].textContent?.trim() ?? '0') || 0,
    });
  });
  return results;
}

// ─── Courses parser ───────────────────────────────────────────────────────────
// Structure per .mycoursesdiv:
//   .c100 span → "98%"
//   .col-sm-6 p:first → "<b>PETV50 </b> : COURSE NAME<br/> <b>Term : </b>2526W"
//   .col-sm-6 p:nth(1) → "<b>Roll No : </b>R9PV34A11 / Group 1"
//   .col-sm-6 p:nth(2) → "<b>Exam Pattern : </b>NA"

function parseCoursesHtml(html: string): UMSStudentCourse[] {
  const doc = htmlDoc(html);
  const results: UMSStudentCourse[] = [];
  doc.querySelectorAll('.mycoursesdiv').forEach(div => {
    const attSpan = div.querySelector('.c100 span');
    const AttendancePct = parseFloat(attSpan?.textContent?.replace('%', '') ?? '0') || 0;

    const infoDivPs = Array.from(div.querySelectorAll('.col-sm-6 p'));

    // First p: "PETV50  : COURSE NAME  Term : 2526W"
    const p0Text = infoDivPs[0]?.textContent?.trim() ?? '';
    const colonIdx = p0Text.indexOf(':');
    const CourseCode = p0Text.slice(0, colonIdx).trim();
    // Between first : and "Term" label
    const afterColon = p0Text.slice(colonIdx + 1);
    const termLabelIdx = afterColon.indexOf('Term');
    const CourseName = (termLabelIdx !== -1 ? afterColon.slice(0, termLabelIdx) : afterColon).trim();
    const termColonIdx = afterColon.indexOf(':', termLabelIdx);
    const Term = termLabelIdx !== -1 && termColonIdx !== -1
      ? afterColon.slice(termColonIdx + 1).trim()
      : '';

    // Second p: "Roll No : R9PV34A11 / Group 1"
    const p1Text = infoDivPs[1]?.textContent?.trim() ?? '';
    const rollColonIdx = p1Text.indexOf(':');
    const RollNo = rollColonIdx !== -1 ? p1Text.slice(rollColonIdx + 1).trim() : p1Text;

    // Third p: "Exam Pattern : NA"
    const p2Text = infoDivPs[2]?.textContent?.trim() ?? '';
    const examColonIdx = p2Text.indexOf(':');
    const ExamPattern = examColonIdx !== -1 ? p2Text.slice(examColonIdx + 1).trim() : p2Text;

    if (!CourseCode) return;
    results.push({ CourseCode, CourseName, Term, RollNo, ExamPattern, AttendancePct });
  });
  return results;
}

// ─── Seating parser ───────────────────────────────────────────────────────────
// GetSeatingPlan returns "NA" string when no exams are scheduled.

function parseSeatingHtml(html: string): UMSSeatingPlan[] {
  if (!html || html.trim() === 'NA') return [];
  const doc = htmlDoc(html);
  const results: UMSSeatingPlan[] = [];
  doc.querySelectorAll('.mycoursesdiv').forEach(div => {
    const texts = Array.from(div.querySelectorAll('p, div, td, b'))
      .map(el => el.textContent?.trim() ?? '')
      .filter(t => t.length > 0);
    if (texts.length < 2) return;
    results.push({
      CourseCode: texts[0] ?? '',
      CourseName: texts[1] ?? '',
      ExamDate: texts[2] ?? '',
      ExamType: texts[3] ?? '',
      Room: texts[4] ?? '',
      Status: texts[5] ?? '',
    });
  });
  return results;
}

// ─── Messages parser ──────────────────────────────────────────────────────────
// Structure per .mycoursesdiv:
//   .col-sm-12.right-arrow → "Subject - By SenderName (Date)"
//   .col-sm-12 p.text-muted → body text

function parseMessagesHtml(html: string): UMSMessage[] {
  const doc = htmlDoc(html);
  const results: UMSMessage[] = [];
  doc.querySelectorAll('.mycoursesdiv').forEach(div => {
    const headerEl = div.querySelector('.right-arrow, .font-weight-medium');
    const bodyEl = div.querySelector('p.text-small, p.text-muted, .text-muted');

    const headerText = headerEl?.textContent?.trim() ?? '';
    const Body = bodyEl?.textContent?.trim() ?? '';
    // Preserve inner HTML so links (<a href>) remain clickable in the viewer
    const BodyHtml = bodyEl?.innerHTML?.trim() ?? '';

    // Format: "Subject - By SenderName (Date)"
    const byIdx = headerText.lastIndexOf(' - By ');
    let Subject = headerText;
    let SenderName = '';
    let Date = '';

    if (byIdx !== -1) {
      Subject = headerText.slice(0, byIdx).trim();
      const senderPart = headerText.slice(byIdx + 6).trim(); // after " - By "
      const parenIdx = senderPart.lastIndexOf('(');
      if (parenIdx !== -1) {
        SenderName = senderPart.slice(0, parenIdx).trim();
        Date = senderPart.slice(parenIdx + 1).replace(')', '').trim();
      } else {
        SenderName = senderPart;
      }
    }

    if (!Subject) return;
    results.push({ Subject, SenderName, Date, Body, BodyHtml });
  });
  return results;
}

// ─── Timetable — GetTimeTable (no body needed, returns full week HTML) ────────
// Structure: <section id='w-schedule-mon'> per day
// Each slot: <a onclick='openPopup("desc","19:00-20:00","Monday","CourseName","CourseCode","L")'>
//   arg[0]: full description (has Room after S: and Faculty after ::)
//   arg[1]: time range "19:00-20:00"
//   arg[2]: day name
//   arg[3]: assignment/course display name
//   arg[4]: course code
//   arg[5]: type (L/P/T)

function parseTimetableHtml(html: string): TimetableEntry[] {
  const doc = htmlDoc(html);
  const entries: TimetableEntry[] = [];

  doc.querySelectorAll('.w-schedule__day, section[id^="w-schedule-"]').forEach(section => {
    const dayLabel = section.querySelector('.w-schedule__col-label')?.textContent?.trim() ?? '';
    if (!dayLabel) return;

    section.querySelectorAll('.w-schedule__event-wrapper a[onclick]').forEach(anchor => {
      const onclick = anchor.getAttribute('onclick') ?? '';
      // Parse: openPopup("arg0","arg1","arg2","arg3","arg4","arg5")
      const match = onclick.match(/openPopup\s*\((.+)\)\s*$/s);
      if (!match) return;

      // Split args respecting quoted strings
      const argsRaw = match[1];
      const args: string[] = [];
      let inQ = false, cur = '', delim = '';
      for (const ch of argsRaw) {
        if (!inQ && (ch === '"' || ch === "'")) { inQ = true; delim = ch; continue; }
        if (inQ && ch === delim) { inQ = false; args.push(cur); cur = ''; continue; }
        if (!inQ && ch === ',') continue;
        if (inQ) cur += ch;
      }

      // arg[0]: "Lecture / G:All C:PETV50 / R: Assignment-1 / S:9PV34 / Teacher: 21482::Amarinder Kaur"
      const desc = args[0] ?? '';
      const timeRange = args[1] ?? '';   // "19:00-20:00"
      const day = args[2] ?? dayLabel;   // "Monday"
      const courseName = args[3] ?? '';  // "Assignment-1"
      const courseCode = args[4] ?? '';  // "PETV50"

      // Extract room from desc: "S:9PV34"
      const roomMatch = desc.match(/\bS:(\S+)/);
      const room = roomMatch?.[1] ?? '';

      // Extract faculty from desc: "Teacher: 21482::Amarinder Kaur"
      const facultyMatch = desc.match(/Teacher:\s*\d+::(.+)$/);
      const faculty = facultyMatch?.[1]?.trim() ?? '';

      const timeParts = timeRange.split('-');
      const startTime = timeParts[0]?.trim() ?? '';
      const endTime = timeParts[1]?.trim() ?? '';

      entries.push({
        dayOfWeek: day,
        timeSlot: timeRange,
        startTime,
        endTime,
        courseCode,
        courseName,
        room,
        faculty,
      });
    });
  });

  return entries;
}

const UMS_DATA_VIEWER = process.env.PLASMO_PUBLIC_UMS_DATA_VIEWER === 'true';

async function getTimetableTermId(): Promise<string> {
  // GET the page HTML — TermId is in a hidden input or script variable
  try {
    const res = await fetch(TIMETABLE_BASE, { credentials: 'include' });
    if (!res.ok) return '';
    const html = await res.text();
    const doc = htmlDoc(html);

    // TermId is the first <option> in <select name="Select1"> on the timetable page
    const firstOption = doc.querySelector('select#Select1 option, select[name="Select1"] option');
    const optVal = firstOption?.getAttribute('value') ?? '';
    if (/^\d+$/.test(optVal)) return optVal;
  } catch (err) {
    console.warn('getTimetableTermId failed:', err);
  }
  return '';
}

export async function fetchTimetable(): Promise<{ entries: TimetableEntry[]; rawHtml?: string }> {
  try {
    // Step 1: extract TermId from page HTML
    const termId = await getTimetableTermId();

    // Step 2: GetTimeTable — send TermId + Referer (server checks origin page)
    const response = await fetch(`${TIMETABLE_BASE}/GetTimeTable`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': TIMETABLE_BASE,
      },
      body: JSON.stringify(termId ? { TermId: termId } : {}),
    });
    if (!response.ok) {
      console.warn(`GetTimeTable returned ${response.status}`);
      return { entries: [] };
    }
    const json = await response.json();
    const html = typeof json?.d === 'string' ? json.d : '';
    if (!html) {
      console.warn('GetTimeTable: empty response, TermId was:', termId || '(none)');
      return { entries: [] };
    }
    return { entries: parseTimetableHtml(html), rawHtml: UMS_DATA_VIEWER ? html.slice(0, 10000) : undefined };
  } catch (err) {
    console.warn('fetchTimetable failed:', err);
    return { entries: [] };
  }
}

// ─── Main sync data fetch ─────────────────────────────────────────────────────

export async function fetchSyncData(): Promise<UMSApiData> {
  // Always fetch: student info + attendance (needed for production sync)
  const [rawBasicInfo, rawAttendanceHtml] = await Promise.all([
    postApi<UMSStudentBasicInfo[]>('GetStudentBasicInformation'),
    postApi<string>('StudentAttendanceSummary'),
  ]);

  // Dev-only fetches: courses, announcements, seating, messages, heads
  // These are only used by the data-viewer — not written to Firestore.
  let rawCoursesHtml: string | null = null;
  let rawAnnouncementsStr: unknown = null;
  let rawSeatingHtml: string | null = null;
  let rawMessagesHtml: string | null = null;
  let rawHeadsHtml: string | null = null;

  if (UMS_DATA_VIEWER) {
    [rawCoursesHtml, rawAnnouncementsStr, rawSeatingHtml, rawMessagesHtml, rawHeadsHtml] =
      await Promise.all([
        postApi<string>('GetStudentCourses'),
        postApi<unknown>('AnnouncementDetails', { LoginId: 'Reg', Type: 'S' }),
        postApi<string>('GetSeatingPlan'),
        postApi<string>('GetStudentMessages'),
        postApi<string>('GetHeads'),
      ]);
  }

  const result: UMSApiData = {};

  function resolveAnnouncements(raw: unknown): { list: UMSAnnouncement[]; categories: UMSAnnouncementCategory[] | undefined } {
    if (Array.isArray(raw)) return { list: raw as UMSAnnouncement[], categories: undefined };
    if (typeof raw === 'string' && raw.trim()) {
      try {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return { list: p as UMSAnnouncement[], categories: undefined };
        if (p && Array.isArray(p.AnnouncementList)) return { list: p.AnnouncementList, categories: p.CategoryList };
      } catch { /* malformed */ }
    }
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const r = raw as Record<string, unknown>;
      if (Array.isArray(r.AnnouncementList)) return { list: r.AnnouncementList as UMSAnnouncement[], categories: r.CategoryList as UMSAnnouncementCategory[] | undefined };
    }
    return { list: [], categories: undefined };
  }

  const basicInfo = Array.isArray(rawBasicInfo) ? rawBasicInfo[0] : null;
  if (basicInfo) result.studentInfo = basicInfo;

  if (typeof rawAttendanceHtml === 'string' && rawAttendanceHtml.trim()) {
    result.attendance = parseAttendanceHtml(rawAttendanceHtml);
  }

  if (typeof rawCoursesHtml === 'string' && rawCoursesHtml.trim()) {
    result.courses = parseCoursesHtml(rawCoursesHtml);
  }

  if (rawAnnouncementsStr != null) {
    const { list, categories } = resolveAnnouncements(rawAnnouncementsStr);
    if (list.length > 0) {
      result.announcements = list;
      if (categories) result.announcementCategories = categories;
    }
  }

  // seating returns "NA" string when no exams are scheduled
  if (typeof rawSeatingHtml === 'string') {
    result.seatingPlan = parseSeatingHtml(rawSeatingHtml);
  }

  if (typeof rawMessagesHtml === 'string' && rawMessagesHtml.trim()) {
    result.messages = parseMessagesHtml(rawMessagesHtml);
  }

  if (typeof rawHeadsHtml === 'string' && rawHeadsHtml.trim()) {
    result.headsHtml = rawHeadsHtml;
  }

  if (UMS_DATA_VIEWER) {
    result._rawHtml = {
      attendance: typeof rawAttendanceHtml === 'string' ? rawAttendanceHtml.slice(0, 5000) : '',
      courses: typeof rawCoursesHtml === 'string' ? rawCoursesHtml.slice(0, 5000) : '',
      announcements: rawAnnouncementsStr != null
        ? (typeof rawAnnouncementsStr === 'string' ? rawAnnouncementsStr : JSON.stringify(rawAnnouncementsStr)).slice(0, 5000)
        : '',
      seating: typeof rawSeatingHtml === 'string' ? rawSeatingHtml.slice(0, 5000) : '',
      messages: typeof rawMessagesHtml === 'string' ? rawMessagesHtml.slice(0, 5000) : '',
      heads: typeof rawHeadsHtml === 'string' ? rawHeadsHtml.slice(0, 20000) : '',
    };
  }

  return result;
}
