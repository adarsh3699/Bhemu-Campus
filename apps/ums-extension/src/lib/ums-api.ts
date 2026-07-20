import { UMS_BASE_URL } from '~utils/constants';
import { parseHTML } from 'linkedom';
import type {
  UMSStudentBasicInfo,
  UMSAttendanceSummary,
  UMSApiData,
} from './types';

const DASHBOARD_BASE = `${UMS_BASE_URL}/lpuums/StudentDashboard.aspx`;

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
    // ASP.NET wraps responses in a `d` property
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
      Percentage: parseFloat(tds[5].textContent?.trim() ?? '0') || 0,
    });
  });
  return results;
}

export async function fetchSyncData(): Promise<UMSApiData> {
  const [rawBasicInfo, rawAttendanceHtml] = await Promise.all([
    postApi<UMSStudentBasicInfo[]>('GetStudentBasicInformation'),
    postApi<string>('StudentAttendanceSummary'),
  ]);

  const result: UMSApiData = {};

  const basicInfo = Array.isArray(rawBasicInfo) ? rawBasicInfo[0] : null;
  if (basicInfo) result.studentInfo = basicInfo;

  if (typeof rawAttendanceHtml === 'string' && rawAttendanceHtml.trim()) {
    result.attendance = parseAttendanceHtml(rawAttendanceHtml);
  }

  return result;
}
