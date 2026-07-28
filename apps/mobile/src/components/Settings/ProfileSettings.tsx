import { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { UserCog, Pencil, Share2, Trash2, Eye, EyeOff, Info } from "lucide-react-native";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";
import { useAuth } from "@/contexts/AuthContext";
import { useGpaData } from "@/contexts/GpaDataContext";
import { useMessage } from "@/contexts/MessageContext";
import { LeaderboardService } from "@/firebase/services";
import { db } from "@/firebase/config";
import InputModal from "@/components/ui/InputModal";
import ShareModal from "@/components/profile/ShareModal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import type { ShareItem } from "@bhemu/shared";

export default function ProfileSettings() {
	const { currentUser } = useAuth();
	const { currentProfile, profiles, renameProfile, deleteProfile, shareProfileWithUser, mySharedProfiles } =
		useGpaData();
	const { showMessage } = useMessage();

	const [showRename, setShowRename] = useState(false);
	const [showShare, setShowShare] = useState(false);
	const [showDelete, setShowDelete] = useState(false);

	const [optOut, setOptOut] = useState(false);
	const [leaderboardLoaded, setLeaderboardLoaded] = useState(false);
	const [saving, setSaving] = useState(false);

	const isOwnProfile = !currentProfile?.isShared;
	const isEligible = !!currentProfile?.umsVerified && isOwnProfile;
	const canDelete = isOwnProfile && profiles.length > 1 && !currentProfile?.isDefault;

	const currentShares = (mySharedProfiles as (ShareItem & { profileId: string | number })[]).filter(
		(s) => s.profileId === currentProfile?.id && s.isActive
	);

	// Close modals when profile changes
	const prevProfileId = useRef(currentProfile?.id);
	if (prevProfileId.current !== currentProfile?.id) {
		prevProfileId.current = currentProfile?.id;
		if (showRename) setShowRename(false);
		if (showShare) setShowShare(false);
		if (showDelete) setShowDelete(false);
	}

	// Load leaderboard opt-out state
	useEffect(() => {
		if (!currentUser || !currentProfile || !isEligible) return;
		let cancelled = false;
		setLeaderboardLoaded(false);
		LeaderboardService.getUserEntry(db, currentUser.uid, String(currentProfile.id))
			.then((entry) => {
				if (!cancelled) setOptOut(!!entry?.optOut);
			})
			.finally(() => {
				if (!cancelled) setLeaderboardLoaded(true);
			});
		return () => {
			cancelled = true;
		};
	}, [currentUser, currentProfile, isEligible]);

	const handleRename = async (newName: string) => {
		if (!currentProfile) return;
		setShowRename(false);
		await renameProfile(currentProfile.id, newName);
		showMessage("Profile renamed", "success");
	};

	const handleDelete = async () => {
		if (!currentProfile) return;
		setShowDelete(false);
		await deleteProfile(currentProfile.id);
	};

	const handleShareWithUser = async (emailOrAction: string, permission: string, action?: string) => {
		if (!currentProfile) return;
		await shareProfileWithUser(currentProfile, emailOrAction, permission as "read" | "edit" | "unshare", action);
	};

	const handleLeaderboardToggle = async () => {
		if (!currentUser || !currentProfile || saving || !leaderboardLoaded) return;
		setSaving(true);
		try {
			const next = !optOut;
			await LeaderboardService.setOptOut(db, currentUser.uid, String(currentProfile.id), next);
			setOptOut(next);
			showMessage(next ? "Hidden from leaderboard" : "Visible on leaderboard", "success");
		} catch {
			showMessage("Failed to update leaderboard visibility", "error");
		} finally {
			setSaving(false);
		}
	};

	if (!currentProfile) return null;

	return (
		<>
			<View style={local.card}>
				{/* Header */}
				<View style={local.header}>
					<View style={local.headerIcon}>
						<UserCog size={15} color={Colors.indigo} />
					</View>
					<View style={local.headerText}>
						<Text style={local.headerTitle}>Profile Settings</Text>
						<Text style={local.headerSub} numberOfLines={1}>
							Manage <Text style={local.profileName}>{currentProfile.name}</Text>
						</Text>
					</View>
				</View>

				<View style={local.divider} />

				{/* Shared profile notice */}
				{!isOwnProfile ? (
					<View style={local.notice}>
						<Info size={13} color={Colors.textSubtle} />
						<Text style={local.noticeText}>
							Profile management is only available for your own profiles. This profile is shared with you.
						</Text>
					</View>
				) : (
					<>
						{/* Rename */}
						<View style={local.row}>
							<View style={local.rowLeft}>
								<Pencil size={14} color={Colors.textSubtle} />
								<View style={local.rowContent}>
									<Text style={local.rowTitle}>
										Profile Name
										{isEligible && <Text style={local.rowTitleNote}> · Leaderboard name</Text>}
									</Text>
									<Text style={local.rowSub} numberOfLines={1}>
										{currentProfile.name}
									</Text>
								</View>
							</View>
							<TouchableOpacity
								style={local.actionBtn}
								onPress={() => setShowRename(true)}
								activeOpacity={0.7}
							>
								<Text style={local.actionBtnText}>Rename</Text>
							</TouchableOpacity>
						</View>

						<View style={local.rowDivider} />

						{/* Share */}
						<View style={local.row}>
							<View style={local.rowLeft}>
								<Share2 size={14} color={Colors.textSubtle} />
								<View style={local.rowContent}>
									<Text style={local.rowTitle}>Share Profile</Text>
									<Text style={local.rowSub}>
										{currentShares.length > 0
											? `Shared with ${currentShares.length} user${currentShares.length > 1 ? "s" : ""}`
											: "Not shared with anyone"}
									</Text>
								</View>
							</View>
							<TouchableOpacity
								style={local.actionBtn}
								onPress={() => setShowShare(true)}
								activeOpacity={0.7}
							>
								<Text style={local.actionBtnText}>Share</Text>
							</TouchableOpacity>
						</View>

						{/* Delete */}
						{canDelete && (
							<>
								<View style={local.rowDivider} />
								<View style={local.row}>
									<View style={local.rowLeft}>
										<Trash2 size={14} color={Colors.destructive} style={{ opacity: 0.9 }} />
										<View style={local.rowContent}>
											<Text style={local.rowTitle}>Delete Profile</Text>
											<Text style={local.rowSub}>
												Permanently remove this profile and all data
											</Text>
										</View>
									</View>
									<TouchableOpacity
										style={local.deleteBtn}
										onPress={() => setShowDelete(true)}
										activeOpacity={0.7}
									>
										<Text style={local.deleteBtnText}>Delete</Text>
									</TouchableOpacity>
								</View>
							</>
						)}

						{/* Leaderboard visibility */}
						{isEligible && (
							<>
								<View style={local.rowDivider} />
								<View style={local.row}>
									<View style={local.rowLeft}>
										{optOut ? (
											<EyeOff size={14} color={Colors.textSubtle} />
										) : (
											<Eye size={14} color={Colors.primary} />
										)}
										<View style={local.rowContent}>
											<Text style={local.rowTitle}>
												{optOut ? "Hidden from leaderboard" : "Visible on leaderboard"}
											</Text>
											<Text style={local.rowSub}>
												{optOut
													? "Your rank is not shown to others"
													: "Other students can see your rank"}
											</Text>
										</View>
									</View>
									{!leaderboardLoaded ? (
										<ActivityIndicator size="small" color={Colors.textSubtle} />
									) : (
										<TouchableOpacity
											onPress={handleLeaderboardToggle}
											activeOpacity={0.8}
											disabled={saving}
											style={[local.toggle, !optOut && local.toggleOn]}
										>
											{saving ? (
												<ActivityIndicator
													size="small"
													color={Colors.textPrimary}
													style={local.toggleThumb}
												/>
											) : (
												<View style={[local.toggleThumb, !optOut && local.toggleThumbOn]} />
											)}
										</TouchableOpacity>
									)}
								</View>
							</>
						)}
					</>
				)}
			</View>

			<InputModal
				isOpen={showRename}
				onClose={() => setShowRename(false)}
				onConfirm={handleRename}
				title="Rename Profile"
				placeholder="Enter new profile name"
				initialValue={currentProfile.name}
				confirmText="Rename"
			/>

			<ShareModal
				visible={showShare}
				onClose={() => setShowShare(false)}
				onShareWithUser={handleShareWithUser}
				profileName={currentProfile.name}
				currentShares={currentShares}
			/>

			<ConfirmModal
				isOpen={showDelete}
				onClose={() => setShowDelete(false)}
				onConfirm={handleDelete}
				title="Delete Profile"
				message={`Delete "${currentProfile.name}"? This will permanently remove all semesters, marks, and attendance data.`}
				confirmText="Delete Profile"
				type="danger"
			/>
		</>
	);
}

const local = StyleSheet.create({
	card: {
		backgroundColor: Colors.surface,
		borderRadius: Radius.xl,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: "rgba(255,255,255,0.08)",
		overflow: "hidden",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.md,
		padding: Spacing.lg,
	},
	headerIcon: {
		width: 32,
		height: 32,
		borderRadius: 10,
		backgroundColor: "rgba(129,140,248,0.1)",
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: "rgba(129,140,248,0.2)",
		alignItems: "center",
		justifyContent: "center",
	},
	headerText: {
		flex: 1,
		gap: 2,
	},
	headerTitle: {
		fontSize: FontSize.base,
		fontWeight: FontWeight.semibold,
		color: Colors.textPrimary,
	},
	headerSub: {
		fontSize: FontSize.xs,
		color: Colors.textSubtle,
	},
	profileName: {
		color: "rgba(255,255,255,0.75)",
		fontWeight: FontWeight.medium,
	},
	divider: {
		height: StyleSheet.hairlineWidth,
		backgroundColor: "rgba(255,255,255,0.06)",
	},
	notice: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: Spacing.sm,
		margin: Spacing.md,
		padding: Spacing.md,
		borderRadius: Radius.lg,
		backgroundColor: "rgba(255,255,255,0.03)",
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: "rgba(255,255,255,0.07)",
	},
	noticeText: {
		flex: 1,
		fontSize: FontSize.xs,
		color: Colors.textSubtle,
		lineHeight: 16,
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.md,
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.md,
	},
	rowLeft: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.md,
	},
	rowContent: {
		flex: 1,
		gap: 2,
	},
	rowTitle: {
		fontSize: FontSize.sm,
		fontWeight: FontWeight.medium,
		color: Colors.textPrimary,
	},
	rowTitleNote: {
		fontSize: FontSize.xs,
		fontWeight: FontWeight.regular,
		color: Colors.primary,
	},
	rowSub: {
		fontSize: FontSize.xs,
		color: Colors.textSubtle,
	},
	rowDivider: {
		height: StyleSheet.hairlineWidth,
		backgroundColor: "rgba(255,255,255,0.04)",
		marginHorizontal: Spacing.lg,
	},
	actionBtn: {
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.xs + 2,
		borderRadius: Radius.md,
		backgroundColor: "rgba(255,255,255,0.07)",
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: "rgba(255,255,255,0.1)",
	},
	actionBtnText: {
		fontSize: FontSize.xs,
		fontWeight: FontWeight.medium,
		color: Colors.textPrimary,
	},
	deleteBtn: {
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.xs + 2,
		borderRadius: Radius.md,
		backgroundColor: "rgba(239,68,68,0.1)",
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: "rgba(239,68,68,0.2)",
	},
	deleteBtnText: {
		fontSize: FontSize.xs,
		fontWeight: FontWeight.medium,
		color: Colors.destructive,
	},
	toggle: {
		width: 44,
		height: 24,
		borderRadius: 12,
		backgroundColor: "rgba(255,255,255,0.12)",
		justifyContent: "center",
		paddingHorizontal: 2,
	},
	toggleOn: {
		backgroundColor: Colors.primary,
	},
	toggleThumb: {
		width: 20,
		height: 20,
		borderRadius: 10,
		backgroundColor: Colors.textPrimary,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.3,
		shadowRadius: 2,
		elevation: 2,
	},
	toggleThumbOn: {
		alignSelf: "flex-end",
	},
});
