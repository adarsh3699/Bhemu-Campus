import type { GradeTableEntry, CustomCutoff } from "@/types/marks";

export { GRADE_TO_POINT as GRADE_LABEL_MAP, POINT_TO_GRADE as GRADE_POINT_TO_LABEL_MAP } from "@/lib/grades";

export const STANDARD_GRADE_TABLE: GradeTableEntry[] = [
	{ minMarks: 90, maxMarks: 100, grade: "O",  gradePoint: 10 },
	{ minMarks: 80, maxMarks: 89,  grade: "A+", gradePoint: 9 },
	{ minMarks: 70, maxMarks: 79,  grade: "A",  gradePoint: 8 },
	{ minMarks: 60, maxMarks: 69,  grade: "B+", gradePoint: 7 },
	{ minMarks: 50, maxMarks: 59,  grade: "B",  gradePoint: 6 },
	{ minMarks: 45, maxMarks: 49,  grade: "C",  gradePoint: 5 },
	{ minMarks: 40, maxMarks: 44,  grade: "D",  gradePoint: 4 },
	{ minMarks: 0,  maxMarks: 39,  grade: "F",  gradePoint: 0 },
];

export function lookupStandardGrade(totalMarks: number): GradeTableEntry {
	const clamped = Math.max(0, Math.min(100, totalMarks));
	return (
		STANDARD_GRADE_TABLE.find(
			(entry) => clamped >= entry.minMarks && clamped <= entry.maxMarks
		) ?? STANDARD_GRADE_TABLE[STANDARD_GRADE_TABLE.length - 1]
	);
}

export function computeGradeFromMarks(
	totalMarks: number,
	customCutoff?: CustomCutoff | null
): number {
	if (customCutoff && totalMarks >= customCutoff.cutoffMarks) {
		return customCutoff.gradePoint;
	}
	return lookupStandardGrade(totalMarks).gradePoint;
}

export function shouldCreateCutoff(totalMarks: number, umsGradePoint: number): boolean {
	if (umsGradePoint === 0) return false;
	return lookupStandardGrade(totalMarks).gradePoint !== umsGradePoint;
}

export function createCutoff(totalMarks: number, umsGradePoint: number): CustomCutoff {
	return { gradePoint: umsGradePoint, cutoffMarks: totalMarks };
}

export function computeTotal(
	ca: number | null,
	midTerm: number | null,
	endTerm: number | null,
	attendanceMarks: number | null
): number | null {
	if (ca === null && midTerm === null && endTerm === null && attendanceMarks === null) return null;
	const clamp = (v: number | null) => (v !== null ? Math.max(0, v) : 0);
	return clamp(ca) + clamp(midTerm) + clamp(endTerm) + clamp(attendanceMarks);
}
