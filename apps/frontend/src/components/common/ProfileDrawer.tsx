"use client";

import React, { useState, useEffect, useRef } from "react";
import { Copy, Pencil, Eye, X, Plus, MoreVertical, Share2, Trash2 } from "lucide-react";
import ConfirmModal from "@/components/modal/ConfirmModal";
import InputModal from "@/components/modal/InputModal";

interface ProfileInfo {
	id: string | number;
	name: string;
	updatedAt?: unknown;
	isShared?: boolean;
	ownerUserId?: string;
	ownerEmail?: string;
	permission?: "read" | "edit" | "owner";
	shareId?: string;
	isDefault?: boolean;
}

interface SharedStatusItem {
	shareId: string;
	profileId: string | number;
	profileName: string;
	targetUserEmail?: string;
	permission?: "read" | "edit";
	isActive?: boolean;
}

interface ProfileDrawerProps {
	isOpen: boolean;
	onClose: () => void;
	profiles: ProfileInfo[];
	currentProfile: string | number | null;
	onProfileSelect: (profileId: string | number) => void;
	onCreateProfile: (name: string) => void;
	onDeleteProfile: (profileId: string | number) => void;
	onShareProfile?: (profileId: string | number) => void;
	onCopySharedProfile?: (shareId: string, profileName: string) => Promise<void>;
	onRenameProfile?: (profileId: string | number, newName: string) => void;
	mySharedProfiles?: unknown[];
	isLoading?: boolean;
	currentUser?: { uid: string } | null;
}

