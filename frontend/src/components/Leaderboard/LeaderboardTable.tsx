"use client";

import type { LeaderboardData } from "@/types";
import LeaderboardRow from "./LeaderboardRow";
import LeaderboardSeparator from "./LeaderboardSeparator";

interface LeaderboardTableProps {
	data: LeaderboardData;
	currentUserId: string;
	currentProfileId: string;
}

export default function LeaderboardTable({ data, currentUserId, currentProfileId }: LeaderboardTableProps) {
	const { topEntries, userEntry, userRank, nearbyEntries } = data;
	const isCurrentEntry = (e: { userId: string; profileId: string }) =>
		e.userId === currentUserId && e.profileId === currentProfileId;
	const isUserInTop10 = topEntries.some(isCurrentEntry);

	return (
		<div className="flex flex-col gap-2">
			{/* Top 10 */}
			{topEntries.map((entry, index) => (
				<LeaderboardRow
					key={`${entry.userId}_${entry.profileId}`}
					entry={entry}
					rank={index + 1}
					isCurrentUser={isCurrentEntry(entry)}
				/>
			))}

			{/* User's section (if not in top 10) */}
			{!isUserInTop10 && userEntry && userRank && (
				<>
					<LeaderboardSeparator />

					{nearbyEntries.map((entry, index) => (
						<LeaderboardRow
							key={`nearby_${entry.userId}_${entry.profileId}`}
							entry={entry}
							rank={userRank - (nearbyEntries.length - index)}
							isCurrentUser={isCurrentEntry(entry)}
						/>
					))}

					<LeaderboardRow
						entry={userEntry}
						rank={userRank}
						isCurrentUser={true}
					/>
				</>
			)}
		</div>
	);
}
