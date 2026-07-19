"use client";

import React from "react";
import { AlertTriangle, Trash2, RotateCw } from "lucide-react";

interface DangerZoneProps {
	onShowDeleteModal: () => void;
	isDeletingData: boolean;
}

export default function DangerZone({ onShowDeleteModal, isDeletingData }: DangerZoneProps) {
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
					disabled={isDeletingData}
					className="w-full sm:w-auto shrink-0 px-4 py-2 border border-destructive/40 hover:bg-destructive/10 text-destructive text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
				>
					{isDeletingData ? (
						<><RotateCw className="w-4 h-4 animate-spin" /> Deleting...</>
					) : (
						<><Trash2 className="w-4 h-4" /> Delete Account</>
					)}
				</button>
			</div>
		</div>
	);
}
