import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useGpaData } from "@/contexts/GpaDataContext";
import { LeaderboardService } from "@/firebase/services";
import { db } from "@/firebase/config";
import type { LeaderboardData, LeaderboardEntry } from "@bhemu/shared";

export function useLeaderboard() {
	const { currentUser } = useAuth();
	const { currentProfile, loading: profileLoading } = useGpaData();

	const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [userOptedOut, setUserOptedOut] = useState(false);
	const [needsResync, setNeedsResync] = useState(false);
	const fetchIdRef = useRef(0);

	const uid = currentUser?.uid ?? null;
	const profileId = currentProfile ? String(currentProfile.id) : null;
	const entryUserId = currentProfile?.ownerUserId ?? uid;

	const studentInfo = currentProfile?.studentInfo as
		{ program?: string | null; cgpa?: string | null } | undefined;
	const umsVerified = !!currentProfile?.umsVerified;
	const isEligible = !!(umsVerified && studentInfo?.program && studentInfo?.cgpa);

	const doFetch = useCallback(async (fetchId: number) => {
		setLoading(true);
		setError(null);
		setUserOptedOut(false);
		setNeedsResync(false);

		try {
			const userEntry = await LeaderboardService.getUserEntry(db, entryUserId!, profileId!);
			if (fetchId !== fetchIdRef.current) return;

			if (!userEntry) {
				setNeedsResync(true);
				setLeaderboardData(null);
				return;
			}

			if (userEntry.optOut) {
				setUserOptedOut(true);
				setLeaderboardData(null);
				return;
			}

			const { groupKey, cgpa } = userEntry;

			const [rawTopEntries, userRank, totalStudents] = await Promise.all([
				LeaderboardService.getTopStudents(db, groupKey, 20),
				LeaderboardService.getUserRank(db, groupKey, cgpa),
				LeaderboardService.getTotalCount(db, groupKey),
			]);
			if (fetchId !== fetchIdRef.current) return;

			const topEntries = LeaderboardService.deduplicateByVid(rawTopEntries, entryUserId!, profileId!).slice(0, 10);

			let nearbyEntries: LeaderboardEntry[] = [];
			const isInTop10 = topEntries.some(
				(e) => e.userId === entryUserId && e.profileId === profileId
			);
			if (!isInTop10 && userRank > 10) {
				const rawNearby = await LeaderboardService.getNearbyAbove(db, groupKey, cgpa, 5);
				if (fetchId !== fetchIdRef.current) return;
				nearbyEntries = LeaderboardService.deduplicateByVid(rawNearby, entryUserId!, profileId!).slice(-2);
			}

			setLeaderboardData({ topEntries, userEntry, userRank, nearbyEntries, totalStudents });
		} catch (err) {
			if (fetchId === fetchIdRef.current) {
				setError(err instanceof Error ? err.message : "Failed to load leaderboard");
			}
		} finally {
			if (fetchId === fetchIdRef.current) {
				setLoading(false);
			}
		}
	}, [entryUserId, profileId]);

	useEffect(() => {
		if (profileLoading) return;
		if (!uid || !profileId || !isEligible) return;
		doFetch(++fetchIdRef.current);
	}, [uid, profileId, entryUserId, isEligible, profileLoading, doFetch]);

	const refetch = useCallback(() => {
		if (!uid || !profileId || !isEligible) return;
		doFetch(++fetchIdRef.current);
	}, [uid, profileId, isEligible, doFetch]);

	return { leaderboardData, loading, error, isEligible, entryUserId, profileLoading, userOptedOut, needsResync, refetch };
}
