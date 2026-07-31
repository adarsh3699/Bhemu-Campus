import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from "react-native";
import { Check, Plus, Share2, Trash2, Pencil, Copy, MoreVertical } from "lucide-react-native";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";
import { useAuth } from "@/contexts/AuthContext";
import { useGpaProfiles } from "@/contexts/GpaDataContext";
import ConfirmModal from "@/components/ui/ConfirmModal";
import InputModal from "@/components/ui/InputModal";
import type { ShareData } from "@bhemu/firebase";

interface Props {
	visible: boolean;
	onClose: () => void;
	onShareProfile?: (profileId: string | number) => void;
}

interface MenuTarget {
	id: string | number;
	name: string;
	canDelete: boolean;
}

// Deterministic color per profile name
const AVATAR_COLORS = [
	{ bg: "rgba(94,106,210,0.2)", text: "#818CF8" },
	{ bg: "rgba(16,185,129,0.2)", text: "#34D399" },
	{ bg: "rgba(3,152,172,0.2)", text: "#22D3EE" },
	{ bg: "rgba(245,158,11,0.2)", text: "#FBBF24" },
	{ bg: "rgba(239,68,68,0.2)", text: "#F87171" },
	{ bg: "rgba(168,85,247,0.2)", text: "#C084FC" },
];

function avatarColor(name: string) {
	let hash = 0;
	for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
	return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string) {
	const parts = name.trim().split(/\s+/);
	if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
	return name.slice(0, 2).toUpperCase();
}

