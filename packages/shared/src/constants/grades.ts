import type { GradeEntry } from "../types/marks";

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

export const SELECTABLE_GRADES = GRADE_TABLE.filter((e) => e.grade !== "I");

export const GRADE_TO_POINT: Record<string, number> = Object.fromEntries(
	GRADE_TABLE.map((e) => [e.grade, e.gradePoint])
);

export const POINT_TO_GRADE: Record<number, string> = {};
for (const entry of GRADE_TABLE) {
	if (!(entry.gradePoint in POINT_TO_GRADE)) {
		POINT_TO_GRADE[entry.gradePoint] = entry.grade;
	}
}
