import type { SubjectMarks } from "./marks";

export interface GPASubject {
	id: string | number;
	subjectName: string;
	subjectCode?: string;
	credit: number;
	grade: number;
	marks?: SubjectMarks;
}

export interface GPASemester {
	id: string | number;
	name: string;
	subjects: GPASubject[];
	sgpa?: number;
}

export interface GPAProfile {
	id: string | number;
	name: string;
	semesters?: GPASemester[];
	isDefault?: boolean;
	createdAt?: unknown;
	updatedAt?: unknown;
	studentInfo?: unknown;
	allTermIds?: unknown;
	umsVerified?: boolean;
	lastUMSSync?: unknown;
	copiedFrom?: {
		shareId: string;
		originalUserId: string;
		originalProfileId?: string | number;
		copiedAt: unknown;
	};
	isShared?: boolean;
	ownerUserId?: string;
	permission?: "read" | "edit";
	lastOpened?: unknown;
}

export interface ShareData {
	shareId: string;
	profileId: string | number;
	profileName: string;
	ownerUserId: string;
	targetUserId: string;
	targetUserEmail: string;
	permission: "read" | "edit";
	sharedAt: unknown;
	isActive: boolean;
	updatedAt?: unknown;
}
