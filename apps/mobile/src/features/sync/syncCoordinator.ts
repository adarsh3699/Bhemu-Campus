import type { Firestore } from "firebase/firestore";
import { syncGradesAndMarks, syncAttendanceOnly } from "@bhemu/firebase";
import type { UMSSyncResult } from "@bhemu/firebase";

/**
 * UMS can return a rendered challenge/error page with HTTP 200. Keep this
 * guard at the persistence boundary so a bad WebView response can never
 * replace existing academic data with empty arrays.
 */
export function isUsableUMSSyncResult(value: unknown): value is UMSSyncResult {
	if (!value || typeof value !== "object") return false;

	const data = value as Partial<UMSSyncResult>;
	if (
		!Array.isArray(data.courses) ||
		!Array.isArray(data.courseAssessments) ||
		!Array.isArray(data.attendance) ||
		!Array.isArray(data.terms)
	) {
		return false;
	}

	const studentInfo = data.studentInfo;
	const hasStudentIdentity =
		!!studentInfo &&
		[studentInfo.vid, studentInfo.name, studentInfo.program].some(
			(entry) => typeof entry === "string" && entry.trim().length > 0
		);
	const hasAcademicRecords =
		data.courses.length > 0 ||
		data.courseAssessments.length > 0 ||
		data.attendance.length > 0 ||
		data.terms.length > 0;

	return hasStudentIdentity && hasAcademicRecords;
}

// Called after the WebView has fetched all UMS data and sent it via postMessage.
// No cookie handling needed here — fetching happened inside the WebView.
export async function writeToFirestore(
	data: UMSSyncResult,
	profileId: string | number,
	db: Firestore,
	uid: string
): Promise<void> {
	if (!isUsableUMSSyncResult(data)) {
		throw new Error("UMS returned incomplete data. Existing data was kept.");
	}

	await Promise.all([
		syncGradesAndMarks(db, uid, data, String(profileId)),
		syncAttendanceOnly(db, uid, { attendance: data.attendance }, String(profileId)),
	]);
}
