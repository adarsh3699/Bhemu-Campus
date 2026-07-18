"use client";

import { useState, useEffect } from "react";
import { Trophy, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/firebase/AuthContext";
import { useGpaData } from "@/hooks/GpaDataContext";
import { LeaderboardService } from "@/firebase/leaderboardService";
import { useMessage } from "@/components/common/MessageProvider";

export default function LeaderboardSettings() {
	const { currentUser } = useAuth();
	const { currentProfile } = useGpaData();
	const { showMessage } = useMessage();
	const [optOut, setOptOut] = useState(false);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	const isEligible = !!(currentProfile?.umsVerified);

	useEffect(() => {
		if (!currentUser || !currentProfile || !isEligible) {
			return;
		}
		let cancelled = false;
		LeaderboardService.getUserEntry(currentUser.uid, String(currentProfile.id))
			.then((entry) => {
				if (!cancelled && entry) setOptOut(!!entry.optOut);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => { cancelled = true; };
	}, [currentUser, currentProfile, isEligible]);

	if (!isEligible) return null;

	const handleToggle = async () => {
		if (!currentUser || !currentProfile) return;
		setSaving(true);
		try {
			const newValue = !optOut;
			await LeaderboardService.setOptOut(currentUser.uid, String(currentProfile.id), newValue);
			setOptOut(newValue);
			showMessage(newValue ? "You are now hidden from the leaderboard" : "You are now visible on the leaderboard", "success");
		} catch {
			showMessage("Failed to update leaderboard visibility", "error");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="bg-surface-dark/50 border border-white/10 rounded-xl p-6">
			<div className="flex items-center gap-2 mb-2">
				<Trophy className="w-5 h-5 text-yellow-400 shrink-0" />
				<h3 className="text-white font-bold text-base">Leaderboard</h3>
			</div>
			<p className="text-muted-foreground text-sm mb-5">
				Control your visibility on the CGPA leaderboard among your batchmates.
			</p>

			<div className="flex items-center justify-between p-4 bg-surface-elevated border border-border rounded-xl gap-4">
				<div className="flex items-center gap-3 min-w-0">
					{optOut ? (
						<EyeOff className="w-4 h-4 text-muted-foreground shrink-0" />
					) : (
						<Eye className="w-4 h-4 text-primary shrink-0" />
					)}
					<div className="min-w-0">
						<h4 className="text-white font-semibold text-sm">
							{optOut ? "Hidden from leaderboard" : "Visible on leaderboard"}
						</h4>
						<p className="text-muted-foreground text-xs mt-0.5">
							{optOut ? "Your rank is not shown to other students" : "Other students can see your rank"}
						</p>
					</div>
				</div>

				<button
					onClick={handleToggle}
					disabled={loading || saving}
					className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
						!optOut ? "bg-primary" : "bg-white/20"
					}`}
				>
					<span
						className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
							!optOut ? "translate-x-6" : "translate-x-1"
						}`}
					/>
				</button>
			</div>
		</div>
	);
}
