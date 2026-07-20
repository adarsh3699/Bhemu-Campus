// Marks domain types

export interface CustomCutoff {
	gradePoint: number;  // the grade point awarded (0-10)
	cutoffMarks: number; // total marks at which this grade was awarded
}

export interface SubjectMarks {
	ca: number | null;
	midTerm: number | null;
	endTerm: number | null;
	attendanceMarks: number | null;
	total: number | null;          // computed: ca + midTerm + endTerm + attendanceMarks
	source: "ums" | "manual" | "partial";
	umsGradePoint: number | null;  // grade point fetched from UMS (0-10) — null = not from UMS
	customCutoff: CustomCutoff | null;
}

export interface GradeTableEntry {
	minMarks: number;
	maxMarks: number;
	grade: string;
	gradePoint: number;
}