function formatUpdatedAt(updatedAt: unknown) {
	if (!updatedAt) return null;
	const ts = updatedAt as { toMillis?: () => number };
	const ms = ts.toMillis ? ts.toMillis() : Number(updatedAt);
	if (!ms || isNaN(ms)) return null;
	return new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function ProfileDrawer({ visible, onClose, onShareProfile }: Props) {
	const { currentUser } = useAuth();
	const {
		allProfiles,
		activeProfile,
		updateActiveProfile,
		createProfile,
		deleteProfile,
		renameProfile,
		copySharedProfile,
		mySharedProfiles,
		sharedWithMeShareIds,
	} = useGpaProfiles();

	const [showCreateModal, setShowCreateModal] = useState(false);
	const [profileToDelete, setProfileToDelete] = useState<{ id: string | number; name: string } | null>(null);
	const [profileToRename, setProfileToRename] = useState<{ id: string | number; name: string } | null>(null);
	const [menuTarget, setMenuTarget] = useState<MenuTarget | null>(null);

	const ownProfiles = allProfiles
		.filter((p) => !p.isShared || (currentUser && p.ownerUserId === currentUser.uid))
		.sort((a, b) => {
			if (a.isDefault && !b.isDefault) return -1;
			if (!a.isDefault && b.isDefault) return 1;
			return (a.name || "").localeCompare(b.name || "");
		});

	const sharedWithMeProfiles = allProfiles.filter(
		(p) => !!p.isShared && (!p.ownerUserId || (currentUser && p.ownerUserId !== currentUser.uid))
	);

	const getShareCount = (profileId: string | number) =>
		(mySharedProfiles as ShareData[]).filter((s) => s.profileId === profileId && s.isActive).length;

	const handleSelect = (id: string | number) => {
		updateActiveProfile(id);
		onClose();
	};

	return (
		<>
			<Modal
				visible={visible}
				animationType="slide"
				transparent
				onRequestClose={onClose}
				presentationStyle="overFullScreen"
			>
				<View style={local.overlay}>
					<TouchableOpacity style={local.backdrop} onPress={onClose} activeOpacity={1} />
					<View style={local.sheet}>
						<View style={local.dragHandle} />

						{/* Header */}
						<View style={local.header}>
							<Text style={local.headerTitle}>Profiles</Text>
							<Text style={local.headerSub}>Switch or manage workspaces</Text>
						</View>

						<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={local.content}>
							{/* Own profiles */}
							<View style={local.section}>
								<Text style={local.sectionLabel}>MY PROFILES</Text>
								{ownProfiles.map((profile) => {
									const isActive = activeProfile === profile.id;
									const shareCount = getShareCount(profile.id);
									const canDelete = ownProfiles.length > 1 && !profile.isDefault;
									const av = avatarColor(profile.name || "?");
									const date = formatUpdatedAt(profile.updatedAt);

									return (
										<TouchableOpacity
											key={String(profile.id)}
											style={[local.card, isActive && local.cardActive]}
											onPress={() => handleSelect(profile.id)}
											activeOpacity={0.75}
										>
											{/* Avatar */}
											<View style={[local.avatar, { backgroundColor: av.bg }]}>
												<Text style={[local.avatarText, { color: av.text }]}>
													{initials(profile.name || "?")}
												</Text>
											</View>

											{/* Info */}
											<View style={local.cardInfo}>
												<Text
													style={[local.cardName, isActive && local.cardNameActive]}
													numberOfLines={1}
												>
													{profile.name}
												</Text>
												<View style={local.cardMeta}>
													{profile.isDefault && (
														<View style={local.pill}>
															<Text style={local.pillText}>Default</Text>
														</View>
													)}
													{shareCount > 0 && (
														<View style={[local.pill, local.pillGreen]}>
															<Text style={[local.pillText, local.pillTextGreen]}>
																Shared · {shareCount}
															</Text>
														</View>
													)}
													{date && <Text style={local.cardDate}>{date}</Text>}
												</View>
											</View>

											{/* Right: checkmark or menu */}
											{isActive ? (
												<View style={local.checkWrap}>
													<Check size={16} color={Colors.primary} />
												</View>
											) : (
												<TouchableOpacity
													style={local.menuBtn}
													onPress={() =>
														setMenuTarget({ id: profile.id, name: profile.name, canDelete })
													}
													hitSlop={12}
												>
													<MoreVertical size={16} color={Colors.textSubtle} />
												</TouchableOpacity>
											)}
										</TouchableOpacity>
									);
								})}

								{/* Add profile */}
								<TouchableOpacity
									style={local.addCard}
									onPress={() => setShowCreateModal(true)}
									activeOpacity={0.7}
								>
									<View style={local.addIcon}>
										<Plus size={18} color={Colors.primary} />
									</View>
									<Text style={local.addText}>New Profile</Text>
								</TouchableOpacity>
							</View>

							{/* Shared with me */}
							{sharedWithMeProfiles.length > 0 && (
								<View style={local.section}>
									<Text style={local.sectionLabel}>SHARED WITH ME</Text>
									{sharedWithMeProfiles.map((profile) => {
										const isActive = activeProfile === profile.id;
										const av = avatarColor(profile.ownerUserId || profile.name || "?");
										const isEdit = profile.permission === "edit";
										const date = formatUpdatedAt(profile.updatedAt);

										return (
											<TouchableOpacity
												key={`shared-${profile.id}`}
												style={[local.card, isActive && local.cardActive]}
												onPress={() => handleSelect(profile.id)}
												activeOpacity={0.75}
											>
												<View style={[local.avatar, { backgroundColor: av.bg }]}>
													<Text style={[local.avatarText, { color: av.text }]}>
														{initials(profile.name || "?")}
													</Text>
												</View>

												<View style={local.cardInfo}>
													<Text
														style={[local.cardName, isActive && local.cardNameActive]}
														numberOfLines={1}
													>
														{profile.name}
													</Text>
													<View style={local.cardMeta}>
														<View
															style={[
																local.pill,
																isEdit ? local.pillGreen : local.pillBlue,
															]}
														>
															<Text
																style={[
																	local.pillText,
																	isEdit ? local.pillTextGreen : local.pillTextBlue,
																]}
															>
																{isEdit ? "Can Edit" : "View Only"}
															</Text>
														</View>
														{date && <Text style={local.cardDate}>{date}</Text>}
													</View>
												</View>

												{isActive ? (
													<View style={local.checkWrap}>
														<Check size={16} color={Colors.primary} />
													</View>
												) : !isEdit ? (
													<TouchableOpacity
														style={local.copyBtn}
														onPress={() =>
															copySharedProfile(
																sharedWithMeShareIds[String(profile.id)] ??
																	String(profile.id),
																profile.name
															)
														}
														hitSlop={12}
													>
														<Copy size={15} color={Colors.blue} />
													</TouchableOpacity>
												) : null}
											</TouchableOpacity>
										);
									})}
								</View>
							)}
						</ScrollView>
					</View>
				</View>
			</Modal>

			{/* Action sheet */}
			<Modal
				visible={!!menuTarget}
				transparent
				animationType="slide"
				onRequestClose={() => setMenuTarget(null)}
				presentationStyle="overFullScreen"
			>
				<View style={local.menuOverlay}>
					<TouchableOpacity style={local.backdrop} onPress={() => setMenuTarget(null)} activeOpacity={1} />
					<View style={local.menuSheet}>
						<View style={local.dragHandle} />
						<Text style={local.menuTitle} numberOfLines={1}>
							{menuTarget?.name}
						</Text>

						<TouchableOpacity
							style={local.menuItem}
							activeOpacity={0.7}
							onPress={() => {
								const t = menuTarget;
								setMenuTarget(null);
								if (t) setProfileToRename({ id: t.id, name: t.name });
							}}
						>
							<View style={[local.menuIcon, { backgroundColor: "rgba(129,140,248,0.12)" }]}>
								<Pencil size={17} color={Colors.indigo} />
							</View>
							<Text style={local.menuItemText}>Rename</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={local.menuItem}
							activeOpacity={0.7}
							onPress={() => {
								const t = menuTarget;
								setMenuTarget(null);
								if (t) onShareProfile?.(t.id);
							}}
						>
							<View style={[local.menuIcon, { backgroundColor: "rgba(34,211,238,0.12)" }]}>
								<Share2 size={17} color="#22D3EE" />
							</View>
							<Text style={local.menuItemText}>Share</Text>
						</TouchableOpacity>

						{menuTarget?.canDelete && (
							<TouchableOpacity
								style={local.menuItem}
								activeOpacity={0.7}
								onPress={() => {
									const t = menuTarget;
									setMenuTarget(null);
									if (t) setProfileToDelete({ id: t.id, name: t.name });
								}}
							>
								<View style={[local.menuIcon, { backgroundColor: "rgba(239,68,68,0.12)" }]}>
									<Trash2 size={17} color={Colors.destructive} />
								</View>
								<Text style={[local.menuItemText, { color: Colors.destructive }]}>Delete</Text>
							</TouchableOpacity>
						)}
					</View>
				</View>
			</Modal>

			<InputModal
				isOpen={showCreateModal}
				onClose={() => setShowCreateModal(false)}
				onConfirm={(name) => {
					createProfile(name);
					setShowCreateModal(false);
				}}
				title="New Profile"
				placeholder="Profile name"
				confirmText="Create"
			/>
			<InputModal
				isOpen={!!profileToRename}
				onClose={() => setProfileToRename(null)}
				onConfirm={(name) => {
					if (profileToRename) renameProfile(profileToRename.id, name);
					setProfileToRename(null);
				}}
				title="Rename Profile"
				placeholder="New name"
				initialValue={profileToRename?.name ?? ""}
				confirmText="Rename"
			/>
			<ConfirmModal
				isOpen={!!profileToDelete}
				onClose={() => setProfileToDelete(null)}
				onConfirm={() => {
					if (profileToDelete) deleteProfile(profileToDelete.id);
					setProfileToDelete(null);
				}}
				title="Delete Profile"
				message={`Are you sure you want to delete "${profileToDelete?.name}"? This action cannot be undone.`}
				confirmText="Delete"
				type="danger"
			/>
		</>
	);
}

const local = StyleSheet.create({
	overlay: {
		flex: 1,
		justifyContent: "flex-end",
		backgroundColor: "rgba(0,0,0,0.6)",
	},
	backdrop: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
	},
	sheet: {
		backgroundColor: Colors.surface,
		borderTopLeftRadius: 28,
		borderTopRightRadius: 28,
		maxHeight: "84%",
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: "rgba(255,255,255,0.1)",
		borderBottomWidth: 0,
	},
	dragHandle: {
		width: 36,
		height: 4,
		borderRadius: 2,
		backgroundColor: "rgba(255,255,255,0.15)",
		alignSelf: "center",
		marginTop: Spacing.md,
	},
	header: {
		paddingHorizontal: Spacing.xl,
		paddingTop: Spacing.lg,
		paddingBottom: Spacing.md,
	},
	headerTitle: {
		fontSize: FontSize.xxl,
		fontWeight: FontWeight.bold,
		color: Colors.textPrimary,
	},
	headerSub: {
		fontSize: FontSize.sm,
		color: Colors.textSubtle,
		marginTop: 2,
	},
	content: {
		paddingHorizontal: Spacing.lg,
		paddingBottom: Spacing.xxxl,
		gap: Spacing.xl,
	},
	section: {
		gap: Spacing.sm,
	},
	sectionLabel: {
		fontSize: FontSize.xs,
		fontWeight: FontWeight.semibold,
		color: Colors.textSubtle,
		letterSpacing: 1.2,
		marginBottom: Spacing.xs,
		paddingHorizontal: Spacing.xs,
	},

	// Profile card
	card: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.md,
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.md,
		borderRadius: Radius.xl,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: "rgba(255,255,255,0.07)",
		backgroundColor: "rgba(255,255,255,0.04)",
	},
	cardActive: {
		backgroundColor: "rgba(3,152,172,0.08)",
		borderColor: "rgba(3,152,172,0.35)",
	},
	avatar: {
		width: 44,
		height: 44,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
	},
	avatarText: {
		fontSize: FontSize.base,
		fontWeight: FontWeight.bold,
	},
	cardInfo: {
		flex: 1,
		gap: 4,
	},
	cardName: {
		fontSize: FontSize.base,
		fontWeight: FontWeight.semibold,
		color: Colors.textMuted,
	},
	cardNameActive: {
		color: Colors.textPrimary,
	},
	cardMeta: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.xs,
		flexWrap: "wrap",
	},
	cardDate: {
		fontSize: FontSize.xs,
		color: Colors.textSubtle,
	},

	// Pills
	pill: {
		paddingHorizontal: 7,
		paddingVertical: 2,
		borderRadius: Radius.full,
		backgroundColor: "rgba(255,255,255,0.07)",
	},
	pillText: {
		fontSize: 10,
		fontWeight: FontWeight.semibold,
		color: Colors.textSubtle,
	},
	pillGreen: {
		backgroundColor: "rgba(52,211,153,0.1)",
	},
	pillTextGreen: {
		color: Colors.emerald,
	},
	pillBlue: {
		backgroundColor: "rgba(96,165,250,0.1)",
	},
	pillTextBlue: {
		color: Colors.blue,
	},

	// Check / menu
	checkWrap: {
		width: 32,
		height: 32,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: Radius.full,
		backgroundColor: "rgba(3,152,172,0.12)",
	},
	menuBtn: {
		width: 32,
		height: 32,
		alignItems: "center",
		justifyContent: "center",
	},
	copyBtn: {
		width: 36,
		height: 36,
		borderRadius: Radius.md,
		backgroundColor: "rgba(96,165,250,0.1)",
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: "rgba(96,165,250,0.25)",
		alignItems: "center",
		justifyContent: "center",
	},

	// Add card
	addCard: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.md,
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.md,
		borderRadius: Radius.xl,
		borderWidth: 1,
		borderStyle: "dashed",
		borderColor: "rgba(3,152,172,0.3)",
	},
	addIcon: {
		width: 44,
		height: 44,
		borderRadius: 14,
		backgroundColor: "rgba(3,152,172,0.1)",
		alignItems: "center",
		justifyContent: "center",
	},
	addText: {
		fontSize: FontSize.base,
		fontWeight: FontWeight.semibold,
		color: Colors.primary,
	},

	// Action sheet
	menuOverlay: {
		flex: 1,
		justifyContent: "flex-end",
		backgroundColor: "rgba(0,0,0,0.6)",
	},
	menuSheet: {
		backgroundColor: Colors.surfaceElevated,
		borderTopLeftRadius: 28,
		borderTopRightRadius: 28,
		paddingHorizontal: Spacing.lg,
		paddingBottom: Spacing.xxxl,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: "rgba(255,255,255,0.1)",
		borderBottomWidth: 0,
		gap: Spacing.xs,
	},
	menuTitle: {
		fontSize: FontSize.base,
		fontWeight: FontWeight.semibold,
		color: Colors.textMuted,
		textAlign: "center",
		paddingVertical: Spacing.lg,
	},
	menuItem: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.md,
		paddingVertical: Spacing.md,
		paddingHorizontal: Spacing.sm,
		borderRadius: Radius.lg,
	},
	menuIcon: {
		width: 40,
		height: 40,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	menuItemText: {
		fontSize: FontSize.md,
		fontWeight: FontWeight.medium,
		color: Colors.textPrimary,
	},
});
