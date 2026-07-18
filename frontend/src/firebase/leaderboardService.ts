import {
	collection,
	doc,
	query,
	where,
	orderBy,
	limit,
	getDocs,
	getCountFromServer,
	setDoc,
	serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";
import type { LeaderboardEntry } from "@/types";

const LEADERBOARD_COL = "leaderboard";

function leaderboardRef() {
	return collection(db, LEADERBOARD_COL);
}

function docFromSnapshot(snapshot: { id: string; data: () => Record<string, unknown> }): LeaderboardEntry {
	const data = snapshot.data();
	return {
		userId: data.userId as string,
		profileId: data.profileId as string,
		name: data.name as string,
		vid: data.vid as string,
		programCode: data.programCode as string,
		programName: data.programName as string,
		branch: (data.branch as string) ?? null,
		batchYear: data.batchYear as string,
		cgpa: data.cgpa as number,
		groupKey: data.groupKey as string,
		optOut: data.optOut as boolean | undefined,
		updatedAt: data.updatedAt,
	};
}

export class LeaderboardService {
	static async getTopStudents(groupKey: string, count: number = 10): Promise<LeaderboardEntry[]> {
		const q = query(
			leaderboardRef(),
			where("groupKey", "==", groupKey),
			where("optOut", "==", false),
			orderBy("cgpa", "desc"),
			limit(count)
		);
		const snap = await getDocs(q);
		return snap.docs.map(docFromSnapshot);
	}

	static async getUserRank(groupKey: string, userCgpa: number): Promise<number> {
		const q = query(
			leaderboardRef(),
			where("groupKey", "==", groupKey),
			where("optOut", "==", false),
			where("cgpa", ">", userCgpa)
		);
		const snap = await getCountFromServer(q);
		return snap.data().count + 1;
	}

	static async getNearbyAbove(groupKey: string, userCgpa: number, count: number = 2): Promise<LeaderboardEntry[]> {
		const q = query(
			leaderboardRef(),
			where("groupKey", "==", groupKey),
			where("optOut", "==", false),
			where("cgpa", ">", userCgpa),
			orderBy("cgpa", "asc"),
			limit(count)
		);
		const snap = await getDocs(q);
		return snap.docs.map(docFromSnapshot).reverse();
	}

	static async getTotalCount(groupKey: string): Promise<number> {
		const q = query(
			leaderboardRef(),
			where("groupKey", "==", groupKey),
			where("optOut", "==", false)
		);
		const snap = await getCountFromServer(q);
		return snap.data().count;
	}

	static async getUserEntry(userId: string, profileId: string): Promise<LeaderboardEntry | null> {
		const docId = `${userId}_${profileId}`;
		const q = query(leaderboardRef(), where("userId", "==", userId));
		const snap = await getDocs(q);
		const match = snap.docs.find((d) => d.id === docId);
		return match ? docFromSnapshot(match) : null;
	}

	static async upsertEntry(entry: Omit<LeaderboardEntry, "updatedAt">): Promise<void> {
		const docId = `${entry.userId}_${entry.profileId}`;
		const ref = doc(db, LEADERBOARD_COL, docId);
		await setDoc(ref, { ...entry, updatedAt: serverTimestamp() }, { merge: true });
	}

	static async setOptOut(userId: string, profileId: string, optOut: boolean): Promise<void> {
		const docId = `${userId}_${profileId}`;
		const ref = doc(db, LEADERBOARD_COL, docId);
		await setDoc(ref, { optOut, updatedAt: serverTimestamp() }, { merge: true });
	}
}
