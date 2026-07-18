"use client";

import type { LeaderboardData } from "@/types";
import LeaderboardRow from "./LeaderboardRow";
import LeaderboardSeparator from "./LeaderboardSeparator";

interface LeaderboardTableProps {
	data: LeaderboardData;
	currentUserId: string;
}

export default function LeaderboardTable({ data, currentUserId }: LeaderboardTableProps) {
	const { topEntries, userEntry, userRank, nearbyEntries } = data;
	const isUserInTop10 = topEntries.some((e) => e.userId === currentUserId);

	return (
		<div className="flex flex-col gap-2">
			{/* Top 10 */}
			{topEntries.map((entry, index) => (
				<LeaderboardRow
					key={`${entry.userId}_${entry.profileId}`}
					entry={entry}
					rank={index + 1}
					isCurrentUser={entry.userId === currentUserId}
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
							isCurrentUser={entry.userId === currentUserId}
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
