import type { Course } from './types';

const GRADE_POINTS: Record<string, number> = {
  'O': 10,
  'A+': 9,
  'A': 8,
  'B+': 7,
  'B': 6,
  'C': 5,
  'P': 4,
  'F': 0,
  'G': 0,
  'E': 0,
  'I': 0,
};

export function getGradePoint(grade: string): number {
  return GRADE_POINTS[grade.toUpperCase()] ?? 0;
}

export function calculateAverageGradePoint(courses: Course[]): number {
  if (courses.length === 0) return 0;

  const withCredits = courses.filter(c => c.credits !== undefined && c.credits > 0);

  if (withCredits.length > 0) {
    const totalWeighted = withCredits.reduce(
      (sum, c) => sum + getGradePoint(c.grade) * c.credits!,
      0
    );
    const totalCredits = withCredits.reduce((sum, c) => sum + c.credits!, 0);
    return Math.round((totalWeighted / totalCredits) * 100) / 100;
  }

  const total = courses.reduce((sum, c) => sum + getGradePoint(c.grade), 0);
  return Math.round((total / courses.length) * 100) / 100;
}
