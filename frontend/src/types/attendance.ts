// Attendance domain types

export interface AttendanceSubject {
	id: string;
	name: string;
	totalClasses: number;
	attended: number;
	threshold: number;
}

export interface AttendanceData {
	subjects: Record<string, AttendanceSubject>;
	defaultThreshold: number;
	updatedAt?: unknown;
}
