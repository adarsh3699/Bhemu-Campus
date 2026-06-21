import type { StudentInfo } from '~lib/types';

export function parseDashboardPage(doc: Document): { studentInfo: StudentInfo } | { error: string } {
  const pageText = doc.body?.textContent ?? '';
  const lower = pageText.toLowerCase();

  if (
    lower.includes('session expired') ||
    lower.includes('please login') ||
    lower.includes('login.aspx')
  ) {
    return { error: 'SESSION_EXPIRED' };
  }

  const vid =
    extractPattern(pageText, /VID[\s:]*(\d+)/) ||
    doc.getElementById('lblVID')?.textContent?.trim() ||
    null;

  const name =
    extractStudentName(pageText) ||
    doc.getElementById('lblStudentName')?.textContent?.trim() ||
    null;

  let program =
    extractPattern(pageText, /Program[\s:]*([^,\n]+)/) ||
    doc.getElementById('lblProgram')?.textContent?.trim() ||
    null;

  if (program?.toLowerCase().includes('request for change')) {
    const match = pageText.match(/P\d{3}\s*:\s*[^,\n\r]+/i);
    if (match) program = match[0].trim();
  }

  const batchYear = extractPattern(pageText, /Batch Year[\s:]*(\d{4})/) || null;
  const cgpa =
    extractPattern(pageText, /CGPA[\s:]*(\d+\.?\d*)/) ||
    doc.getElementById('lblCGPA')?.textContent?.trim() ||
    null;

  return { studentInfo: { vid, name, program, batchYear, cgpa } };
}

function extractPattern(text: string, regex: RegExp): string | null {
  return text.match(regex)?.[1]?.trim() ?? null;
}

function extractStudentName(pageText: string): string | null {
  const patterns = [
    /Student Name[\s:]*([A-Za-z\s]+?)(?:\n|\t|Batch|VID|Program)/i,
    /Name[\s:]*([A-Za-z\s]+?)(?:\n|\t|Batch|VID|Program)/i,
  ];

  for (const pattern of patterns) {
    const match = pageText.match(pattern);
    if (match?.[1]) {
      const clean = match[1].trim().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '').trim();
      if (clean.length >= 2 && clean.length <= 50 && /^[A-Za-z\s]+$/.test(clean)) {
        return clean;
      }
    }
  }
  return null;
}
