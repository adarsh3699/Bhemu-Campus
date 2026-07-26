import {
	doc,
	getDoc,
	setDoc,
	deleteField,
	serverTimestamp,
	onSnapshot,
	type Firestore,
	type Unsubscribe,
} from "firebase/firestore";
import type { AttendanceData, AttendanceSubject } from "@bhemu/shared";

export class AttendanceService {
	private db: Firestore;
	private userId: string;

	constructor(db: Firestore, userId: string) {
		this.db = db;
		this.userId = userId;
	}

	// For shared profiles, attendance lives under the owner's userId, not the viewer's.
	private mainDocRef(profileId: string | number, ownerUserId?: string) {
		const uid = ownerUserId ?? this.userId;
		return doc(this.db, "users", uid, "profiles", profileId.toString(), "attendanceData", "main");
	}

	async getAttendanceData(profileId: string | number, ownerUserId?: string): Promise<AttendanceData | null> {
		try {
			const snap = await getDoc(this.mainDocRef(profileId, ownerUserId));
			if (!snap.exists()) return null;
			return snap.data() as AttendanceData;
		} catch (error) {
			console.error("Error getting attendance data:", error);
			return null;
		}
	}

	async saveSubject(profileId: string | number, subject: AttendanceSubject, ownerUserId?: string): Promise<void> {
		try {
			await setDoc(
				this.mainDocRef(profileId, ownerUserId),
				{ subjects: { [subject.id]: subject }, updatedAt: serverTimestamp() },
				{ merge: true }
			);
		} catch (error) {
			console.error("Error saving attendance subject:", error);
			throw error;
		}
	}

	async deleteSubject(profileId: string | number, subjectId: string, ownerUserId?: string): Promise<void> {
		try {
			await setDoc(
				this.mainDocRef(profileId, ownerUserId),
				{ subjects: { [subjectId]: deleteField() }, updatedAt: serverTimestamp() },
				{ merge: true }
			);
		} catch (error) {
			console.error("Error deleting attendance subject:", error);
			throw error;
		}
	}

	async updateDefaultThreshold(profileId: string | number, threshold: number, ownerUserId?: string): Promise<void> {
		try {
			await setDoc(
				this.mainDocRef(profileId, ownerUserId),
				{ defaultThreshold: threshold, updatedAt: serverTimestamp() },
				{ merge: true }
			);
		} catch (error) {
			console.error("Error updating threshold:", error);
			throw error;
		}
	}

	onAttendanceChange(
		profileId: string | number,
		callback: (data: AttendanceData | null) => void,
		ownerUserId?: string
	): Unsubscribe {
		return onSnapshot(
			this.mainDocRef(profileId, ownerUserId),
			(snap) => callback(snap.exists() ? (snap.data() as AttendanceData) : null),
			(error) => {
				console.error("Attendance listener error:", error);
				callback(null);
			}
		);
	}
}

export function createAttendanceService(db: Firestore, userId: string): AttendanceService {
	return new AttendanceService(db, userId);
}
