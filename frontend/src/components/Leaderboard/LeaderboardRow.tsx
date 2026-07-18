"use client";

import { Trophy, Medal } from "lucide-react";
import type { LeaderboardEntry } from "@/types";
import { shortenName } from "@/lib/programUtils";

interface LeaderboardRowProps {
	entry: LeaderboardEntry;
	rank: number;
	isCurrentUser: boolean;
}

function RankBadge({ rank }: { rank: number }) {
	if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-400" />;
	if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />;
	if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
	return <span className="text-sm font-bold text-muted-foreground w-5 text-center">#{rank}</span>;
}

export default function LeaderboardRow({ entry, rank, isCurrentUser }: LeaderboardRowProps) {
	const displayName = isCurrentUser ? entry.name : shortenName(entry.name);

	return (
		<div
			className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
				isCurrentUser
					? "bg-primary/10 border border-primary/30 shadow-sm shadow-primary/10"
					: "bg-white/5 border border-white/5 hover:bg-white/8"
			}`}
		>
			<div className="flex items-center justify-center w-8">
				<RankBadge rank={rank} />
			</div>

			<div className="flex-1 min-w-0">
				<p className={`text-sm font-medium truncate ${isCurrentUser ? "text-primary" : "text-foreground/90"}`}>
					{displayName}
					{isCurrentUser && (
						<span className="ml-2 text-xs text-primary/70 font-normal">(You)</span>
					)}
				</p>
			</div>

			<div
				className={`px-3 py-1 rounded-lg text-sm font-bold ${
					rank <= 3
						? "bg-yellow-400/10 text-yellow-400 border border-yellow-400/20"
						: isCurrentUser
							? "bg-primary/15 text-primary border border-primary/25"
							: "bg-white/10 text-foreground/80 border border-white/10"
				}`}
			>
				{entry.cgpa.toFixed(2)}
			</div>
		</div>
	);
}
