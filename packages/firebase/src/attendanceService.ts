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

	private mainDocRef(profileId: string | number) {
		return doc(this.db, "users", this.userId, "profiles", profileId.toString(), "attendanceData", "main");
	}

	async getAttendanceData(profileId: string | number): Promise<AttendanceData | null> {
		try {
			const snap = await getDoc(this.mainDocRef(profileId));
			if (!snap.exists()) return null;
			return snap.data() as AttendanceData;
		} catch (error) {
			console.error("Error getting attendance data:", error);
			return null;
		}
	}

	async saveSubject(profileId: string | number, subject: AttendanceSubject): Promise<void> {
		try {
			await setDoc(
				this.mainDocRef(profileId),
				{ subjects: { [subject.id]: subject }, updatedAt: serverTimestamp() },
				{ merge: true }
			);
		} catch (error) {
			console.error("Error saving attendance subject:", error);
			throw error;
		}
	}

	async deleteSubject(profileId: string | number, subjectId: string): Promise<void> {
		try {
			await setDoc(
				this.mainDocRef(profileId),
				{ subjects: { [subjectId]: deleteField() }, updatedAt: serverTimestamp() },
				{ merge: true }
			);
		} catch (error) {
			console.error("Error deleting attendance subject:", error);
			throw error;
		}
	}

	async updateDefaultThreshold(profileId: string | number, threshold: number): Promise<void> {
		try {
			await setDoc(
				this.mainDocRef(profileId),
				{ defaultThreshold: threshold, updatedAt: serverTimestamp() },
				{ merge: true }
			);
		} catch (error) {
			console.error("Error updating threshold:", error);
			throw error;
		}
	}

	onAttendanceChange(profileId: string | number, callback: (data: AttendanceData | null) => void): Unsubscribe {
		return onSnapshot(
			this.mainDocRef(profileId),
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
