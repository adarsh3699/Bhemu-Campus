import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from "react-native";
import { X, Plus, Share2, Trash2, Pencil, Copy, Eye, MoreVertical } from "lucide-react-native";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";
import { useAuth } from "@/contexts/AuthContext";
import { useGpaData } from "@/contexts/GpaDataContext";
import ConfirmModal from "@/components/ui/ConfirmModal";
import InputModal from "@/components/ui/InputModal";
import type { GPAProfile } from "@bhemu/shared";
import type { ShareData } from "@bhemu/firebase";

interface Props {
	visible: boolean;
	onClose: () => void;
	onShareProfile?: (profileId: string | number) => void;
}

export default function ProfileDrawer({ visible, onClose, onShareProfile }: Props) {
	const { currentUser } = useAuth();
	const {
		profiles,
		activeProfile,
		updateActiveProfile,
		createProfile,
		deleteProfile,
		renameProfile,
		copySharedProfile,
		mySharedProfiles,
	} = useGpaData();

	const [showCreateModal, setShowCreateModal] = useState(false);
	const [profileToDelete, setProfileToDelete] = useState<{ id: string | number; name: string } | null>(null);
	const [profileToRename, setProfileToRename] = useState<{ id: string | number; name: string } | null>(null);
	const [menuProfileId, setMenuProfileId] = useState<string | number | null>(null);

	const ownProfiles = profiles
		.filter((p) => !p.isShared || (currentUser && p.ownerUserId === currentUser.uid))
		.sort((a, b) => {
			if (a.isDefault && !b.isDefault) return -1;
			if (!a.isDefault && b.isDefault) return 1;
			return (a.name || "").localeCompare(b.name || "");
		});

	const sharedWithMeProfiles = profiles.filter(
		(p) => !!p.isShared && (!p.ownerUserId || (currentUser && p.ownerUserId !== currentUser.uid))
	);

	const getShareCount = (profileId: string | number) => {
		return (mySharedProfiles as ShareData[]).filter(
			(s) => s.profileId === profileId && s.isActive
		).length;
	};

	const formatUpdatedAt = (updatedAt: unknown) => {
		if (!updatedAt) return "Never updated";
		const ts = updatedAt as { toMillis?: () => number };
		const ms = ts.toMillis ? ts.toMillis() : Number(updatedAt);
		if (!ms || isNaN(ms)) return "Never updated";
		return "Updated " + new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
	};

	const handleSelect = (id: string | number) => {
		updateActiveProfile(id);
		onClose();
	};

	return (
		<Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
			<View style={local.overlay}>
				<TouchableOpacity style={local.backdrop} onPress={onClose} activeOpacity={1} />
				<View style={local.sheet}>
					{/* Drag handle */}
					<View style={local.dragHandle} />

					{/* Header */}
					<View style={local.header}>
						<Text style={local.headerTitle}>WORKSPACE PROFILES</Text>
						<TouchableOpacity onPress={onClose} hitSlop={8}>
							<X size={20} color={Colors.textMuted} />
						</TouchableOpacity>
					</View>

					{/* Content */}
					<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={local.content}>
						{/* Own profiles */}
						<View style={local.section}>
							<Text style={local.sectionTitle}>MY ACADEMIC PROFILES</Text>

							{ownProfiles.map((profile) => {
								const isActive = activeProfile === profile.id;
								const shareCount = getShareCount(profile.id);
								const canDelete = ownProfiles.length > 1 && !profile.isDefault;

								return (
									<TouchableOpacity
										key={String(profile.id)}
										style={[local.profileCard, isActive && local.profileCardActive]}
										onPress={() => handleSelect(profile.id)}
										activeOpacity={0.7}
									>
										<View style={local.profileInfo}>
											<Text style={local.profileName} numberOfLines={1}>{profile.name}</Text>
											<Text style={local.profileUpdated}>{formatUpdatedAt(profile.updatedAt)}</Text>
											<View style={local.badges}>
												{profile.isDefault && (
													<View style={local.badgeDefault}>
														<Text style={local.badgeDefaultText}>DEFAULT</Text>
													</View>
												)}
												{shareCount > 0 && (
													<View style={local.badgeShared}>
														<Text style={local.badgeSharedText}>SHARED ({shareCount})</Text>
													</View>
												)}
											</View>
										</View>

										{/* Menu button */}
										<TouchableOpacity
											style={local.menuBtn}
											onPress={() => setMenuProfileId(menuProfileId === profile.id ? null : profile.id)}
											hitSlop={8}
										>
											<MoreVertical size={16} color={Colors.textMuted} />
										</TouchableOpacity>

										{/* Menu dropdown */}
										{menuProfileId === profile.id && (
											<View style={local.menu}>
												<TouchableOpacity
													style={local.menuItem}
													onPress={() => {
														setMenuProfileId(null);
														setProfileToRename({ id: profile.id, name: profile.name });
													}}
												>
													<Pencil size={14} color={Colors.textMuted} />
													<Text style={local.menuItemText}>Rename</Text>
												</TouchableOpacity>
												<TouchableOpacity
													style={local.menuItem}
													onPress={() => {
														setMenuProfileId(null);
														onShareProfile?.(profile.id);
													}}
												>
													<Share2 size={14} color={Colors.textMuted} />
													<Text style={local.menuItemText}>Share</Text>
												</TouchableOpacity>
												{canDelete && (
													<>
														<View style={local.menuDivider} />
														<TouchableOpacity
															style={local.menuItem}
															onPress={() => {
																setMenuProfileId(null);
																setProfileToDelete({ id: profile.id, name: profile.name });
															}}
														>
															<Trash2 size={14} color={Colors.destructive} />
															<Text style={[local.menuItemText, { color: Colors.destructive }]}>Delete</Text>
														</TouchableOpacity>
													</>
												)}
											</View>
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
								<Plus size={20} color={Colors.textMuted} />
								<Text style={local.addCardText}>Add Workspace Profile</Text>
							</TouchableOpacity>
						</View>

						{/* Shared with me */}
						{sharedWithMeProfiles.length > 0 && (
							<View style={[local.section, local.sharedSection]}>
								<Text style={local.sectionTitle}>SHARED WITH ME</Text>

								{sharedWithMeProfiles.map((profile) => {
									const isActive = activeProfile === profile.id;

									return (
										<TouchableOpacity
											key={`shared-${profile.id}`}
											style={[local.profileCard, isActive && local.profileCardActive, local.sharedCard]}
											onPress={() => handleSelect(profile.id)}
											activeOpacity={0.7}
										>
											<View style={local.profileInfo}>
												<Text style={local.profileName} numberOfLines={1}>{profile.name}</Text>
												<Text style={local.profileUpdated}>{formatUpdatedAt(profile.updatedAt)}</Text>
												<View style={local.badges}>
													<View style={profile.permission === "read" ? local.badgeRead : local.badgeEdit}>
														{profile.permission === "read" ? (
															<View style={local.badgeRow}>
																<Eye size={10} color="#60A5FA" />
																<Text style={local.badgeReadText}>READ ONLY</Text>
															</View>
														) : (
															<View style={local.badgeRow}>
																<Pencil size={10} color="#34D399" />
																<Text style={local.badgeEditText}>EDIT ACCESS</Text>
															</View>
														)}
													</View>
												</View>
											</View>

											{profile.permission === "read" && (
												<TouchableOpacity
													style={local.copyBtn}
													onPress={() => copySharedProfile((profile as GPAProfile & { shareId?: string }).shareId || String(profile.id), profile.name)}
													hitSlop={8}
												>
													<Copy size={14} color="#60A5FA" />
												</TouchableOpacity>
											)}
										</TouchableOpacity>
									);
								})}
							</View>
						)}
					</ScrollView>
				</View>
			</View>

			{/* Create modal */}
			<InputModal
				isOpen={showCreateModal}
				onClose={() => setShowCreateModal(false)}
				onConfirm={(name) => {
					createProfile(name);
					setShowCreateModal(false);
				}}
				title="Create New Profile"
				placeholder="Enter profile name"
				confirmText="Create"
			/>

			{/* Rename modal */}
			<InputModal
				isOpen={!!profileToRename}
				onClose={() => setProfileToRename(null)}
				onConfirm={(name) => {
					if (profileToRename) renameProfile(profileToRename.id, name);
					setProfileToRename(null);
				}}
				title="Rename Profile"
				placeholder="Enter new name"
				initialValue={profileToRename?.name ?? ""}
				confirmText="Rename"
			/>

			{/* Delete confirm */}
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
		</Modal>
	);
}

const local = StyleSheet.create({
	overlay: {
		flex: 1,
		justifyContent: "flex-end",
	},
	backdrop: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: "rgba(0,0,0,0.6)",
	},
	sheet: {
		backgroundColor: Colors.surface,
		borderTopLeftRadius: Radius.xl,
		borderTopRightRadius: Radius.xl,
		maxHeight: "82%",
		borderWidth: 1,
		borderColor: Colors.border,
		borderBottomWidth: 0,
	},
	dragHandle: {
		width: 40,
		height: 4,
		borderRadius: 2,
		backgroundColor: "rgba(255,255,255,0.2)",
		alignSelf: "center",
		marginTop: Spacing.md,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: Spacing.xl,
		paddingVertical: Spacing.lg,
		borderBottomWidth: 1,
		borderBottomColor: "rgba(255,255,255,0.05)",
	},
	headerTitle: {
		fontSize: FontSize.base,
		fontWeight: FontWeight.bold,
		color: Colors.primary,
		letterSpacing: 1,
	},
	content: {
		padding: Spacing.xl,
		paddingBottom: Spacing.xxxl,
	},
	section: {
		gap: Spacing.md,
	},
	sharedSection: {
		marginTop: Spacing.xl,
		paddingTop: Spacing.xl,
		borderTopWidth: 1,
		borderTopColor: "rgba(255,255,255,0.05)",
	},
	sectionTitle: {
		fontSize: FontSize.xs,
		fontWeight: FontWeight.bold,
		color: Colors.textMuted,
		letterSpacing: 1.5,
		marginBottom: Spacing.xs,
	},
	profileCard: {
		position: "relative",
		borderRadius: Radius.lg,
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.md,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.05)",
		backgroundColor: "rgba(255,255,255,0.05)",
		flexDirection: "row",
		alignItems: "center",
	},
	profileCardActive: {
		backgroundColor: "rgba(99,102,241,0.1)",
		borderColor: "rgba(99,102,241,0.5)",
	},
	sharedCard: {
		borderLeftWidth: 3,
		borderLeftColor: "rgba(99,102,241,0.6)",
	},
	profileInfo: {
		flex: 1,
		gap: 2,
	},
	profileName: {
		fontSize: FontSize.base,
		fontWeight: FontWeight.bold,
		color: Colors.textPrimary,
	},
	profileUpdated: {
		fontSize: FontSize.xs,
		color: Colors.textSubtle,
	},
	badges: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: Spacing.xs,
		marginTop: Spacing.xs,
	},
	badgeDefault: {
		paddingHorizontal: Spacing.sm,
		paddingVertical: 2,
		borderRadius: Radius.full,
		backgroundColor: "rgba(99,102,241,0.1)",
		borderWidth: 1,
		borderColor: "rgba(99,102,241,0.2)",
	},
	badgeDefaultText: {
		fontSize: 9,
		fontWeight: FontWeight.extrabold,
		color: "#818CF8",
		letterSpacing: 1,
	},
	badgeShared: {
		paddingHorizontal: Spacing.sm,
		paddingVertical: 2,
		borderRadius: Radius.full,
		backgroundColor: "rgba(16,185,129,0.1)",
		borderWidth: 1,
		borderColor: "rgba(16,185,129,0.2)",
	},
	badgeSharedText: {
		fontSize: 9,
		fontWeight: FontWeight.extrabold,
		color: "#34D399",
		letterSpacing: 1,
	},
	badgeRead: {
		paddingHorizontal: Spacing.sm,
		paddingVertical: 2,
		borderRadius: Radius.sm,
		backgroundColor: "rgba(96,165,250,0.1)",
		borderWidth: 1,
		borderColor: "rgba(96,165,250,0.2)",
	},
	badgeReadText: {
		fontSize: 9,
		fontWeight: FontWeight.extrabold,
		color: "#60A5FA",
		letterSpacing: 1,
	},
	badgeEdit: {
		paddingHorizontal: Spacing.sm,
		paddingVertical: 2,
		borderRadius: Radius.sm,
		backgroundColor: "rgba(52,211,153,0.1)",
		borderWidth: 1,
		borderColor: "rgba(52,211,153,0.2)",
	},
	badgeEditText: {
		fontSize: 9,
		fontWeight: FontWeight.extrabold,
		color: "#34D399",
		letterSpacing: 1,
	},
	badgeRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 3,
	},
	menuBtn: {
		width: 32,
		height: 32,
		borderRadius: Radius.md,
		alignItems: "center",
		justifyContent: "center",
	},
	menu: {
		position: "absolute",
		right: Spacing.md,
		top: 44,
		zIndex: 50,
		width: 150,
		borderRadius: Radius.lg,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.1)",
		backgroundColor: Colors.surfaceElevated,
		paddingVertical: 4,
	},
	menuItem: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.sm + 2,
	},
	menuItemText: {
		fontSize: FontSize.base,
		color: Colors.textPrimary,
	},
	menuDivider: {
		height: 1,
		backgroundColor: "rgba(255,255,255,0.08)",
		marginVertical: 2,
	},
	copyBtn: {
		width: 32,
		height: 32,
		borderRadius: Radius.md,
		backgroundColor: "rgba(96,165,250,0.1)",
		borderWidth: 1,
		borderColor: "rgba(96,165,250,0.2)",
		alignItems: "center",
		justifyContent: "center",
	},
	addCard: {
		borderRadius: Radius.lg,
		paddingVertical: Spacing.lg,
		borderWidth: 2,
		borderStyle: "dashed",
		borderColor: "rgba(255,255,255,0.1)",
		alignItems: "center",
		justifyContent: "center",
		gap: Spacing.sm,
	},
	addCardText: {
		fontSize: FontSize.xs,
		fontWeight: FontWeight.bold,
		color: Colors.textMuted,
	},
});
