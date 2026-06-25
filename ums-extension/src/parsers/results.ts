import type { Course, ExamMark, CourseAssessment, Term } from '~lib/types';

export function parseResultsPage(doc: Document, termId?: string) {
  const pageText = doc.body?.textContent ?? '';

  if (isSessionExpired(pageText)) {
    return { error: 'SESSION_EXPIRED' } as const;
  }

  const courses = extractCourseGrades(doc);
  const examMarks = extractExamMarks(doc);
  const courseAssessments = extractCourseWiseMarks(doc, termId);
  const terms = extractTerms(doc);
  const allTermIds = extractAllTermIds(doc);

  return { courses, examMarks, courseAssessments, terms, allTermIds };
}

function isSessionExpired(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes('session expired') ||
    lower.includes('please login') ||
    lower.includes('login required') ||
    lower.includes('unauthorized') ||
    lower.includes('access denied') ||
    lower.includes('login.aspx')
  );
}

function extractCourseGrades(doc: Document): Course[] {
  const courses: Course[] = [];
  const seen = new Set<string>();

  doc.querySelectorAll('table').forEach(table => {
    let currentTermId = '';

    table.querySelectorAll('tr').forEach(row => {
      const rowText = row.textContent?.trim() ?? '';

      // Matches both pure-digit IDs (124251) and suffixed ones (12526R, 12526B, 12526A)
      const termMatch = rowText.match(/TermId[\s:]*([A-Z0-9]+)/i);
      if (termMatch && /^[\dA-Z]{5,7}$/i.test(termMatch[1]!)) {
        currentTermId = termMatch[1]!;
        return;
      }

      const cells = Array.from(row.querySelectorAll('td')).map(td => td.textContent?.trim() ?? '');
      const links = Array.from(row.querySelectorAll('a')).map(a => a.textContent?.trim() ?? '');
      const allData = [...cells, ...links];

      let courseCode = '';
      let courseName = '';
      let grade = '';
      let credits: number | undefined;

      allData.forEach(text => {
        if (text.includes('::') && /[A-Z]{2,4}\d{3}/.test(text)) {
          // Regular/RPL format: "CSE211 :: COURSE NAME"
          courseCode = extractCourseCode(text);
          courseName = extractCourseName(text);
        } else if (/^[A-Z]{2,4}\d{3,4}[A-Z]?$/.test(text)) {
          // Reappear format: bare code like "MTH174" or "CSE202"
          courseCode = text;
          courseName = '';
        } else if (/^[A-FO][+-]?$/.test(text) || text === 'O') {
          grade = text;
        } else if (/^\d+\.\d+$/.test(text)) {
          // Only capture decimals (2.00, 3.00) as credits — avoids Sr.No. integers
          const val = parseFloat(text);
          if (val > 0 && val <= 6) credits = val;
        }
      });

      if (courseCode && grade) {
        const key = `${courseCode}-${grade}-${currentTermId}`;
        if (!seen.has(key)) {
          seen.add(key);
          courses.push({
            courseCode,
            courseName,
            grade,
            ...(credits !== undefined && { credits }),
            ...(currentTermId && { termId: currentTermId }),
          });
        }
      }
    });
  });

  return courses;
}

function extractExamMarks(doc: Document): ExamMark[] {
  const exams: ExamMark[] = [];

  doc.querySelectorAll('table').forEach(table => {
    const headerRow = table.querySelector('tr');
    if (!headerRow) return;

    const headers = Array.from(headerRow.querySelectorAll('th, td'))
      .map(cell => cell.textContent?.trim() ?? '')
      .filter(h => h.length < 50);

    const isExamTable = headers.some(h => {
      const lower = h.toLowerCase();
      return lower.includes('marks') || lower.includes('obtained') || lower.includes('qno');
    });
    if (!isExamTable) return;

    Array.from(table.querySelectorAll('tr')).slice(1).forEach(row => {
      const cells = Array.from(row.querySelectorAll('td')).map(td => td.textContent?.trim() ?? '');
      if (cells.length < 3) return;

      const exam: Partial<ExamMark> = {};
      headers.forEach((header, i) => {
        const cell = cells[i];
        if (!cell) return;
        const h = header.toLowerCase();

        if (h.includes('course')) {
          exam.courseCode = extractCourseCode(cell);
          exam.courseName = extractCourseName(cell);
        } else if (h.includes('exam') || h.includes('description')) {
          exam.examType = cell;
        } else if (h.includes('date')) {
          exam.examDate = cell;
        } else if (h.includes('qno') || h.includes('question')) {
          exam.questionNumber = cell;
        } else if (h.includes('max')) {
          exam.maxMarks = parseFloat(cell) || 0;
        } else if (h.includes('obtained')) {
          exam.obtainedMarks = parseFloat(cell) || 0;
        }
      });

      if (exam.courseCode && exam.maxMarks !== undefined) {
        exams.push({
          courseCode: exam.courseCode,
          courseName: exam.courseName ?? '',
          examType: exam.examType ?? '',
          maxMarks: exam.maxMarks,
          obtainedMarks: exam.obtainedMarks ?? 0,
          ...(exam.examDate && { examDate: exam.examDate }),
          ...(exam.questionNumber && { questionNumber: exam.questionNumber }),
        });
      }
    });
  });

  return exams;
}

