export interface UMSMessage {
	Subject: string;
	SenderName?: string;
	Date: string;
	Body: string;
	BodyHtml: string;
}

export interface UMSAnnouncement {
	subject: string;
	announcement: string;
	categorycode: string;
	time: string;
	date: string;
	announcementid: number;
	isread: boolean;
	uploadedby: string;
	employeename: string;
	status: string;
	HeaderDate: string;
	Files: Array<{ id: number; filepath: string; FileName: string }>;
	[key: string]: unknown;
}

export interface UMSAnnouncementCategory {
	code: string;
	name: string;
	displayorder: number;
	today: number;
	total: number;
	[key: string]: unknown;
}

export interface UMSSeatingPlan {
	CourseCode: string;
	CourseName: string;
	ExamDate: string;
	ExamType: string;
	Room: string;
	Status: string;
}

export interface TimetableEntry {
	dayOfWeek: string;
	timeSlot: string;
	startTime: string;
	endTime: string;
	courseCode: string;
	courseName: string;
	room: string;
	faculty: string;
}

export interface UMSLocalData {
	messages: UMSMessage[];
	announcements: UMSAnnouncement[];
	seatingPlan: UMSSeatingPlan[];
	timetable: TimetableEntry[];
	lastSyncedAt: string | null;
}
