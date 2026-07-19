"use client";

import { useState } from "react";
import { Trophy, Users, Share2, EyeOff, Settings, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/firebase/AuthContext";
import LoginRecommendation from "@/components/common/LoginRecommendation";
import { useLeaderboard } from "./hooks/useLeaderboard";
import { formatProgramLabel } from "@/lib/programUtils";
import LeaderboardTable from "./LeaderboardTable";
import UMSSyncPrompt from "./UMSSyncPrompt";
import ShareLeaderboardModal from "./ShareLeaderboardModal";

export default function LeaderboardView() {
	const { currentUser } = useAuth();
	const {
		leaderboardData,
		loading,
		error,
		isEligible,
		parsedProgram,
		entryUserId,
		profileLoading,
		userOptedOut,
		needsResync,
	} = useLeaderboard();
	const [shareModalOpen, setShareModalOpen] = useState(false);

	if (!currentUser) return <LoginRecommendation feature="Leaderboard" />;
	if (!isEligible && !profileLoading) return <UMSSyncPrompt />;

	if (loading || profileLoading) {
		return (
			<div className="w-full min-h-[calc(100vh-80px)] flex items-center justify-center">
				<div className="flex flex-col items-center gap-4">
					<div className="relative">
						<div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
						<Trophy className="w-5 h-5 text-primary/60 absolute inset-0 m-auto" />
					</div>
					<p className="text-sm text-muted-foreground">Loading leaderboard...</p>
				</div>
			</div>
		);
	}

	if (userOptedOut) {
		return (
			<div className="w-full min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
				<div className="glass-panel rounded-2xl p-8 max-w-md w-full text-center space-y-4">
					<div className="w-12 h-12 mx-auto rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
						<EyeOff className="w-6 h-6 text-muted-foreground" />
					</div>
					<h2 className="text-lg font-bold text-foreground">Leaderboard Hidden</h2>
					<p className="text-sm text-muted-foreground leading-relaxed">
						You have opted out of the leaderboard. Your rank is not visible to others and you cannot access
						the leaderboard while hidden.
					</p>
					<Link
						href="/settings"
						className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg text-sm font-medium text-primary transition-colors"
					>
						<Settings className="w-4 h-4" />
						Go to Settings
					</Link>
				</div>
			</div>
		);
	}

	if (needsResync) return <UMSSyncPrompt />;

	if (error) {
		return (
			<div className="w-full min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
				<div className="glass-panel rounded-2xl p-6 max-w-md w-full text-center">
					<p className="text-sm text-red-400 mb-2">Failed to load leaderboard</p>
					<p className="text-xs text-muted-foreground">{error}</p>
				</div>
			</div>
		);
	}

	if (!leaderboardData) return null;

	const { userRank, totalStudents } = leaderboardData;
	const groupLabel = parsedProgram
		? formatProgramLabel(parsedProgram.programName, parsedProgram.branch)
		: "Your Program";

	const rankPercentile =
		userRank && totalStudents > 0 ? Math.round(((totalStudents - userRank) / totalStudents) * 100) : null;

	return (
		<div className="w-full max-w-3xl mx-auto p-4 md:p-6 space-y-4">
			{/* Header Card */}
			<div className="relative overflow-hidden rounded-2xl border border-white/10 bg-linear-to-br from-white/5 to-white/2">
				{/* Ambient glow */}
				<div className="absolute -top-16 -right-16 w-48 h-48 bg-yellow-400/8 rounded-full blur-3xl pointer-events-none" />
				<div className="absolute -bottom-12 -left-12 w-40 h-40 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
				<div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-yellow-400/30 to-transparent" />

				<div className="relative p-5 md:p-6">
					{/* Title row */}
					<div className="flex items-start justify-between gap-3">
						<div className="flex items-center gap-3 min-w-0">
							<div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center shrink-0">
								<Trophy className="w-5 h-5 text-yellow-400" />
							</div>
							<div className="min-w-0">
								<h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
									Leaderboard
								</h1>
								<p className="text-xs text-muted-foreground mt-0.5 truncate">
									{groupLabel}
								</p>
							</div>
						</div>

						{leaderboardData.userEntry && (
							<button
								onClick={() => setShareModalOpen(true)}
								className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary/30 rounded-lg text-xs font-medium text-foreground/70 hover:text-foreground transition-all duration-200 cursor-pointer shrink-0"
							>
								<Share2 className="w-3.5 h-3.5" />
								<span className="hidden sm:inline">Share</span>
							</button>
						)}
					</div>

					{/* Rank Stats Row */}
					{userRank && totalStudents > 0 && (
						<div className="mt-4 flex flex-wrap gap-2">
							<div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg">
								<span className="text-xs text-muted-foreground">Your Rank</span>
								<span className="text-sm font-bold text-primary">#{userRank}</span>
							</div>
							<div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg">
								<Users className="w-3.5 h-3.5 text-muted-foreground" />
								<span className="text-xs text-muted-foreground">
									of <span className="text-foreground/70 font-medium">{totalStudents}</span> students
								</span>
							</div>
							{rankPercentile !== null && rankPercentile > 0 && (
								<div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/8 border border-emerald-500/20 rounded-lg">
									<TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
									<span className="text-xs text-emerald-400 font-medium">
										Top {100 - rankPercentile}%
									</span>
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			{/* Table */}
			<LeaderboardTable
				data={leaderboardData}
				currentUserId={entryUserId ?? currentUser.uid}
				currentProfileId={leaderboardData.userEntry?.profileId ?? ""}
			/>

			{/* Share Modal */}
			<ShareLeaderboardModal
				isOpen={shareModalOpen}
				onClose={() => setShareModalOpen(false)}
				leaderboardData={leaderboardData}
				parsedProgram={parsedProgram}
			/>
		</div>
	);
}