function extractCourseWiseMarks(doc: Document, termId?: string): CourseAssessment[] {
  const assessments: CourseAssessment[] = [];
  const validTypes = [
    'Continuous Assessment',
    'Practical End Term',
    'Attendance Marks',
    'Objective Type End Term',
    'Objective Type Mid Term',
    'Theory Mid Term',
    'Theory End Term',
  ];

  let currentCourse = '';
  doc.querySelectorAll('tr').forEach(row => {
    const rowText = row.textContent ?? '';
    const courseMatch = rowText.match(/Course:\s*([A-Z]{2,4}\d{3}::[^,\n]+)/);

    if (courseMatch) {
      currentCourse = courseMatch[1]!.trim();
      return;
    }
    if (!currentCourse) return;

    const cells = Array.from(row.querySelectorAll('td')).map(td => td.textContent?.trim() ?? '');
    if (cells.length < 6) return;

    const assessmentType = cells[1] ?? '';
    if (!validTypes.some(t => assessmentType.includes(t))) return;

    const parseMarks = (val: string): number | string => {
      if (val.toLowerCase() === 'awaited') return 'Awaited';
      const num = parseInt(val);
      return isNaN(num) ? val : num;
    };

    const parts = currentCourse.split('::');
    const entry: CourseAssessment = {
      courseCode: extractCourseCode(currentCourse),
      courseName: parts[1]?.trim() ?? '',
      assessmentType,
      maximumMarks: parseMarks(cells[2] ?? '0'),
      marksObtained: parseMarks(cells[3] ?? '0'),
      weightedMaximumMarks: parseMarks(cells[4] ?? '0'),
      weightedMarksObtained: parseMarks(cells[5] ?? '0'),
      isAwaited: (cells[3] ?? '').toLowerCase() === 'awaited' ||
                 (cells[5] ?? '').toLowerCase() === 'awaited',
    };
    if (termId) entry.termId = termId;
    assessments.push(entry);
  });

  return assessments;
}

function extractTerms(doc: Document): Term[] {
  const terms: Term[] = [];
  const seen = new Set<string>();

  // Collect TGPA from <p>TermId: 124251; TGPA: 8.14</p> in grade rows
  const tgpaMap = new Map<string, number>();
  doc.querySelectorAll('p').forEach(p => {
    const text = p.textContent?.trim() ?? '';
    const m = text.match(/TermId:\s*([A-Z0-9]+).*?TGPA:\s*([\d.]+)/i);
    if (m) tgpaMap.set(m[1]!, parseFloat(m[2]!));
  });

  doc.querySelectorAll('ul.rcbList li.rcbItem').forEach(li => {
    const termId = li.textContent?.trim() ?? '';
    if (!termId || seen.has(termId)) return;
    seen.add(termId);

    let category: Term['category'] = 'Unknown';
    let displayName = termId;

    // Term ID formats:
    //   124251, 25262       → Regular (pure digits, any length)
    //   12526A, 12526B      → Reappear/Improvement (suffix A or B)
    //   12526R, 12425R      → RPL (suffix R)
    if (/^\d+$/.test(termId)) {
      category = 'Regular';
    } else if (/^\d+[AB]$/i.test(termId)) {
      category = 'Reappear';
      displayName = `${termId} (Reappear)`;
    } else if (/^\d+R$/i.test(termId)) {
      category = 'RPL';
      displayName = `${termId} (RPL)`;
    }

    terms.push({
      id: termId,
      displayName,
      category,
      isActive: false,
      courses: [],
      tgpa: tgpaMap.get(termId) ?? null,
    });
  });

  terms.sort((a, b) => {
    const order: Record<string, number> = { Regular: 0, Reappear: 1, RPL: 2, Unknown: 3 };
    if (a.category !== b.category) return (order[a.category] ?? 3) - (order[b.category] ?? 3);
    return a.category === 'Regular' ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id);
  });

  const regularIds = terms.filter(t => t.category === 'Regular').map(t => t.id).sort().reverse();
  const activeSet = new Set(regularIds.slice(0, 2));
  let counter = 1;
  terms.forEach(t => {
    if (t.category === 'Regular') {
      t.displayName = `Semester ${counter++}`;
      t.isActive = activeSet.has(t.id);
    }
  });

  return terms;
}

function extractAllTermIds(doc: Document): string[] {
  const ids: string[] = [];
  doc.querySelectorAll('ul.rcbList li.rcbItem').forEach(li => {
    const text = li.textContent?.trim() ?? '';
    // Fetch Regular (pure-digit) AND Reappear (A/B suffix) terms — both have course-wise marks
    // RPL (R suffix) terms are skipped — they don't have component marks
    if (/^\d+$/.test(text) || /^\d+[AB]$/i.test(text)) ids.push(text);
  });
  return ids;
}

function extractCourseCode(text: string): string {
  return text.match(/^([A-Z]{2,4}\d{3})/)?.[1] ?? '';
}

function extractCourseName(text: string): string {
  return text.split('::')[1]?.trim() ?? '';
}
