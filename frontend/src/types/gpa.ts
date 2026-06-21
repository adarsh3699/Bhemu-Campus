import type { SubjectMarks } from "./marks";

export interface GPASubject {
	id: string | number;
	subjectName: string;
	subjectCode?: string;
	credit: number;
	grade: number;        // numeric grade point (0-10); computed from marks or set directly
	marks?: SubjectMarks; // optional — only present when marks have been entered
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
	userId?: string;
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
	sharedAt?: unknown;
	shareId?: string;
	permission?: "read" | "edit" | "owner";
	collaborators?: string[];
	permissions?: Record<string, "read" | "edit" | "owner">;
	lastModified?: unknown;
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
