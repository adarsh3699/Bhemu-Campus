import type { LeaderboardEntry } from "../types/leaderboard";

export function getPercentile(rank: number, total: number): number {
	if (total <= 1) return 100;
	return Math.round(((total - rank) / (total - 1)) * 100);
}

export function getAchievementLabel(rank: number, total: number): string {
	if (rank === 1) return "Batch Topper!";
	if (rank <= 3) return "Top 3";
	if (rank <= 10) return "Top 10";
	const percentile = getPercentile(rank, total);
	return `Top ${100 - percentile}%`;
}

export function getRankTier(rank: number): "gold" | "silver" | "bronze" | "default" {
	if (rank === 1) return "gold";
	if (rank === 2) return "silver";
	if (rank === 3) return "bronze";
	return "default";
}

/**
 * Keeps nearby rows from repeating students already visible in the top list.
 * Nearby entries are ordered from the farthest matching rank to the closest.
 */
export function selectNearbyLeaderboardEntries(
	nearbyEntries: LeaderboardEntry[],
	visibleEntries: LeaderboardEntry[],
	limit: number = 2,
): LeaderboardEntry[] {
	const visibleKeys = new Set(visibleEntries.map(getLeaderboardEntryKey));
	const seenKeys = new Set<string>();

	return nearbyEntries
		.filter((entry) => {
			const key = getLeaderboardEntryKey(entry);
			if (visibleKeys.has(key) || seenKeys.has(key)) return false;
			seenKeys.add(key);
			return true;
		})
		.slice(-limit);
}

function getLeaderboardEntryKey(entry: LeaderboardEntry): string {
	return entry.vid || `${entry.userId}_${entry.profileId}`;
}
