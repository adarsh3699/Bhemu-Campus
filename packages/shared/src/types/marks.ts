export interface CustomCutoff {
	gradePoint: number;
	cutoffMarks: number;
}

export interface SubjectMarks {
	ca: number | null;
	midTerm: number | null;
	endTerm: number | null;
	attendanceMarks: number | null;
	total: number | null;
	source: "ums" | "manual" | "partial";
	umsGradePoint: number | null;
	customCutoff: CustomCutoff | null;
}

export interface GradeTableEntry {
	minMarks: number;
	maxMarks: number;
	grade: string;
	gradePoint: number;
}

export interface GradeEntry {
	grade: string;
	gradePoint: number;
	performance: string;
}
