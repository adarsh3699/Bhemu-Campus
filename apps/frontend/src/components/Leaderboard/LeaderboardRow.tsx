"use client";

import { Trophy, Medal } from "lucide-react";
import type { LeaderboardEntry } from "@/types";
import { shortenName } from "@bhemu/shared";

interface LeaderboardRowProps {
	entry: LeaderboardEntry;
	rank: number;
	isCurrentUser: boolean;
}

function RankBadge({ rank }: { rank: number }) {
	if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-400" />;
	if (rank === 2) return <Medal className="w-5 h-5 text-slate-300" />;
	if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
	return <span className="text-sm font-bold text-muted-foreground tabular-nums w-8 text-center">#{rank}</span>;
}

export default function LeaderboardRow({ entry, rank, isCurrentUser }: LeaderboardRowProps) {
	const displayName = isCurrentUser ? entry.name : shortenName(entry.name);
	const isTop3 = rank <= 3;

	const containerClass = isCurrentUser
		? "bg-primary/10 border-primary/30 shadow-[0_0_16px_-4px_rgba(3,152,172,0.2)]"
		: isTop3
			? "bg-white/[0.04] border-white/10"
			: "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/10";

	const cgpaClass =
		isTop3
			? "bg-yellow-400/10 text-yellow-400 border-yellow-400/20"
			: isCurrentUser
				? "bg-primary/15 text-primary border-primary/25"
				: "bg-white/8 text-foreground/75 border-white/10";

	const nameClass = isCurrentUser ? "text-primary font-semibold" : "text-foreground/90 font-medium";

	return (
		<div className={`flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all duration-200 ${containerClass}`}>
			{/* Rank */}
			<div className="flex items-center justify-center w-6 shrink-0">
				<RankBadge rank={rank} />
			</div>

			{/* Name */}
			<div className="flex-1 min-w-0">
				<p className={`text-sm truncate ${nameClass}`}>
					{displayName}
					{isCurrentUser && (
						<span className="ml-2 text-xs text-primary/60 font-normal">(You)</span>
					)}
				</p>
			</div>

			{/* CGPA badge */}
			<div className={`px-3 py-1 rounded-lg text-sm font-bold border tabular-nums shrink-0 ${cgpaClass}`}>
				{entry.cgpa.toFixed(2)}
			</div>
		</div>
	);
}
