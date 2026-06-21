export const UMS_BASE_URL = "https://ums.lpu.in";
export const UMS_DASHBOARD_URL = `${UMS_BASE_URL}/lpuums/StudentDashboard.aspx`;
export const UMS_RESULTS_URL = `${UMS_BASE_URL}/lpuums/frmStudentResult.aspx`;
export const UMS_ATTENDANCE_API_URL = `${UMS_BASE_URL}/lpuums/StudentDashboard.aspx/StudentAttendanceSummary`;
export const UMS_TIMETABLE_URL = `${UMS_BASE_URL}/lpuums/Reports/frmStudentTimeTable.aspx`;

export const UMS_COOKIE_NAME = "_ga_B0Z6G6GCD8";

// Bhemu Calculator web app URL — read from env, falls back to production
export const CALC_URL = process.env.PLASMO_PUBLIC_CALC_URL ?? "https://calc.bhemu.in";

// Firefox config — same project as the frontend web app
// Set these in .env as PLASMO_PUBLIC_FIREBASE_*
export const FIREBASE_CONFIG = {
	apiKey: process.env.PLASMO_PUBLIC_FIREBASE_API_KEY ?? "",
	authDomain: process.env.PLASMO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
	projectId: process.env.PLASMO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
	storageBucket: process.env.PLASMO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
	messagingSenderId: process.env.PLASMO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
	appId: process.env.PLASMO_PUBLIC_FIREBASE_APP_ID ?? "",
};
