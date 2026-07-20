import {
	collection,
	doc,
	getDoc,
	query,
	where,
	orderBy,
	limit,
	getDocs,
	getCountFromServer,
	setDoc,
	serverTimestamp,
	type Firestore,
} from "firebase/firestore";
import type { LeaderboardEntry } from "@bhemu/shared";

const LEADERBOARD_COL = "leaderboard";

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
	static async getTopStudents(db: Firestore, groupKey: string, count: number = 10): Promise<LeaderboardEntry[]> {
		const q = query(
			collection(db, LEADERBOARD_COL),
			where("groupKey", "==", groupKey),
			where("optOut", "==", false),
			orderBy("cgpa", "desc"),
			limit(count)
		);
		const snap = await getDocs(q);
		return snap.docs.map(docFromSnapshot);
	}

	static async getUserRank(db: Firestore, groupKey: string, userCgpa: number): Promise<number> {
		const q = query(
			collection(db, LEADERBOARD_COL),
			where("groupKey", "==", groupKey),
			where("optOut", "==", false),
			where("cgpa", ">", userCgpa)
		);
		const snap = await getCountFromServer(q);
		return snap.data().count + 1;
	}

	static async getNearbyAbove(db: Firestore, groupKey: string, userCgpa: number, count: number = 2): Promise<LeaderboardEntry[]> {
		const q = query(
			collection(db, LEADERBOARD_COL),
			where("groupKey", "==", groupKey),
			where("optOut", "==", false),
			where("cgpa", ">", userCgpa),
			orderBy("cgpa", "asc"),
			limit(count)
		);
		const snap = await getDocs(q);
		return snap.docs.map(docFromSnapshot).reverse();
	}

	static async getTotalCount(db: Firestore, groupKey: string): Promise<number> {
		const q = query(
			collection(db, LEADERBOARD_COL),
			where("groupKey", "==", groupKey),
			where("optOut", "==", false)
		);
		const snap = await getCountFromServer(q);
		return snap.data().count;
	}

	static async getUserEntry(db: Firestore, userId: string, profileId: string): Promise<LeaderboardEntry | null> {
		const ref = doc(db, LEADERBOARD_COL, `${userId}_${profileId}`);
		const snap = await getDoc(ref);
		return snap.exists() ? docFromSnapshot(snap) : null;
	}

	static async upsertEntry(db: Firestore, entry: Omit<LeaderboardEntry, "updatedAt">): Promise<void> {
		const ref = doc(db, LEADERBOARD_COL, `${entry.userId}_${entry.profileId}`);
		await setDoc(ref, { ...entry, updatedAt: serverTimestamp() }, { merge: true });
	}

	static async setOptOut(db: Firestore, userId: string, profileId: string, optOut: boolean): Promise<void> {
		const ref = doc(db, LEADERBOARD_COL, `${userId}_${profileId}`);
		await setDoc(ref, { optOut, updatedAt: serverTimestamp() }, { merge: true });
	}
}