const ProfileDrawer: React.FC<ProfileDrawerProps> = ({
	isOpen,
	onClose,
	profiles,
	currentProfile,
	onProfileSelect,
	onCreateProfile,
	onDeleteProfile,
	onShareProfile,
	onCopySharedProfile,
	onRenameProfile,
	mySharedProfiles = [],
	isLoading = false,
	currentUser,
}) => {
	const typedMySharedProfiles = (mySharedProfiles || []) as SharedStatusItem[];

	const [showCreateModal, setShowCreateModal] = useState(false);
	const [showConfirmModal, setShowConfirmModal] = useState(false);
	const [profileToDelete, setProfileToDelete] = useState<{ id: string | number; name: string } | null>(null);
	const [profileToRename, setProfileToRename] = useState<{ id: string | number; name: string } | null>(null);
	const [openMenuId, setOpenMenuId] = useState<string | number | null>(null);
	const menuRef = useRef<HTMLDivElement>(null);

	// Close menu on outside click
	useEffect(() => {
		if (!openMenuId) return;
		const handleClick = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setOpenMenuId(null);
			}
		};
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, [openMenuId]);

	// Prevent background scrolling when drawer is open
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [isOpen]);

	const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	const handleCopyProfile = async (
		shareId: string,
		profileName: string,
		event: React.MouseEvent<HTMLButtonElement>
	) => {
		event.stopPropagation();
		if (onCopySharedProfile) {
			await onCopySharedProfile(shareId, profileName);
		}
	};

	const getProfileUserShares = (profileId: string | number) => {
		return typedMySharedProfiles?.filter((share) => share.profileId === profileId && share.isActive) || [];
	};

	const formatUpdatedAt = (updatedAt: unknown) => {
		if (!updatedAt) return "Never updated";
		const ts = updatedAt as { toMillis?: () => number };
		const ms = ts.toMillis ? ts.toMillis() : Number(updatedAt);
		if (!ms || isNaN(ms)) return "Never updated";
		return (
			"Updated " + new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
		);
	};

	const ownProfiles = profiles
		.filter((p) => {
			return !p.isShared || (currentUser && p.ownerUserId === currentUser.uid);
		})
		.sort((a, b) => {
			if (a.isDefault && !b.isDefault) return -1;
			if (!a.isDefault && b.isDefault) return 1;
			return (a.name || "").localeCompare(b.name || "");
		});

	const sharedWithMeProfiles = profiles.filter((p) => {
		return !!p.isShared && (!p.ownerUserId || (currentUser && p.ownerUserId !== currentUser.uid));
	});

	if (!isOpen) return null;

	return (
		<>
			{/* Overlay */}
			<div
				className="fixed inset-0 bg-black/20 backdrop-blur-sm z-999 flex items-end sm:items-center justify-center sm:justify-end animate-in fade-in duration-300"
				onClick={handleOverlayClick}
			>
				{/* Drawer Wrapper */}
				<div
					className="w-full sm:w-[450px] h-[80vh] sm:h-full bg-neutral-950 border-t sm:border-t-0 sm:border-l border-white/10 shadow-2xl flex flex-col justify-between transition-transform duration-300 animate-in slide-in-from-bottom sm:slide-in-from-right duration-300 rounded-none overflow-hidden"
					onClick={(e) => e.stopPropagation()}
				>
					{/* Drawer Header Drag Handle on Mobile */}
					<div className="w-12 h-1 bg-white/20 rounded-full mx-auto my-3 sm:hidden flex-shrink-0" />

					{/* Header */}
					<div className="flex justify-between items-center px-6 py-4 border-b border-white/5 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 flex-shrink-0">
						<h3 className="text-xl font-bold bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
							WORKSPACE PROFILES
						</h3>
						<button
							onClick={onClose}
							className="p-2 rounded-xl text-neutral-400 hover:bg-white/5 hover:text-white transition-all duration-200"
						>
							<X className="w-5 h-5" />
						</button>
					</div>

					{/* Drawer Content */}
					<div className="flex-1 overflow-y-auto p-6 space-y-8">
						{/* Own Profiles Section */}
						<div className="space-y-4">
							<h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
								My Academic Profiles
							</h4>
							<div className="grid grid-cols-1 gap-3">
								{ownProfiles.map((profile) => {
									const userShares = getProfileUserShares(profile.id);
									const hasUserShares = userShares.length > 0;
									const isActive = currentProfile === profile.id;
									const isMenuOpen = openMenuId === profile.id;
									const canDelete = ownProfiles.length > 1 && !profile.isDefault;

									return (
										<div
											key={profile.id}
											className={`relative rounded-xl px-4 py-2.5 border cursor-pointer transition-all duration-300 flex flex-col justify-between gap-4 ${
												isActive
													? "bg-indigo-500/10 border-indigo-500/50 shadow-indigo-950/20"
													: "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
											}`}
											onClick={() => {
												onProfileSelect(profile.id);
												onClose();
											}}
										>
											<div className="pr-12">
												<h5 className="font-bold text-white text-sm truncate">
													{profile.name}
												</h5>
												<p className="text-xs text-neutral-400 mt-1">
													{formatUpdatedAt(profile.updatedAt)}
												</p>
												{profile.isDefault && (
													<span className="inline-flex mt-2.5 mr-2 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 tracking-wider">
														Default
													</span>
												)}
												{hasUserShares && (
													<span className="inline-flex mt-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 tracking-wider">
														Shared {hasUserShares && `(${userShares.length} users)`}
													</span>
												)}
											</div>

											{/* 3-dot menu */}
											<div
												className="absolute top-3 right-3"
												ref={isMenuOpen ? menuRef : undefined}
											>
												<button
													className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:bg-white/10 hover:text-white transition-all duration-200"
													onClick={(e) => {
														e.stopPropagation();
														setOpenMenuId(isMenuOpen ? null : profile.id);
													}}
													disabled={isLoading}
													title="More options"
												>
													<MoreVertical className="w-4 h-4" />
												</button>

												{isMenuOpen && (
													<div
														className="absolute right-0 top-9 z-50 w-44 rounded-xl border border-white/10 bg-neutral-900 shadow-xl py-1 overflow-hidden"
														onClick={(e) => e.stopPropagation()}
													>
														<button
															className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-neutral-200 hover:bg-white/8 transition-colors"
															onClick={() => {
																setOpenMenuId(null);
																setProfileToRename({
																	id: profile.id,
																	name: profile.name,
																});
															}}
														>
															<Pencil className="w-3.5 h-3.5 text-neutral-400" />
															Rename
														</button>
														<button
															className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-neutral-200 hover:bg-white/8 transition-colors"
															onClick={() => {
																setOpenMenuId(null);
																onShareProfile?.(profile.id);
															}}
														>
															<Share2 className="w-3.5 h-3.5 text-neutral-400" />
															Share
														</button>
														{canDelete && (
															<>
																<div className="my-1 border-t border-white/8" />
																<button
																	className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
																	onClick={() => {
																		setOpenMenuId(null);
																		setProfileToDelete({
																			id: profile.id,
																			name: profile.name,
																		});
																		setShowConfirmModal(true);
																	}}
																>
																	<Trash2 className="w-3.5 h-3.5" />
																	Delete
																</button>
															</>
														)}
													</div>
												)}
											</div>
										</div>
									);
								})}

								{/* Add Profile Card */}
								<div
									className="rounded-xl px-4 py-3 border-2 border-dashed border-white/10 hover:border-indigo-500/50 hover:bg-indigo-500/5 cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-2 max-h-[90px]"
									onClick={() => setShowCreateModal(true)}
								>
									<Plus className="w-6 h-6 text-neutral-400" />
									<span className="text-xs font-bold text-neutral-400">Add Workspace Profile</span>
								</div>
							</div>
						</div>

						{/* Shared With Me Profiles */}
						{sharedWithMeProfiles.length > 0 && (
							<div className="space-y-4 pt-4 border-t border-white/5">
								<h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
									Shared With Me
								</h4>
								<div className="grid grid-cols-1 gap-3">
									{sharedWithMeProfiles.map((profile) => {
										const isActive = currentProfile === profile.id;

										return (
											<div
												key={`shared-${profile.id}`}
												className={`relative rounded-xl px-4 py-2.5 border cursor-pointer transition-all duration-300 flex flex-col justify-between gap-4 border-l-4 border-l-indigo-500 ${
													isActive
														? "bg-indigo-500/10 border-indigo-500/50 shadow-indigo-950/20"
														: "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
												}`}
												onClick={() => {
													onProfileSelect(profile.id);
													onClose();
												}}
											>
												<div className="pr-12">
													<h5 className="font-bold text-white text-sm truncate">
														{profile.name}
													</h5>
													<p className="text-xs text-neutral-400 mt-1">
														{formatUpdatedAt(profile.updatedAt)}
													</p>
													<div className="flex flex-col gap-1.5 mt-3">
														<span
															className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase border tracking-wider self-start ${
																profile.permission === "read"
																	? "bg-blue-500/10 text-blue-400 border-blue-500/20"
																	: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
															}`}
														>
															{profile.permission === "read" ? (
																<span className="flex items-center gap-1">
																	<Eye className="w-3 h-3" />
																	Read Only
																</span>
															) : (
																<span className="flex items-center gap-1">
																	<Pencil className="w-3 h-3" />
																	Edit Access
																</span>
															)}
														</span>
													</div>
												</div>

												{/* Copy action for read-only shared profiles */}
												{profile.permission === "read" && (
													<div className="absolute top-4 right-4">
														<button
															className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all duration-200"
															onClick={(e) =>
																handleCopyProfile(
																	profile.shareId || "",
																	profile.name,
																	e
																)
															}
															title="Copy to my account"
															disabled={isLoading}
														>
															<Copy className="w-4 h-4" />
														</button>
													</div>
												)}
											</div>
										);
									})}
								</div>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Create Profile Modal */}
			<InputModal
				isOpen={showCreateModal}
				onClose={() => setShowCreateModal(false)}
				onConfirm={(name) => {
					onCreateProfile(name);
					setShowCreateModal(false);
					onClose();
				}}
				title="Create New Profile"
				placeholder="Enter profile name"
				confirmText="Create"
			/>

			{/* Rename Profile Modal */}
			<InputModal
				isOpen={!!profileToRename}
				onClose={() => setProfileToRename(null)}
				onConfirm={(name) => {
					if (profileToRename) {
						onRenameProfile?.(profileToRename.id, name);
					}
					setProfileToRename(null);
				}}
				title="Rename Profile"
				placeholder="Enter new name"
				initialValue={profileToRename?.name ?? ""}
				confirmText="Rename"
			/>

			{/* Delete Confirm Modal */}
			<ConfirmModal
				isOpen={showConfirmModal}
				onClose={() => {
					setShowConfirmModal(false);
					setProfileToDelete(null);
				}}
				onConfirm={() => {
					if (profileToDelete) {
						onDeleteProfile(profileToDelete.id);
						setProfileToDelete(null);
					}
					setShowConfirmModal(false);
				}}
				title="Delete Profile"
				message={`Are you sure you want to delete "${profileToDelete?.name}"? This action cannot be undone.`}
				confirmText="Delete"
				type="danger"
			/>
		</>
	);
};

export default ProfileDrawer;
