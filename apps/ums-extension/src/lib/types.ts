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

import type {
  TimetableEntry as _TimetableEntry,
  UMSAnnouncement as _UMSAnnouncement,
  UMSAnnouncementCategory as _UMSAnnouncementCategory,
  UMSSeatingPlan as _UMSSeatingPlan,
  UMSMessage as _UMSMessage,
} from '@bhemu/shared';

export type { TimetableEntry, UMSAnnouncement, UMSAnnouncementCategory, UMSSeatingPlan, UMSMessage } from '@bhemu/shared';

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
  announcements?: _UMSAnnouncement[];
  announcementCategories?: _UMSAnnouncementCategory[];
  seatingPlan?: _UMSSeatingPlan[];
  messages?: _UMSMessage[];
  headsHtml?: string;
  attendance?: UMSAttendanceSummary[];
  _rawHtml?: Record<string, string>;
}

export interface SyncResult {
  studentInfo?: StudentInfo;
  courses: Course[];
  examMarks: ExamMark[];
  courseAssessments: CourseAssessment[];
  attendance: AttendanceRecord[];
  timetable: _TimetableEntry[];
  terms: Term[];
  // from JSON APIs
  apiData?: UMSApiData;
}

export interface SyncStatus {
  lastSyncedAt: string | null;
  status: 'idle' | 'syncing' | 'success' | 'error' | 'needs_login';
  message?: string;
}
