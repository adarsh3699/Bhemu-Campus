"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/firebase/AuthContext";
import { useGpaData } from "@/hooks/GpaDataContext";
import { LeaderboardService } from "@/firebase/leaderboardService";
import { parseProgram, buildGroupKey, deriveBatchYear } from "@/lib/programUtils";
import type { LeaderboardData, LeaderboardEntry, ParsedProgram } from "@/types";

interface StudentInfo {
	vid?: string | null;
	name?: string | null;
	program?: string | null;
	batchYear?: string | null;
	cgpa?: string | null;
}

export function useLeaderboard() {
	const { currentUser } = useAuth();
	const { currentProfile, loading: profileLoading } = useGpaData();

	const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const studentInfo = currentProfile?.studentInfo as StudentInfo | undefined;

	const uid = currentUser?.uid ?? null;
	const profileId = currentProfile ? String(currentProfile.id) : null;
	const entryUserId = currentProfile?.ownerUserId ?? uid;
	const umsVerified = !!currentProfile?.umsVerified;
	const program = studentInfo?.program ?? null;
	const cgpa = studentInfo?.cgpa ?? null;
	const vid = studentInfo?.vid ?? null;
	const rawBatchYear = studentInfo?.batchYear ?? null;

	const batchYear = deriveBatchYear(vid, rawBatchYear);
	const parsedProgram: ParsedProgram | null = program ? parseProgram(program) : null;
	const groupKey = (batchYear && parsedProgram?.programCode)
		? buildGroupKey(batchYear, parsedProgram.programCode)
		: null;
	const isEligible = !!(umsVerified && program && cgpa);

	const [userOptedOut, setUserOptedOut] = useState(false);
	const [needsResync, setNeedsResync] = useState(false);
	const fetchIdRef = useRef(0);

	useEffect(() => {
		// Don't fetch until profile is fully resolved (avoids wrong-profile flash)
		if (profileLoading) return;
		if (!uid || !profileId || !isEligible || !groupKey || !cgpa || !parsedProgram || !batchYear) {
			return;
		}

		const fetchId = ++fetchIdRef.current;

		async function fetchLeaderboard() {
			setLoading(true);
			setError(null);
			setUserOptedOut(false);
			setNeedsResync(false);

			try {
				const userEntry = await LeaderboardService.getUserEntry(entryUserId!, profileId!);
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

				const rankCgpa = userEntry?.cgpa ?? parseFloat(cgpa!);

				const [topEntries, userRank, totalStudents] = await Promise.all([
					LeaderboardService.getTopStudents(groupKey!, 10),
					LeaderboardService.getUserRank(groupKey!, rankCgpa),
					LeaderboardService.getTotalCount(groupKey!),
				]);
				if (fetchId !== fetchIdRef.current) return;

				let nearbyEntries: LeaderboardEntry[] = [];
				const isInTop10 = topEntries.some((e) => e.userId === entryUserId && e.profileId === profileId);
				if (!isInTop10 && userRank > 10) {
					nearbyEntries = await LeaderboardService.getNearbyAbove(groupKey!, rankCgpa, 2);
					if (fetchId !== fetchIdRef.current) return;
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
		}

		fetchLeaderboard();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [uid, profileId, entryUserId, isEligible, groupKey, cgpa, batchYear, vid, profileLoading]);

	return { leaderboardData, loading, error, isEligible, parsedProgram, groupKey, entryUserId, profileLoading, userOptedOut, needsResync };
}
