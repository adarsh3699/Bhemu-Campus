// Single source of truth for the LPU grade table.
// Pure functions — no React, importable anywhere.

export interface GradeEntry {
	grade: string;
	gradePoint: number;
	performance: string;
}

export const GRADE_TABLE: GradeEntry[] = [
	{ grade: "O",  gradePoint: 10, performance: "Outstanding" },
	{ grade: "A+", gradePoint: 9,  performance: "Excellent" },
	{ grade: "A",  gradePoint: 8,  performance: "Very Good" },
	{ grade: "B+", gradePoint: 7,  performance: "Good" },
	{ grade: "B",  gradePoint: 6,  performance: "Above Average" },
	{ grade: "C",  gradePoint: 5,  performance: "Average" },
	{ grade: "D",  gradePoint: 4,  performance: "Pass" },
	{ grade: "E",  gradePoint: 0,  performance: "Reappear" },
	{ grade: "F",  gradePoint: 0,  performance: "Fail" },
	{ grade: "G",  gradePoint: 0,  performance: "Backlog" },
	{ grade: "I",  gradePoint: 0,  performance: "Incomplete" },
];

// Subset shown in the GPA Calculator subject form (excludes Incomplete)
export const SELECTABLE_GRADES = GRADE_TABLE.filter((e) => e.grade !== "I");

// grade symbol → grade point  e.g. "O" → 10
export const GRADE_TO_POINT: Record<string, number> = Object.fromEntries(
	GRADE_TABLE.map((e) => [e.grade, e.gradePoint])
);

// grade point → grade symbol  e.g. 10 → "O"  (first match wins)
export const POINT_TO_GRADE: Record<number, string> = {};
for (const entry of GRADE_TABLE) {
	if (!(entry.gradePoint in POINT_TO_GRADE)) {
		POINT_TO_GRADE[entry.gradePoint] = entry.grade;
	}
}

export function gradeToPoint(grade: string): number {
	return GRADE_TO_POINT[grade.toUpperCase()] ?? 0;
}

export function pointToGrade(gradePoint: number): string {
	return POINT_TO_GRADE[Math.round(gradePoint)] ?? "F";
}
