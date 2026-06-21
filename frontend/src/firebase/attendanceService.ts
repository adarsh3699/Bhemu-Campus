import {
	doc,
	getDoc,
	setDoc,
	deleteField,
	serverTimestamp,
	onSnapshot,
	Unsubscribe,
} from "firebase/firestore";
import { db } from "./config";
import type { AttendanceData, AttendanceSubject } from "@/types/attendance";

export class AttendanceService {
	private userId: string;

	constructor(userId: string) {
		this.userId = userId;
	}

	private mainDocRef(profileId: string | number) {
		return doc(db, "users", this.userId, "profiles", profileId.toString(), "attendanceData", "main");
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
				{
					subjects: { [subject.id]: subject },
					updatedAt: serverTimestamp(),
				},
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
				{
					subjects: { [subjectId]: deleteField() },
					updatedAt: serverTimestamp(),
				},
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
			(snap) => {
				if (!snap.exists()) {
					callback(null);
				} else {
					callback(snap.data() as AttendanceData);
				}
			},
			(error) => {
				console.error("Attendance listener error:", error);
				callback(null);
			}
		);
	}
}

export function createAttendanceService(userId: string): AttendanceService {
	return new AttendanceService(userId);
}
