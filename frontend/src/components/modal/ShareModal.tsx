"use client";

import React, { useState, useCallback } from "react";
import { Pencil } from "lucide-react";
import BaseModal from "./BaseModal";

import type { ShareItem } from "@/types";

// Re-export for consumers who import ShareItem from this module
export type { ShareItem };

interface ShareModalProps {
	isOpen: boolean;
	onClose: () => void;
	onShareWithUser: (emailOrId: string, permissionOrAction: string, actionType?: string) => Promise<void>;
	profileName: string;
	currentShares?: ShareItem[];
}

const ShareModal: React.FC<ShareModalProps> = ({
	isOpen,
	onClose,
	onShareWithUser,
	profileName,
	currentShares = [],
}) => {
	const [targetEmail, setTargetEmail] = useState("");
	const [permission, setPermission] = useState("read");
	const [isSharing, setIsSharing] = useState(false);
	const [error, setError] = useState("");

	const resetForm = () => {
		setTargetEmail("");
		setPermission("read");
		setError("");
	};

	const handleSubmit = useCallback(
		async (e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			if (!targetEmail.trim()) {
				setError("Please enter a valid email address");
				return;
			}

			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(targetEmail)) {
				setError("Please enter a valid email address");
				return;
			}

			const existingShare = currentShares.find(
				(share) => share.targetUserEmail === targetEmail && share.isActive
			);
			if (existingShare) {
				setError("Profile is already shared with this user");
				return;
			}

			setIsSharing(true);
			setError("");

			try {
				await onShareWithUser(targetEmail, permission);
				resetForm();
				onClose();
			} catch (err) {
				setError(err instanceof Error ? err.message : String(err));
			} finally {
				setIsSharing(false);
			}
		},
		[targetEmail, permission, currentShares, onShareWithUser, onClose]
	);

	const handleClose = useCallback(() => {
		if (!isSharing) {
			resetForm();
			onClose();
		}
	}, [isSharing, onClose]);

	const handlePermissionChange = useCallback(
		async (shareId: string, currentPermission: "read" | "edit") => {
			const newPermission = currentPermission === "read" ? "edit" : "read";
			setIsSharing(true);
			setError("");

			try {
				await onShareWithUser(shareId, newPermission, "updatePermission");
			} catch (err) {
				setError(err instanceof Error ? err.message : String(err));
			} finally {
				setIsSharing(false);
			}
		},
		[onShareWithUser]
	);

	const handleUnshare = useCallback(
		async (shareId: string) => {
			setIsSharing(true);
			setError("");

			try {
				await onShareWithUser(shareId, "unshare");
			} catch (err) {
				setError(err instanceof Error ? err.message : String(err));
			} finally {
				setIsSharing(false);
			}
		},
		[onShareWithUser]
	);

	const formatShareDate = (sharedAt: unknown): string => {
		if (!sharedAt) return "N/A";
		try {
			if (sharedAt && typeof sharedAt === "object" && "toDate" in sharedAt && typeof (sharedAt as { toDate: unknown }).toDate === "function") {
				return (sharedAt as { toDate: () => Date }).toDate().toLocaleDateString();
			}
			return new Date(sharedAt as string | number | Date).toLocaleDateString();
		} catch {
			return "N/A";
		}
	};

	return (
		<BaseModal
			isOpen={isOpen}
			onClose={handleClose}
			title="Share Profile"
			maxWidth="600px"
			closeOnEsc={!isSharing}
			closeOnOverlayClick={!isSharing}
			className="bg-neutral-950 border border-white/10"
		>
			<div className="p-6 overflow-auto max-h-[calc(85vh-120px)]">
				<p className="mb-6 text-sm text-neutral-400 font-medium">Share &quot;{profileName}&quot; with another user</p>

				<form onSubmit={handleSubmit} className="flex flex-col gap-5">
					<div className="flex flex-col gap-2">
						<label
							htmlFor="targetEmail"
							className="font-semibold text-neutral-300 text-xs uppercase tracking-wider"
						>
							User Email
						</label>
						<input
							id="targetEmail"
							type="email"
							value={targetEmail}
							onChange={(e) => setTargetEmail(e.target.value)}
							placeholder="Enter user's email address"
							required
							disabled={isSharing}
							className="p-3.5 rounded-xl border border-white/10 bg-white/5 text-white transition-all duration-300 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 placeholder:text-neutral-500 disabled:opacity-60 disabled:cursor-not-allowed text-sm"
						/>
					</div>

					<div className="flex flex-col gap-2">
						<label
							htmlFor="permission"
							className="font-semibold text-neutral-300 text-xs uppercase tracking-wider"
						>
							Permission Level
						</label>
						<select
							id="permission"
							value={permission}
							onChange={(e) => setPermission(e.target.value)}
							disabled={isSharing}
							className="p-3.5 rounded-xl border border-white/10 bg-neutral-900 text-white transition-all duration-300 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 disabled:cursor-not-allowed text-sm"
						>
							<option value="read">Read Only - Can view and copy</option>
							<option value="edit">Edit Access - Can modify directly</option>
						</select>
						<div className="mt-2 p-3.5 bg-white/5 rounded-xl border-l-4 border-indigo-500 text-xs">
							{permission === "read" ? (
								<p className="text-neutral-400">
									The user can view the profile and create a copy to their account.
								</p>
							) : (
								<p className="text-neutral-400">
									The user can directly edit the profile. Changes will sync in real-time.
								</p>
							)}
						</div>
					</div>

					{error && (
						<div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
							{error}
						</div>
					)}

					<div className="flex gap-3 justify-end pt-4">
						<button
							type="button"
							onClick={handleClose}
							disabled={isSharing}
							className="px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isSharing}
							className="px-5 py-2.5 bg-gradient-to-r from-teal-400 to-blue-500 hover:from-teal-500 hover:to-blue-600 text-white rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isSharing ? "Sharing..." : "Share Profile"}
						</button>
					</div>
				</form>

				{currentShares.length > 0 && (
					<div className="mt-8 pt-8 border-t border-white/10">
						<h3 className="text-lg font-bold mb-4 text-white">Currently Shared With</h3>
						<div className="space-y-4">
							{currentShares.map((share) => (
								<div key={share.shareId} className="bg-white/5 rounded-xl p-4 border border-white/10">
									<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
										<div className="flex-1">
											<div className="font-semibold text-white text-sm mb-1">{share.targetUserEmail}</div>
											<div className="flex items-center gap-3 mb-2">
												<span
													className={`px-3 py-1 rounded-full text-xs font-semibold ${
														share.permission === "read"
															? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
															: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
													}`}
												>
													{share.permission === "read" ? "Read Only" : "Edit Access"}
												</span>
											</div>
											<div className="text-xs text-neutral-500">
												Shared on {formatShareDate(share.sharedAt)}
											</div>
										</div>
										<div className="flex gap-2">
											<button
												type="button"
												onClick={() => handlePermissionChange(share.shareId, share.permission)}
												disabled={isSharing}
												title={`Change to ${
													share.permission === "read" ? "Edit Access" : "Read Only"
												}`}
												className="flex items-center gap-2 px-3 py-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-medium transition-all duration-300 hover:bg-indigo-500/20 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
											>
												<Pencil className="w-3.5 h-3.5" />
												{share.permission === "read" ? "Grant Edit" : "Make Read-Only"}
											</button>
											<button
												type="button"
												onClick={() => handleUnshare(share.shareId)}
												disabled={isSharing}
												className="px-3 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-xs font-medium transition-all duration-300 hover:bg-red-500/20 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
											>
												Remove
											</button>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</BaseModal>
	);
};

export default ShareModal;
