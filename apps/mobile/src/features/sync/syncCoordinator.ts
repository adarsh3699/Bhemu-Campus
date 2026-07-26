import type { Firestore } from "firebase/firestore";
import { syncGradesAndMarks, syncAttendanceOnly } from "@bhemu/firebase";
import type { UMSSyncResult } from "@bhemu/firebase";

// Called after the WebView has fetched all UMS data and sent it via postMessage.
// No cookie handling needed here — fetching happened inside the WebView.
export async function writeToFirestore(
	data: UMSSyncResult,
	profileId: string | number,
	db: Firestore,
	uid: string
): Promise<void> {
	await Promise.all([
		syncGradesAndMarks(db, uid, data, String(profileId)),
		syncAttendanceOnly(db, uid, { attendance: data.attendance }, String(profileId)),
	]);
}
