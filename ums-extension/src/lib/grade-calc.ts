import type { Course } from './types';

// LPU grade table — single source of truth for the extension
export const GRADE_TABLE: Array<{ grade: string; gradePoint: number; performance: string }> = [
  { grade: 'O',  gradePoint: 10, performance: 'Outstanding' },
  { grade: 'A+', gradePoint: 9,  performance: 'Excellent' },
  { grade: 'A',  gradePoint: 8,  performance: 'Very Good' },
  { grade: 'B+', gradePoint: 7,  performance: 'Good' },
  { grade: 'B',  gradePoint: 6,  performance: 'Above Average' },
  { grade: 'C',  gradePoint: 5,  performance: 'Average' },
  { grade: 'P',  gradePoint: 4,  performance: 'Pass' },
  { grade: 'D',  gradePoint: 4,  performance: 'Pass' },
  { grade: 'F',  gradePoint: 0,  performance: 'Fail' },
  { grade: 'G',  gradePoint: 0,  performance: 'Backlog' },
  { grade: 'E',  gradePoint: 0,  performance: 'Reappear' },
  { grade: 'I',  gradePoint: 0,  performance: 'Incomplete' },
];

const GRADE_TO_POINT: Record<string, number> = Object.fromEntries(
  GRADE_TABLE.map((e) => [e.grade, e.gradePoint])
);

export function getGradePoint(grade: string): number {
  return GRADE_TO_POINT[grade.toUpperCase()] ?? 0;
}

export function calculateAverageGradePoint(courses: Course[]): number {
  if (courses.length === 0) return 0;
  const withCredits = courses.filter((c) => c.credits !== undefined && c.credits > 0);
  if (withCredits.length > 0) {
    const totalWeighted = withCredits.reduce((sum, c) => sum + getGradePoint(c.grade) * c.credits!, 0);
    const totalCredits = withCredits.reduce((sum, c) => sum + c.credits!, 0);
    return Math.round((totalWeighted / totalCredits) * 100) / 100;
  }
  const total = courses.reduce((sum, c) => sum + getGradePoint(c.grade), 0);
  return Math.round((total / courses.length) * 100) / 100;
}
