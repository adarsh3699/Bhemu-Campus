import type { TimetableEntry } from '~lib/types';

export function parseTimetablePage(doc: Document): { timetable: TimetableEntry[] } | { error: string } {
  const pageText = doc.body?.textContent ?? '';
  const lower = pageText.toLowerCase();

  if (
    lower.includes('session expired') ||
    lower.includes('please login') ||
    lower.includes('login.aspx')
  ) {
    return { error: 'SESSION_EXPIRED' };
  }

  const entries: TimetableEntry[] = [];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  doc.querySelectorAll('table').forEach(table => {
    const headerRow = table.querySelector('tr');
    if (!headerRow) return;

    const headers = Array.from(headerRow.querySelectorAll('th, td'))
      .map(cell => cell.textContent?.trim() ?? '');

    const hasTimeSlots = headers.some(h => /\d{1,2}[:.]\d{2}/.test(h));
    if (!hasTimeSlots) return;

    Array.from(table.querySelectorAll('tr')).slice(1).forEach(row => {
      const cells = Array.from(row.querySelectorAll('td'));
      const dayCell = cells[0]?.textContent?.trim() ?? '';
      const day = days.find(d => dayCell.toLowerCase().includes(d.toLowerCase())) ?? dayCell;

      cells.slice(1).forEach((cell, i) => {
        const text = cell.textContent?.trim() ?? '';
        if (!text || text === '-' || text.toLowerCase() === 'free') return;

        const timeSlot = headers[i + 1] ?? '';
        const courseMatch = text.match(/([A-Z]{2,4}\d{3})/);
        const roomMatch = text.match(/Room[\s:]*([^\n,]+)/i) ?? text.match(/(\d{3,4}[A-Z]?)/);

        entries.push({
          dayOfWeek: day,
          timeSlot,
          courseCode: courseMatch?.[1] ?? '',
          courseName: text.replace(/[A-Z]{2,4}\d{3}/, '').replace(/Room[\s:]*.*/i, '').trim(),
          room: roomMatch?.[1]?.trim() ?? '',
          faculty: '',
        });
      });
    });
  });

  return { timetable: entries };
}
