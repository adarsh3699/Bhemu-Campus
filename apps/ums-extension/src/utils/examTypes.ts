export type ExamComponent = 'ca' | 'midTerm' | 'endTerm' | 'attendanceMarks';

export function mapExamType(examType: string): ExamComponent | null {
  const t = examType.toLowerCase();
  if (t.includes('attendance')) return 'attendanceMarks';
  if (t.includes('continuous')) return 'ca';
  if (t.includes('mid term')) return 'midTerm';
  if (t.includes('end term')) return 'endTerm';
  return null;
}
