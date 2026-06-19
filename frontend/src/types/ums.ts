// Shared UMS (University Management System) domain types

export interface UMSValidationResult {
	valid: boolean;
	message: string;
}

export interface UMSSubject {
	id: string;
	subjectName: string;
	grade: number;
	credit: number;
}

export interface UMSSemester {
	id: string;
	name: string;
	subjects: UMSSubject[];
}

export interface StudentInfo {
	vid: string;
	name: string;
	program: string;
	batchYear: string;
	cgpa: string;
}

export interface UMSCourse {
	courseName?: string;
	courseCode?: string;
	grade: string;
	credits?: number;
}

export interface UMSTerm {
	id?: string;
	displayName?: string;
	courses?: UMSCourse[];
}

export interface UMSTermIds {
	terms?: Record<string, unknown>;
	totalTerms?: number;
	categories?: {
		regular?: number;
		reappear?: number;
		backlog?: number;
	};
}

export interface UMSData {
	studentInfo?: {
		vid?: string;
		name?: string;
		program?: string;
		batchYear?: string;
		cgpa?: string;
	};
	terms?: UMSTerm[];
	summary?: Record<string, unknown>;
	allTermIds?: UMSTermIds;
}

export interface UMSProfileData {
	studentInfo: StudentInfo;
	semesters: UMSSemester[];
	allTermIds: UMSTermIds;
	summary: unknown;
	fetchedAt: string;
}
