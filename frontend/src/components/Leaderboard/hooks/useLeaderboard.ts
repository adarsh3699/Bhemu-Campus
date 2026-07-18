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
	const { currentProfile } = useGpaData();

	const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const studentInfo = currentProfile?.studentInfo as StudentInfo | undefined;

	// Only primitive values — prevents new object references from triggering the effect
	const uid = currentUser?.uid ?? null;
	const profileId = currentProfile ? String(currentProfile.id) : null;
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

	const runningRef = useRef(false);

	useEffect(() => {
		if (!uid || !profileId || !isEligible || !groupKey || !cgpa || !parsedProgram || !batchYear) {
			return;
		}
		if (runningRef.current) return;

		let cancelled = false;
		runningRef.current = true;

		async function fetchLeaderboard() {
			setLoading(true);
			setError(null);

			try {
				const userCgpa = parseFloat(cgpa!);

				const [userEntry, topEntries, userRank, totalStudents] = await Promise.all([
					LeaderboardService.getUserEntry(uid!, profileId!),
					LeaderboardService.getTopStudents(groupKey!, 10),
					LeaderboardService.getUserRank(groupKey!, userCgpa),
					LeaderboardService.getTotalCount(groupKey!),
				]);
				if (cancelled) return;


				let nearbyEntries: LeaderboardEntry[] = [];
				const isInTop10 = topEntries.some((e) => e.userId === uid);
				if (!isInTop10 && userRank > 10) {
					nearbyEntries = await LeaderboardService.getNearbyAbove(groupKey!, userCgpa, 2);
					if (cancelled) return;
				}

				setLeaderboardData({ topEntries, userEntry, userRank, nearbyEntries, totalStudents });
			} catch (err) {
				console.error("[Leaderboard]", err);
				if (!cancelled) {
					setError(err instanceof Error ? err.message : "Failed to load leaderboard");
				}
			} finally {
				if (!cancelled) {
					setLoading(false);
					runningRef.current = false;
				}
			}
		}

		fetchLeaderboard();
		return () => {
			cancelled = true;
			runningRef.current = false;
		};
		// Only primitive stable values in deps — no objects
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [uid, profileId, isEligible, groupKey, cgpa, batchYear, vid]);

	return { leaderboardData, loading, error, isEligible, parsedProgram, groupKey };
}
