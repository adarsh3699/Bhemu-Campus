import { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { UserCog, Pencil, Share2, Eye, EyeOff, Info } from "lucide-react-native";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";
import { useAuth } from "@/contexts/AuthContext";
import { useGpaProfiles } from "@/contexts/GpaDataContext";
import { useMessage } from "@/contexts/MessageContext";
import { LeaderboardService } from "@/firebase/services";
import { db } from "@/firebase/config";
import InputModal from "@/components/ui/InputModal";
import ShareModal from "@/components/profile/ShareModal";
import { SettingsCard, SettingsDivider, SettingsHeader } from "@/components/Settings/SettingsPrimitives";
import type { ShareItem } from "@bhemu/shared";

export default function ProfileSettings() {
	const { currentUser } = useAuth();
	const { currentProfile, renameProfile, shareProfileWithUser, mySharedProfiles } = useGpaProfiles();
	const { showMessage } = useMessage();

	const [showRename, setShowRename] = useState(false);
	const [showShare, setShowShare] = useState(false);

	const [optOut, setOptOut] = useState(false);
	const [leaderboardLoaded, setLeaderboardLoaded] = useState(false);
	const [saving, setSaving] = useState(false);

	const isOwnProfile = !currentProfile?.isShared;
	const isEligible = !!currentProfile?.umsVerified && isOwnProfile;

	const currentShares = (mySharedProfiles as (ShareItem & { profileId: string | number })[]).filter(
		(s) => s.profileId === currentProfile?.id && s.isActive
	);

	// Close modals when profile changes
	const prevProfileId = useRef(currentProfile?.id);
	if (prevProfileId.current !== currentProfile?.id) {
		prevProfileId.current = currentProfile?.id;
		if (showRename) setShowRename(false);
		if (showShare) setShowShare(false);
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
		} catch {
			showMessage("Failed to update leaderboard visibility", "error");
		} finally {
			setSaving(false);
		}
	};

	if (!currentProfile) return null;

	return (
		<>
			<SettingsCard>
				<SettingsHeader
					icon={<UserCog size={19} color={Colors.indigo} />}
					title="Profile Settings"
					subtitle={`Manage ${currentProfile.name}`}
					tone="indigo"
				/>

				<SettingsDivider />

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
								<View style={local.rowIcon}>
									<Pencil size={16} color={Colors.textSubtle} />
								</View>
								<View style={local.rowContent}>
									<Text style={local.rowTitle}>
										Profile Name
										{isEligible && <Text style={local.rowTitleNote}> · Leaderboard</Text>}
									</Text>
									<Text style={local.rowSub} numberOfLines={1}>
										{currentProfile.name}
									</Text>
								</View>
							</View>
							<Pressable
								style={({ pressed }) => [local.actionBtn, pressed && local.pressed]}
								onPress={() => setShowRename(true)}
								accessibilityRole="button"
								accessibilityLabel="Rename profile"
							>
								<Text style={local.actionBtnText}>Rename</Text>
							</Pressable>
						</View>

						<View style={local.rowDivider} />

						{/* Share */}
						<View style={local.row}>
							<View style={local.rowLeft}>
								<View style={local.rowIcon}>
									<Share2 size={16} color={Colors.textSubtle} />
								</View>
								<View style={local.rowContent}>
									<Text style={local.rowTitle}>Share Profile</Text>
									<Text style={local.rowSub}>
										{currentShares.length > 0
											? `Shared with ${currentShares.length} user${currentShares.length > 1 ? "s" : ""}`
											: "Not shared with anyone"}
									</Text>
								</View>
							</View>
							<Pressable
								style={({ pressed }) => [local.actionBtn, pressed && local.pressed]}
								onPress={() => setShowShare(true)}
								accessibilityRole="button"
								accessibilityLabel="Share profile"
							>
								<Text style={local.actionBtnText}>Share</Text>
							</Pressable>
						</View>

						{/* Leaderboard visibility */}
						{isEligible && (
							<>
								<View style={local.rowDivider} />
								<View style={local.row}>
									<View style={local.rowLeft}>
										<View style={local.rowIcon}>
											{optOut ? (
												<EyeOff size={16} color={Colors.textSubtle} />
											) : (
												<Eye size={16} color={Colors.primary} />
											)}
										</View>
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
										<Pressable
											onPress={handleLeaderboardToggle}
											style={({ pressed }) => [
												local.toggle,
												!optOut && local.toggleOn,
												pressed && local.pressed,
											]}
											disabled={saving}
											accessibilityRole="switch"
											accessibilityLabel="Leaderboard visibility"
											accessibilityState={{ checked: !optOut, disabled: saving }}
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
										</Pressable>
									)}
								</View>
							</>
						)}
					</>
				)}
			</SettingsCard>

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
		</>
	);
}

const local = StyleSheet.create({
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
		minHeight: 72,
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.md,
		paddingHorizontal: Spacing.xl,
		paddingVertical: Spacing.sm,
	},
	rowLeft: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.md,
	},
	rowIcon: {
		width: 32,
		alignItems: "center",
		justifyContent: "center",
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
		backgroundColor: Colors.border,
		marginHorizontal: Spacing.xl,
	},
	actionBtn: {
		minWidth: 64,
		minHeight: 44,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: Spacing.sm,
		borderRadius: Radius.md,
		borderCurve: "continuous",
	},
	actionBtnText: {
		fontSize: FontSize.xs,
		fontWeight: FontWeight.semibold,
		color: Colors.primary,
	},
	toggle: {
		width: 44,
		height: 24,
		borderRadius: 12,
		backgroundColor: "rgba(255,255,255,0.12)",
		justifyContent: "center",
		paddingHorizontal: 2,
	},
	pressed: { opacity: 0.78 },
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
