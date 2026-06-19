"use client";

import React, { useState, useEffect } from "react";
import {
	Share2,
	Copy,
	Pencil,
	Ban,
	Eye,
	Download,
	X,
	Plus,
} from "lucide-react";
import ConfirmModal from "@/components/modal/ConfirmModal";
import InputModal from "@/components/modal/InputModal";
import UMSFetchModal from "@/components/modal/UMSFetchModal";
import { GPASemester } from "@/types";

interface ProfileInfo {
	id: string | number;
	name: string;
	semesters?: unknown[];
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
	onUnshareProfile?: (shareId: string) => Promise<void>;
	onCopySharedProfile?: (shareId: string, profileName: string) => Promise<void>;
	onVerifyUMS?: (
		profileId: string | number,
		umsData: { semesters: GPASemester[]; studentInfo: unknown; allTermIds: unknown; fetchedAt?: string }
	) => void;
	sharedProfiles?: unknown[];
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
	onUnshareProfile,
	onCopySharedProfile,
	onVerifyUMS,
	sharedProfiles = [],
	mySharedProfiles = [],
	isLoading = false,
	currentUser,
}) => {
	const typedSharedProfiles = (sharedProfiles || []) as SharedStatusItem[];
	const typedMySharedProfiles = (mySharedProfiles || []) as SharedStatusItem[];

	const [showInputModal, setShowInputModal] = useState(false);
	const [showConfirmModal, setShowConfirmModal] = useState(false);
	const [profileToDelete, setProfileToDelete] = useState<{ id: string | number; name: string } | null>(null);
	const [showUMSModal, setShowUMSModal] = useState(false);
	const [profileToVerify, setProfileToVerify] = useState<ProfileInfo | null>(null);

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

	const handleCreateProfile = () => {
		setShowInputModal(true);
	};

	const handleProfileNameSubmit = (name: string) => {
		onCreateProfile(name);
		setShowInputModal(false);
		onClose();
	};

	const handleDeleteProfile = (profileId: string | number, profileName: string) => {
		setProfileToDelete({ id: profileId, name: profileName });
		setShowConfirmModal(true);
	};

	const handleConfirmDelete = () => {
		if (profileToDelete) {
			onDeleteProfile(profileToDelete.id);
			setProfileToDelete(null);
		}
		setShowConfirmModal(false);
	};

	const handleShareProfile = (profileId: string | number, event: React.MouseEvent<HTMLButtonElement>) => {
		event.stopPropagation();
		if (onShareProfile) {
			onShareProfile(profileId);
		}
	};

	const handleUnshareProfile = async (shareId: string, event: React.MouseEvent<HTMLButtonElement>) => {
		event.stopPropagation();
		if (onUnshareProfile) {
			await onUnshareProfile(shareId);
		}
	};

	const handleCopyProfile = async (shareId: string, profileName: string, event: React.MouseEvent<HTMLButtonElement>) => {
		event.stopPropagation();
		if (onCopySharedProfile) {
			await onCopySharedProfile(shareId, profileName);
		}
	};

	const handleVerifyUMS = (profileId: string | number, event: React.MouseEvent<HTMLButtonElement>) => {
		event.stopPropagation();
		const profile = profiles.find((p) => p.id === profileId);
		if (profile) {
			setProfileToVerify(profile);
			setShowUMSModal(true);
		}
	};

	const handleUMSConfirm = (umsData: { semesters: GPASemester[]; studentInfo: unknown; allTermIds: unknown; fetchedAt?: string }) => {
		if (onVerifyUMS && profileToVerify) {
			onVerifyUMS(profileToVerify.id, umsData);
			setProfileToVerify(null);
		}
		setShowUMSModal(false);
	};

	const getProfileSharedStatus = (profileId: string | number) => {
		return typedSharedProfiles?.find((shared) => shared.profileId === profileId);
	};

	const getProfileUserShares = (profileId: string | number) => {
		return typedMySharedProfiles?.filter((share) => share.profileId === profileId && share.isActive) || [];
	};

	const ownProfiles = profiles.filter((p) => {
		return !p.isShared || (currentUser && p.ownerUserId === currentUser.uid);
	}).sort((a, b) => {
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
				className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-end sm:items-center justify-center sm:justify-end animate-in fade-in duration-300"
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
								My Academic Workspaces
							</h4>
							<div className="grid grid-cols-1 gap-3">
								{ownProfiles.map((profile) => {
									const sharedStatus = getProfileSharedStatus(profile.id);
									const userShares = getProfileUserShares(profile.id);
									const hasUserShares = userShares.length > 0;
									const isActive = currentProfile === profile.id;

									return (
										<div
											key={profile.id}
											className={`relative rounded-2xl p-5 border cursor-pointer transition-all duration-300 flex flex-col justify-between gap-4 ${
												isActive
													? "bg-indigo-500/10 border-indigo-500/50 shadow-indigo-950/20"
													: "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
											}`}
											onClick={() => {
												onProfileSelect(profile.id);
												onClose();
											}}
										>
											<div className="pr-20">
												<h5 className="font-bold text-white text-sm truncate">
													{profile.name}
												</h5>
												<p className="text-xs text-neutral-400 mt-1 font-semibold">
													{profile.semesters?.length || 0} semester
													{(profile.semesters?.length || 0) !== 1 ? "s" : ""}
												</p>
												{profile.isDefault && (
													<span className="inline-flex mt-2.5 mr-2 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 tracking-wider">
														Default
													</span>
												)}
												{(sharedStatus || hasUserShares) && (
													<span className="inline-flex mt-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 tracking-wider">
														Shared {hasUserShares && `(${userShares.length} users)`}
													</span>
												)}
											</div>

											{/* Quick Actions */}
											<div className="absolute top-4 right-4 flex gap-1">
												<button
													className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-all duration-200"
													onClick={(e) => handleVerifyUMS(profile.id, e)}
													title="Import data from UMS"
													disabled={isLoading}
												>
													<Download className="w-4 h-4" />
												</button>
												<button
													className="w-8 h-8 rounded-lg flex items-center justify-center bg-teal-500/10 border border-teal-500/20 text-teal-400 hover:bg-teal-500/20 transition-all duration-200"
													onClick={(e) => handleShareProfile(profile.id, e)}
													title="Share with users"
													disabled={isLoading}
												>
													<Share2 className="w-4 h-4" />
												</button>
												{ownProfiles.length > 1 && !profile.isShared && (
													<button
														className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all duration-200"
														onClick={(e) => {
															e.stopPropagation();
															handleDeleteProfile(profile.id, profile.name);
														}}
														title="Delete profile"
													>
														<X className="w-4 h-4" />
													</button>
												)}
											</div>
										</div>
									);
								})}

								{/* Add Profile Card */}
								<div
									className="rounded-2xl p-5 border-2 border-dashed border-white/10 hover:border-indigo-500/50 hover:bg-indigo-500/5 cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-2 min-h-[90px]"
									onClick={handleCreateProfile}
								>
									<Plus className="w-6 h-6 text-neutral-400" />
									<span className="text-xs font-bold text-neutral-400">Add Workspace Profile</span>
								</div>
							</div>
						</div>

						{/* Shared With Me Profiles */}
						{sharedWithMeProfiles.length > 0 && (
							<div className="space-y-4 pt-6 border-t border-white/5">
								<h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
									Shared With Me
								</h4>
								<div className="grid grid-cols-1 gap-3">
									{sharedWithMeProfiles.map((profile) => {
										const isActive = currentProfile === profile.id;

										return (
											<div
												key={`shared-${profile.id}`}
												className={`relative rounded-2xl p-5 border cursor-pointer transition-all duration-300 flex flex-col justify-between gap-4 border-l-4 border-l-indigo-500 ${
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
													<p className="text-xs text-neutral-400 mt-1 font-semibold">
														{profile.semesters?.length || 0} semester
														{(profile.semesters?.length || 0) !== 1 ? "s" : ""}
													</p>
													<div className="flex flex-col gap-1.5 mt-3">
														<span className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase border tracking-wider self-start ${
															profile.permission === "read"
																? "bg-blue-500/10 text-blue-400 border-blue-500/20"
																: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
														}`}>
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
														<span className="text-[10px] text-neutral-500 font-semibold">
															Shared by {profile.ownerEmail || "another user"}
														</span>
													</div>
												</div>

												{/* Quick Actions */}
												{profile.permission === "read" && (
													<div className="absolute top-4 right-4">
														<button
															className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all duration-200"
															onClick={(e) =>
																handleCopyProfile(profile.shareId || "", profile.name, e)
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

						{/* Shared Profiles List Section */}
						{typedSharedProfiles && typedSharedProfiles.length > 0 && (
							<div className="space-y-4 pt-6 border-t border-white/5">
								<h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
									Outgoing Shares
								</h4>
								<div className="space-y-3">
									{typedSharedProfiles.map((shared) => (
										<div
											key={shared.shareId}
											className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl transition-all duration-300 hover:bg-white/10 hover:border-white/10"
										>
											<div className="flex-1 pr-4 min-w-0">
												<h5 className="font-bold text-white text-xs truncate">
													{shared.profileName}
												</h5>
												<p className="text-[10px] text-neutral-400 mt-1 font-semibold truncate">
													Shared with {shared.targetUserEmail} •{" "}
													<span className={shared.permission === "read" ? "text-blue-400" : "text-emerald-400"}>
														{shared.permission === "read" ? "Read Only" : "Edit Access"}
													</span>
												</p>
											</div>
											<button
												className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all duration-200 flex-shrink-0"
												onClick={(e) => handleUnshareProfile(shared.shareId, e)}
												title="Unshare profile"
												disabled={isLoading}
											>
												<Ban className="w-4 h-4" />
											</button>
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Sub-modals for workspace controls */}
			<InputModal
				isOpen={showInputModal}
				onClose={() => setShowInputModal(false)}
				onConfirm={handleProfileNameSubmit}
				title="Create New Profile"
				placeholder="Enter profile name"
				confirmText="Create"
			/>

			<ConfirmModal
				isOpen={showConfirmModal}
				onClose={() => {
					setShowConfirmModal(false);
					setProfileToDelete(null);
				}}
				onConfirm={handleConfirmDelete}
				title="Delete Profile"
				message={`Are you sure you want to delete "${profileToDelete?.name}"? This action cannot be undone.`}
				confirmText="Delete"
				type="danger"
			/>

			<UMSFetchModal
				isOpen={showUMSModal}
				onClose={() => {
					setShowUMSModal(false);
					setProfileToVerify(null);
				}}
				onConfirm={handleUMSConfirm}
				existingData={profileToVerify?.semesters && profileToVerify.semesters.length > 0 ? profileToVerify : null}
				profileName={profileToVerify?.name || ""}
			/>
		</>
	);
};

export default ProfileDrawer;
