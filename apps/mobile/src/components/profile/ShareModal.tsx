import { useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput } from "react-native";
import { X, Pencil, Trash2, Eye } from "lucide-react-native";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";
import type { ShareItem } from "@bhemu/shared";

interface Props {
	visible: boolean;
	onClose: () => void;
	onShareWithUser: (emailOrId: string, permissionOrAction: string, actionType?: string) => Promise<void>;
	profileName: string;
	currentShares?: ShareItem[];
}

export default function ShareModal({ visible, onClose, onShareWithUser, profileName, currentShares = [] }: Props) {
	const [targetEmail, setTargetEmail] = useState("");
	const [permission, setPermission] = useState<"read" | "edit">("read");
	const [isSharing, setIsSharing] = useState(false);
	const [error, setError] = useState("");

	const resetForm = () => {
		setTargetEmail("");
		setPermission("read");
		setError("");
	};

	const handleSubmit = useCallback(async () => {
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
	}, [targetEmail, permission, currentShares, onShareWithUser, onClose]);

	const handlePermissionChange = useCallback(async (shareId: string, currentPermission: "read" | "edit") => {
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
	}, [onShareWithUser]);

	const handleUnshare = useCallback(async (shareId: string) => {
		setIsSharing(true);
		setError("");

		try {
			await onShareWithUser(shareId, "unshare");
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setIsSharing(false);
		}
	}, [onShareWithUser]);

	const handleClose = () => {
		if (!isSharing) {
			resetForm();
			onClose();
		}
	};

	return (
		<Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
			<View style={local.overlay}>
				<TouchableOpacity style={local.backdrop} onPress={handleClose} activeOpacity={1} />
				<View style={local.sheet}>
					{/* Header */}
					<View style={local.header}>
						<Text style={local.headerTitle}>Share Profile</Text>
						<TouchableOpacity onPress={handleClose} hitSlop={8}>
							<X size={20} color={Colors.textMuted} />
						</TouchableOpacity>
					</View>

					<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={local.content}>
						<Text style={local.subtitle}>Share "{profileName}" with another user</Text>

						{/* Email input */}
						<View style={local.field}>
							<Text style={local.label}>USER EMAIL</Text>
							<TextInput
								style={local.input}
								value={targetEmail}
								onChangeText={setTargetEmail}
								placeholder="Enter user's email address"
								placeholderTextColor={Colors.textSubtle}
								keyboardType="email-address"
								autoCapitalize="none"
								editable={!isSharing}
							/>
						</View>

						{/* Permission selector */}
						<View style={local.field}>
							<Text style={local.label}>PERMISSION LEVEL</Text>
							<View style={local.permRow}>
								<TouchableOpacity
									style={[local.permOption, permission === "read" && local.permOptionActive]}
									onPress={() => setPermission("read")}
									activeOpacity={0.7}
								>
									<Eye size={14} color={permission === "read" ? "#60A5FA" : Colors.textSubtle} />
									<Text style={[local.permText, permission === "read" && local.permTextActive]}>
										Read Only
									</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={[local.permOption, permission === "edit" && local.permOptionEdit]}
									onPress={() => setPermission("edit")}
									activeOpacity={0.7}
								>
									<Pencil size={14} color={permission === "edit" ? "#34D399" : Colors.textSubtle} />
									<Text style={[local.permText, permission === "edit" && local.permTextEdit]}>
										Edit Access
									</Text>
								</TouchableOpacity>
							</View>
							<Text style={local.permHint}>
								{permission === "read"
									? "The user can view the profile and create a copy to their account."
									: "The user can directly edit the profile. Changes will sync in real-time."}
							</Text>
						</View>

						{/* Error */}
						{error ? (
							<View style={local.errorBox}>
								<Text style={local.errorText}>{error}</Text>
							</View>
						) : null}

						{/* Actions */}
						<View style={local.actions}>
							<TouchableOpacity style={local.cancelBtn} onPress={handleClose} activeOpacity={0.7}>
								<Text style={local.cancelBtnText}>Cancel</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[local.submitBtn, isSharing && local.btnDisabled]}
								onPress={handleSubmit}
								activeOpacity={0.7}
								disabled={isSharing}
							>
								<Text style={local.submitBtnText}>{isSharing ? "Sharing..." : "Share Profile"}</Text>
							</TouchableOpacity>
						</View>

						{/* Current shares */}
						{currentShares.length > 0 && (
							<View style={local.sharesSection}>
								<Text style={local.sharesTitle}>Currently Shared With</Text>
								{currentShares.map((share) => (
									<View key={share.shareId} style={local.shareCard}>
										<View style={local.shareInfo}>
											<Text style={local.shareEmail}>{share.targetUserEmail}</Text>
											<View style={share.permission === "read" ? local.shareBadgeRead : local.shareBadgeEdit}>
												<Text style={share.permission === "read" ? local.shareBadgeReadText : local.shareBadgeEditText}>
													{share.permission === "read" ? "Read Only" : "Edit Access"}
												</Text>
											</View>
										</View>
										<View style={local.shareActions}>
											<TouchableOpacity
												style={local.shareActionBtn}
												onPress={() => handlePermissionChange(share.shareId, share.permission)}
												disabled={isSharing}
											>
												<Pencil size={12} color="#818CF8" />
												<Text style={local.shareActionText}>
													{share.permission === "read" ? "Grant Edit" : "Make Read-Only"}
												</Text>
											</TouchableOpacity>
											<TouchableOpacity
												style={local.shareRemoveBtn}
												onPress={() => handleUnshare(share.shareId)}
												disabled={isSharing}
											>
												<Trash2 size={12} color={Colors.destructive} />
											</TouchableOpacity>
										</View>
									</View>
								))}
							</View>
						)}
					</ScrollView>
				</View>
			</View>
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
		maxHeight: "85%",
		borderWidth: 1,
		borderColor: Colors.border,
		borderBottomWidth: 0,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: Spacing.xl,
		paddingVertical: Spacing.lg,
		borderBottomWidth: 1,
		borderBottomColor: Colors.border,
	},
	headerTitle: {
		fontSize: FontSize.lg,
		fontWeight: FontWeight.bold,
		color: Colors.textPrimary,
	},
	content: {
		padding: Spacing.xl,
		gap: Spacing.lg,
		paddingBottom: Spacing.xxxl,
	},
	subtitle: {
		fontSize: FontSize.base,
		color: Colors.textMuted,
	},
	field: {
		gap: Spacing.sm,
	},
	label: {
		fontSize: FontSize.xs,
		fontWeight: FontWeight.semibold,
		color: Colors.textMuted,
		letterSpacing: 1,
	},
	input: {
		height: 48,
		backgroundColor: "rgba(255,255,255,0.05)",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.1)",
		borderRadius: Radius.lg,
		paddingHorizontal: Spacing.lg,
		color: Colors.textPrimary,
		fontSize: FontSize.base,
	},
	permRow: {
		flexDirection: "row",
		gap: Spacing.sm,
	},
	permOption: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: Spacing.sm,
		paddingVertical: Spacing.md,
		borderRadius: Radius.lg,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.1)",
		backgroundColor: "rgba(255,255,255,0.03)",
	},
	permOptionActive: {
		borderColor: "rgba(96,165,250,0.3)",
		backgroundColor: "rgba(96,165,250,0.08)",
	},
	permOptionEdit: {
		borderColor: "rgba(52,211,153,0.3)",
		backgroundColor: "rgba(52,211,153,0.08)",
	},
	permText: {
		fontSize: FontSize.base,
		fontWeight: FontWeight.medium,
		color: Colors.textSubtle,
	},
	permTextActive: {
		color: Colors.blue,
	},
	permTextEdit: {
		color: Colors.emerald,
	},
	permHint: {
		fontSize: FontSize.xs,
		color: Colors.textSubtle,
		lineHeight: 16,
		paddingHorizontal: Spacing.sm,
	},
	errorBox: {
		padding: Spacing.md,
		backgroundColor: "rgba(239,68,68,0.1)",
		borderWidth: 1,
		borderColor: "rgba(239,68,68,0.2)",
		borderRadius: Radius.lg,
	},
	errorText: {
		fontSize: FontSize.xs,
		color: Colors.destructive,
	},
	actions: {
		flexDirection: "row",
		gap: Spacing.md,
	},
	cancelBtn: {
		flex: 1,
		paddingVertical: Spacing.md,
		borderRadius: Radius.lg,
		backgroundColor: "rgba(255,255,255,0.05)",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.1)",
		alignItems: "center",
	},
	cancelBtnText: {
		fontSize: FontSize.base,
		fontWeight: FontWeight.semibold,
		color: Colors.textPrimary,
	},
	submitBtn: {
		flex: 1,
		paddingVertical: Spacing.md,
		borderRadius: Radius.lg,
		backgroundColor: Colors.primary,
		alignItems: "center",
	},
	submitBtnText: {
		fontSize: FontSize.base,
		fontWeight: FontWeight.semibold,
		color: Colors.textPrimary,
	},
	btnDisabled: {
		opacity: 0.5,
	},
	sharesSection: {
		marginTop: Spacing.lg,
		paddingTop: Spacing.lg,
		borderTopWidth: 1,
		borderTopColor: "rgba(255,255,255,0.05)",
		gap: Spacing.md,
	},
	sharesTitle: {
		fontSize: FontSize.lg,
		fontWeight: FontWeight.bold,
		color: Colors.textPrimary,
	},
	shareCard: {
		backgroundColor: "rgba(255,255,255,0.05)",
		borderRadius: Radius.lg,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.1)",
		padding: Spacing.md,
		gap: Spacing.sm,
	},
	shareInfo: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	shareEmail: {
		fontSize: FontSize.base,
		fontWeight: FontWeight.semibold,
		color: Colors.textPrimary,
		flex: 1,
	},
	shareBadgeRead: {
		paddingHorizontal: Spacing.sm,
		paddingVertical: 2,
		borderRadius: Radius.full,
		backgroundColor: "rgba(96,165,250,0.1)",
		borderWidth: 1,
		borderColor: "rgba(96,165,250,0.2)",
	},
	shareBadgeReadText: {
		fontSize: 9,
		fontWeight: FontWeight.extrabold,
		color: Colors.blue,
	},
	shareBadgeEdit: {
		paddingHorizontal: Spacing.sm,
		paddingVertical: 2,
		borderRadius: Radius.full,
		backgroundColor: "rgba(52,211,153,0.1)",
		borderWidth: 1,
		borderColor: "rgba(52,211,153,0.2)",
	},
	shareBadgeEditText: {
		fontSize: 9,
		fontWeight: FontWeight.extrabold,
		color: Colors.emerald,
	},
	shareActions: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
	},
	shareActionBtn: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: Spacing.xs,
		paddingVertical: Spacing.sm,
		backgroundColor: "rgba(129,140,248,0.1)",
		borderWidth: 1,
		borderColor: "rgba(129,140,248,0.2)",
		borderRadius: Radius.md,
	},
	shareActionText: {
		fontSize: FontSize.xs,
		fontWeight: FontWeight.medium,
		color: Colors.indigo,
	},
	shareRemoveBtn: {
		width: 32,
		height: 32,
		borderRadius: Radius.md,
		backgroundColor: "rgba(239,68,68,0.1)",
		borderWidth: 1,
		borderColor: "rgba(239,68,68,0.2)",
		alignItems: "center",
		justifyContent: "center",
	},
});
