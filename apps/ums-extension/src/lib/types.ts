export interface Course {
  courseCode: string;
  courseName: string;
  grade: string;
  credits?: number;
  termId?: string;
}

export interface Term {
  id: string;
  displayName: string;
  category: 'Regular' | 'Reappear' | 'RPL' | 'Unknown';
  isActive: boolean;
  tgpa?: number | null;
  courses: Course[];
}

export interface ExamMark {
  courseCode: string;
  courseName: string;
  examType: string;
  examDate?: string;
  questionNumber?: string;
  maxMarks: number;
  obtainedMarks: number;
  termId?: string;
}

export interface CourseAssessment {
  courseCode: string;
  courseName: string;
  assessmentType: string;
  maximumMarks: number | string;
  marksObtained: number | string;
  weightedMaximumMarks: number | string;
  weightedMarksObtained: number | string;
  isAwaited: boolean;
  termId?: string;
}

export interface AttendanceRecord {
  courseCode: string;
  courseName: string;
  totalLectures: number;
  attendedLectures: number;
  percentage: number;
  termId?: string;
}

export interface TimetableEntry {
  dayOfWeek: string;
  timeSlot: string;
  courseCode: string;
  courseName: string;
  room: string;
  faculty: string;
  startTime: string;
  endTime: string;
}

export interface StudentInfo {
  vid: string | null;
  name: string | null;
  program: string | null;
  batchYear: string | null;
  cgpa: string | null;
}

// --- UMS JSON API response types ---

export interface UMSStudentBasicInfo {
  StudentName: string;
  Registrationnumber: string;
  StudentUid: string;
  Program: string;
  BatchYear: string | null;
  Section: string;
  CGPA: string;
  RollNumber: string;
  AggAttendance: string;
  PendingFee: string;
  DateofBirth: string;
  Gender: string | null;
  FatherName: string | null;
  [key: string]: unknown;
}

// Parsed from Bootstrap HTML (GetStudentCourses returns HTML, not JSON)
export interface UMSStudentCourse {
  CourseCode: string;
  CourseName: string;
  Term: string;
  RollNo: string;
  ExamPattern: string;
  AttendancePct: number;
}

// Actual JSON response fields (lowercase)
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

// Parsed from Bootstrap HTML (GetSeatingPlan returns HTML, not JSON)
export interface UMSSeatingPlan {
  CourseCode: string;
  CourseName: string;
  ExamDate: string;
  ExamType: string;
  Room: string;
  Status: string;
}

// Parsed from Bootstrap HTML (GetStudentMessages returns HTML, not JSON)
export interface UMSMessage {
  Subject: string;
  SenderName: string;
  Date: string;
  Body: string;
  BodyHtml: string;
}

// Parsed from HTML <tr> rows (StudentAttendanceSummary returns HTML, not JSON)
export interface UMSAttendanceSummary {
  CourseCode: string;
  CourseName: string;
  ExamDate: string;
  Slot: number;
  TotalDuty: number;
  Present: number;
  Percentage: number;
}

export interface UMSApiData {
  studentInfo?: UMSStudentBasicInfo;
  courses?: UMSStudentCourse[];
  announcements?: UMSAnnouncement[];
  announcementCategories?: UMSAnnouncementCategory[];
  seatingPlan?: UMSSeatingPlan[];
  messages?: UMSMessage[];
  headsHtml?: string;
  attendance?: UMSAttendanceSummary[];
  // Raw HTML snippets stored for parser verification in dev mode
  _rawHtml?: Record<string, string>;
}

export interface SyncResult {
  studentInfo?: StudentInfo;
  courses: Course[];
  examMarks: ExamMark[];
  courseAssessments: CourseAssessment[];
  attendance: AttendanceRecord[];
  timetable: TimetableEntry[];
  terms: Term[];
  // from JSON APIs
  apiData?: UMSApiData;
}

export interface SyncStatus {
  lastSyncedAt: string | null;
  status: 'idle' | 'syncing' | 'success' | 'error' | 'needs_login';
  message?: string;
}
