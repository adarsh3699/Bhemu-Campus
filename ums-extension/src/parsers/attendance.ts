import type { AttendanceRecord } from '~lib/types';

export function parseAttendancePage(doc: Document): { attendance: AttendanceRecord[] } | { error: string } {
  const pageText = doc.body?.textContent ?? '';
  const lower = pageText.toLowerCase();

  if (
    lower.includes('session expired') ||
    lower.includes('please login') ||
    lower.includes('login.aspx')
  ) {
    return { error: 'SESSION_EXPIRED' };
  }

  const records: AttendanceRecord[] = [];

  doc.querySelectorAll('table').forEach(table => {
    const headerRow = table.querySelector('tr');
    if (!headerRow) return;

    const headers = Array.from(headerRow.querySelectorAll('th, td'))
      .map(cell => cell.textContent?.trim().toLowerCase() ?? '');

    const isAttendanceTable = headers.some(h =>
      h.includes('attendance') || h.includes('present') || h.includes('total duty')
    );
    if (!isAttendanceTable) return;

    Array.from(table.querySelectorAll('tr')).slice(1).forEach(row => {
      const cells = Array.from(row.querySelectorAll('td')).map(td => td.textContent?.trim() ?? '');
      if (cells.length < 3) return;

      let courseCode = '';
      let courseName = '';
      let totalLectures = 0;
      let attendedLectures = 0;
      let percentage = 0;

      headers.forEach((header, i) => {
        const cell = cells[i] ?? '';
        if (header.includes('course') || header.includes('subject')) {
          if (cell.includes('::') || /[A-Z]{2,4}\d{3}/.test(cell)) {
            courseCode = cell.match(/([A-Z]{2,4}\d{3})/)?.[1] ?? '';
            courseName = cell.split('::')[1]?.trim() ?? '';
          }
        } else if (header.includes('total duty') || header.includes('total')) {
          totalLectures = parseInt(cell) || 0;
        } else if (header.includes('present') || header.includes('attended')) {
          attendedLectures = parseInt(cell) || 0;
        } else if (header.includes('percentage') || header.includes('%')) {
          percentage = parseFloat(cell) || 0;
        }
      });

      if (courseCode && totalLectures > 0) {
        if (!percentage) {
          percentage = Math.round((attendedLectures / totalLectures) * 100 * 100) / 100;
        }
        records.push({ courseCode, courseName, totalLectures, attendedLectures, percentage });
      }
    });
  });

  return { attendance: records };
}
