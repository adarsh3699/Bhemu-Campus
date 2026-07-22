"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { UserCog, Pencil, Share2, Trash2, Eye, EyeOff, Info } from "lucide-react";
import { useAuth } from "@/firebase/AuthContext";
import { useGpaData } from "@/contexts/GpaDataContext";
import { useMessage } from "@/contexts/MessageContext";
import { LeaderboardService } from "@/firebase/services";
import { db } from "@/firebase/config";
import InputModal from "@/components/modal/InputModal";
import ShareModal, { type ShareItem } from "@/components/modal/ShareModal";
import ConfirmModal from "@/components/modal/ConfirmModal";

export default function ProfileSettings() {
	const { currentUser } = useAuth();
	const { currentProfile, profiles, renameProfile, deleteProfile, shareProfileWithUser, mySharedProfiles } =
		useGpaData();
	const { showMessage } = useMessage();

	const [showRenameModal, setShowRenameModal] = useState(false);
	const [showShareModal, setShowShareModal] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);

	const [optOut, setOptOut] = useState(false);
	const [leaderboardLoaded, setLeaderboardLoaded] = useState(false);
	const [saving, setSaving] = useState(false);

	const isOwnProfile = !currentProfile?.isShared;
	const isEligible = !!currentProfile?.umsVerified && isOwnProfile;
	const canDelete = isOwnProfile && profiles.length > 1 && !currentProfile?.isDefault;

	const currentShares = (mySharedProfiles as (ShareItem & { profileId: string | number })[]).filter(
		(share) => share.profileId === currentProfile?.id
	);

	const prevProfileIdRef = useRef(currentProfile?.id);
	if (prevProfileIdRef.current !== currentProfile?.id) {
		prevProfileIdRef.current = currentProfile?.id;
		if (showRenameModal) setShowRenameModal(false);
		if (showShareModal) setShowShareModal(false);
		if (showDeleteModal) setShowDeleteModal(false);
	}

	useEffect(() => {
		if (!currentUser || !currentProfile || !isEligible) return;
		let cancelled = false;
		LeaderboardService.getUserEntry(db, currentUser.uid, String(currentProfile.id))
			.then((entry) => {
				if (!cancelled && entry) {
					setOptOut(!!entry.optOut);
				}
			})
			.finally(() => {
				if (!cancelled) setLeaderboardLoaded(true);
			});
		return () => {
			cancelled = true;
		};
	}, [currentUser, currentProfile, isEligible]);

	const handleRename = useCallback(
		async (newName: string) => {
			if (!currentProfile) return;
			setShowRenameModal(false);
			await renameProfile(currentProfile.id, newName);
			showMessage("Profile renamed successfully", "success");
		},
		[currentProfile, renameProfile, showMessage]
	);

	const handleDelete = useCallback(async () => {
		if (!currentProfile) return;
		setShowDeleteModal(false);
		await deleteProfile(currentProfile.id);
		showMessage("Profile deleted", "success");
	}, [currentProfile, deleteProfile, showMessage]);

	const handleShareWithUser = useCallback(
		async (emailOrAction: string, permission: string, action = "share") => {
			if (!currentProfile) return;
			await shareProfileWithUser(currentProfile, emailOrAction, permission as "read" | "edit", action);
		},
		[currentProfile, shareProfileWithUser]
	);

	const handleLeaderboardToggle = async () => {
		if (!currentUser || !currentProfile) return;
		setSaving(true);
		try {
			const newValue = !optOut;
			await LeaderboardService.setOptOut(db, currentUser.uid, String(currentProfile.id), newValue);
			setOptOut(newValue);
			showMessage(
				newValue ? "You are now hidden from the leaderboard" : "You are now visible on the leaderboard",
				"success"
			);
		} catch {
			showMessage("Failed to update leaderboard visibility", "error");
		} finally {
			setSaving(false);
		}
	};

	if (!currentProfile) return null;

	return (
		<div
			className="bg-[#161616] border border-white/8 rounded-xl p-5 flex flex-col gap-4"
			style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.4)" }}
		>
			{/* Header */}
			<div className="flex items-center gap-3">
				<div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
					<UserCog className="w-4 h-4 text-violet-400" />
				</div>
				<div>
					<h3 className="text-sm font-semibold text-white">Profile Settings</h3>
					<p className="text-xs text-muted-foreground mt-0.5">
						Manage <span className="text-white/90 font-medium">{currentProfile.name}</span> profile
					</p>
				</div>
			</div>

			{/* Shared profile notice */}
			{!isOwnProfile ? (
				<div className="flex items-start gap-2.5 p-3 rounded-lg bg-white/3 border border-white/6">
					<Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
					<p className="text-xs text-muted-foreground leading-relaxed">
						Profile management is only available for your own profiles. This profile is shared with you by
						another user.
					</p>
				</div>
			) : (
				<>
					{/* Rename row */}
					<div className="flex items-center justify-between py-2.5 border-b border-white/6">
						<div className="flex items-center gap-2.5 min-w-0">
							<Pencil className="w-4 h-4 text-muted-foreground shrink-0" />
							<div className="min-w-0">
								<p className="text-sm text-white font-medium">
									Profile Name{" "}
									{isEligible && (
										<span className="text-primary/90 font-normal text-xs ml-1">
											(Leaderboard name)
										</span>
									)}
								</p>
								<p className="text-xs text-muted-foreground mt-0.5 truncate">{currentProfile.name}</p>
							</div>
						</div>
						<button
							onClick={() => setShowRenameModal(true)}
							className="text-xs px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/12 text-white font-medium transition-colors shrink-0"
						>
							Rename
						</button>
					</div>

					{/* Share row */}
					<div className="flex items-center justify-between py-2.5 border-b border-white/6">
						<div className="flex items-center gap-2.5 min-w-0">
							<Share2 className="w-4 h-4 text-muted-foreground shrink-0" />
							<div className="min-w-0">
								<p className="text-sm text-white font-medium">Share Profile</p>
								<p className="text-xs text-muted-foreground mt-0.5">
									{currentShares.length > 0
										? `Shared with ${currentShares.length} user${currentShares.length > 1 ? "s" : ""}`
										: "Not shared with anyone"}
								</p>
							</div>
						</div>
						<button
							onClick={() => setShowShareModal(true)}
							className="text-xs px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/12 text-white font-medium transition-colors shrink-0"
						>
							Share
						</button>
					</div>

					{/* Delete row */}
					{canDelete && (
						<div className="flex items-center justify-between py-2.5 border-b border-white/6">
							<div className="flex items-center gap-2.5 min-w-0">
								<Trash2 className="w-4 h-4 text-red-400/70 shrink-0" />
								<div className="min-w-0">
									<p className="text-sm text-white font-medium">Delete Profile</p>
									<p className="text-xs text-muted-foreground mt-0.5">
										Permanently remove this profile and all its data
									</p>
								</div>
							</div>
							<button
								onClick={() => setShowDeleteModal(true)}
								className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium transition-colors shrink-0"
							>
								Delete
							</button>
						</div>
					)}

					{/* Leaderboard visibility */}
					{isEligible && (
						<div className="flex items-center justify-between py-2.5">
							<div className="flex items-center gap-2.5 min-w-0">
								{optOut ? (
									<EyeOff className="w-4 h-4 text-muted-foreground shrink-0" />
								) : (
									<Eye className="w-4 h-4 text-primary shrink-0" />
								)}
								<div className="min-w-0">
									<p className="text-sm text-white font-medium">
										{optOut ? "Hidden from leaderboard" : "Visible on leaderboard"}
									</p>
									<p className="text-xs text-muted-foreground mt-0.5">
										{optOut
											? "Your rank is not shown to other students"
											: "Other students can see your rank"}
									</p>
								</div>
							</div>
							<button
								onClick={handleLeaderboardToggle}
								disabled={!leaderboardLoaded || saving}
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
					)}
				</>
			)}

			{/* Modals */}
			<InputModal
				isOpen={showRenameModal}
				onClose={() => setShowRenameModal(false)}
				onConfirm={handleRename}
				title="Rename Profile"
				placeholder="Enter new profile name"
				initialValue={currentProfile.name}
				confirmText="Rename"
			/>

			<ShareModal
				isOpen={showShareModal}
				onClose={() => setShowShareModal(false)}
				onShareWithUser={handleShareWithUser}
				profileName={currentProfile.name}
				currentShares={currentShares}
			/>

			<ConfirmModal
				isOpen={showDeleteModal}
				onClose={() => setShowDeleteModal(false)}
				onConfirm={handleDelete}
				title="Delete Profile"
				message={`Are you sure you want to delete "${currentProfile.name}"? This will permanently remove all semesters, marks, and attendance data in this profile.`}
				confirmText="Delete Profile"
				cancelText="Cancel"
				type="danger"
			/>
		</div>
	);
}
