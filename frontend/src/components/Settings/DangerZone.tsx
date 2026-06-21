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
			className="bg-surface-dark/50 border border-destructive/30 rounded-xl p-6"
			style={{ boxShadow: "inset 0 0 0 1px rgba(239, 68, 68, 0.1), 0 4px 20px rgba(239, 68, 68, 0.05)" }}
		>
			{/* Header */}
			<div className="flex items-center gap-2 mb-2">
				<AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
				<h3 className="text-white font-bold text-base">Danger Zone</h3>
			</div>
			<p className="text-muted-foreground text-sm mb-5">
				Permanently delete your account and all associated data. This action cannot be undone.
			</p>

			{/* Delete Row */}
			<div className="flex items-center justify-between p-4 bg-surface-elevated border border-border rounded-xl gap-4">
				<div className="min-w-0">
					<h4 className="text-white font-semibold text-sm">Delete Account</h4>
					<p className="text-muted-foreground text-xs mt-0.5 truncate">
						All calculators, history, and settings will be permanently wiped.
					</p>
				</div>
				<button
					onClick={onShowDeleteModal}
					disabled={isDeletingData}
					className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg border border-destructive text-destructive hover:bg-destructive/10 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{isDeletingData ? (
						<>
							<RotateCw className="w-4 h-4 animate-spin" />
							Deleting...
						</>
					) : (
						<>
							<Trash2 className="w-4 h-4" />
							Delete Account
						</>
					)}
				</button>
			</div>
		</div>
	);
}
