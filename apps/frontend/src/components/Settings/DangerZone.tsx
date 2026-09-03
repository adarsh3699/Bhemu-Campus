"use client";

import React from "react";
import { AlertTriangle, Trash2, RotateCw, Clock } from "lucide-react";
import { useAuth } from "@/firebase/AuthContext";

const MIN_ACCOUNT_AGE_DAYS = 7;

function getDaysUntilDeletion(creationTime: string | undefined): number | null {
	if (!creationTime) return null;
	const created = new Date(creationTime).getTime();
	if (isNaN(created)) return null;
	const elapsed = Date.now() - created;
	const remaining = MIN_ACCOUNT_AGE_DAYS * 24 * 60 * 60 * 1000 - elapsed;
	if (remaining <= 0) return null;
	return Math.ceil(remaining / (24 * 60 * 60 * 1000));
}

interface DangerZoneProps {
	onShowDeleteModal: () => void;
	isDeletingData: boolean;
}

export default function DangerZone({ onShowDeleteModal, isDeletingData }: DangerZoneProps) {
	const { currentUser } = useAuth();
	const daysRemaining = getDaysUntilDeletion(currentUser?.metadata?.creationTime);
	const isLocked = daysRemaining !== null;

	return (
		<div
			className="bg-[#161616] border border-destructive/20 rounded-xl p-5"
			style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.4)" }}
		>
			{/* Header */}
			<div className="flex items-center gap-3 mb-4">
				<div className="w-8 h-8 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-center shrink-0">
					<AlertTriangle className="w-4 h-4 text-destructive" />
				</div>
				<div>
					<h3 className="text-sm font-semibold text-white">Danger Zone</h3>
					<p className="text-xs text-muted-foreground mt-0.5">
						Irreversible actions that affect your entire account
					</p>
				</div>
			</div>

			{/* Delete Account Row */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-2.5">
				<div className="min-w-0">
					<p className="text-sm text-white font-medium">Delete Account</p>
					<p className="text-xs text-muted-foreground mt-0.5">
						All calculators, history, and settings will be permanently wiped.
					</p>
				</div>
				<button
					onClick={onShowDeleteModal}
					disabled={isDeletingData || isLocked}
					className="w-full sm:w-auto shrink-0 px-4 py-2 border border-destructive/40 hover:bg-destructive/10 text-destructive text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
				>
					{isDeletingData ? (
						<>
							<RotateCw className="w-4 h-4 animate-spin" /> Deleting...
						</>
					) : (
						<>
							<Trash2 className="w-4 h-4" /> Delete Account
						</>
					)}
				</button>
			</div>

			{/* Cooldown notice */}
			{isLocked && (
				<div className="flex items-center gap-2 mt-3 p-2.5 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
					<Clock className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
					<p className="text-xs text-muted-foreground">
						Account deletion is available {daysRemaining} day{daysRemaining > 1 ? "s" : ""} after account
						creation for security purposes.
					</p>
				</div>
			)}
		</div>
	);
}
