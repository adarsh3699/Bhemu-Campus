import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Pencil, Check, X, Mail, Shield, Star } from "lucide-react-native";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";
import { useAuth } from "@/contexts/AuthContext";
import { useMessage } from "@/contexts/MessageContext";
import AppInput from "@/components/ui/AppInput";
import { SettingsCard, SettingsDivider } from "@/components/Settings/SettingsPrimitives";
import type { User } from "firebase/auth";

function initials(name: string): string {
	const parts = name.trim().split(/\s+/);
	if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
	return name.slice(0, 2).toUpperCase();
}

function memberSinceLabel(user: User): string {
	const ts = (user as unknown as { metadata?: { creationTime?: string } }).metadata?.creationTime;
	if (!ts) return "";
	const d = new Date(ts);
	return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export default function AccountInfo() {
	const { currentUser, updateDisplayName, isGoogleUser, hasPassword } = useAuth();
	const { showMessage } = useMessage();

	const [editing, setEditing] = useState(false);
	const [name, setName] = useState(currentUser?.displayName ?? "");
	const [saving, setSaving] = useState(false);

	if (!currentUser) return null;

	const displayName = currentUser.displayName || currentUser.email?.split("@")[0] || "User";
	const email = currentUser.email ?? "";
	const since = memberSinceLabel(currentUser);
	const emailVerified = currentUser.emailVerified;
	const av = initials(displayName);

	const handleSave = async () => {
		const trimmed = name.trim();
		if (!trimmed || trimmed === currentUser.displayName) {
			setEditing(false);
			setName(currentUser.displayName ?? "");
			return;
		}
		setSaving(true);
		const result = await updateDisplayName(trimmed);
		setSaving(false);
		if (result.success) {
			showMessage("Name updated", "success");
			setEditing(false);
		} else {
			showMessage(result.error ?? "Failed to update name", "error");
		}
	};

	const handleCancel = () => {
		setEditing(false);
		setName(currentUser.displayName ?? "");
	};

	return (
		<SettingsCard>
			{/* Avatar + name */}
			<View style={local.avatarRow}>
				<View style={local.avatar}>
					<Text style={local.avatarText}>{av}</Text>
				</View>
				<View style={local.nameBlock}>
					{editing ? (
						<View style={local.editRow}>
							<AppInput
								value={name}
								onChangeText={setName}
								autoFocus
								size="sm"
								placeholder="Your name"
								containerStyle={local.nameInput}
								onSubmitEditing={handleSave}
								returnKeyType="done"
							/>
							<Pressable
								onPress={handleSave}
								style={({ pressed }) => [local.iconBtn, pressed && local.pressed]}
								disabled={saving}
								accessibilityRole="button"
								accessibilityLabel="Save display name"
							>
								{saving ? (
									<ActivityIndicator size="small" color={Colors.primary} />
								) : (
									<Check size={16} color={Colors.success} />
								)}
							</Pressable>
							<Pressable
								onPress={handleCancel}
								style={({ pressed }) => [local.iconBtn, pressed && local.pressed]}
								disabled={saving}
								accessibilityRole="button"
								accessibilityLabel="Cancel name editing"
							>
								<X size={16} color={Colors.textMuted} />
							</Pressable>
						</View>
					) : (
						<View style={local.nameRow}>
							<Text style={local.displayName} numberOfLines={1}>{displayName}</Text>
							<Pressable
								onPress={() => { setName(currentUser.displayName ?? ""); setEditing(true); }}
								style={({ pressed }) => [local.iconBtn, pressed && local.pressed]}
								accessibilityRole="button"
								accessibilityLabel="Edit display name"
							>
								<Pencil size={14} color={Colors.textSubtle} />
							</Pressable>
						</View>
					)}
					{since ? <Text style={local.since}>Member since {since}</Text> : null}
				</View>
			</View>

			<SettingsDivider />

			{/* Email row */}
			<View style={local.infoRow}>
			<View style={local.infoIcon}>
					<Mail size={16} color={Colors.primary} />
				</View>
				<View style={local.infoContent}>
					<Text style={local.infoLabel}>Email</Text>
					<Text style={local.infoValue} numberOfLines={1}>{email}</Text>
				</View>
				{emailVerified ? (
					<View style={local.badgeGreen}>
						<Text style={local.badgeGreenText}>Verified</Text>
					</View>
				) : (
					<View style={local.badgeGray}>
						<Text style={local.badgeGrayText}>Unverified</Text>
					</View>
				)}
			</View>

			{/* Provider row */}
			<View style={local.infoRow}>
				<View style={local.infoIcon}>
					<Shield size={16} color={Colors.indigo} />
				</View>
				<View style={local.infoContent}>
					<Text style={local.infoLabel}>Sign-in method</Text>
					<Text style={local.infoValue}>
						{isGoogleUser() && hasPassword()
							? "Google + Password"
							: isGoogleUser()
								? "Google"
								: "Email & Password"}
					</Text>
				</View>
				<View style={[local.badgeGreen, local.badgeTeal]}>
					<Star size={9} color={Colors.primary} />
					<Text style={local.badgeTealText}>Active</Text>
				</View>
			</View>
		</SettingsCard>
	);
}

const local = StyleSheet.create({
	avatarRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.md,
		padding: Spacing.xl,
	},
	avatar: {
		width: 56,
		height: 56,
		borderRadius: 18,
		backgroundColor: "rgba(3,152,172,0.2)",
		alignItems: "center",
		justifyContent: "center",
		flexShrink: 0,
	},
	avatarText: {
		fontSize: FontSize.xl,
		fontWeight: FontWeight.bold,
		color: Colors.primary,
	},
	nameBlock: {
		flex: 1,
		gap: 3,
	},
	nameRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.xs,
	},
	displayName: {
		fontSize: FontSize.lg,
		fontWeight: FontWeight.bold,
		color: Colors.textPrimary,
		flex: 1,
	},
	since: {
		fontSize: FontSize.xs,
		color: Colors.textSubtle,
	},
	editRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.xs,
	},
	nameInput: {
		flex: 1,
	},
	iconBtn: {
		width: 44,
		height: 44,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: Radius.md,
	},
	pressed: { backgroundColor: Colors.surfaceElevated },
	infoRow: {
		minHeight: 68,
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.md,
		paddingHorizontal: Spacing.xl,
		paddingVertical: Spacing.md,
	},
	infoIcon: {
		width: 32,
		height: 32,
		alignItems: "center",
		justifyContent: "center",
	},
	infoContent: {
		flex: 1,
		gap: 2,
	},
	infoLabel: {
		fontSize: FontSize.xs,
		color: Colors.textSubtle,
	},
	infoValue: {
		fontSize: FontSize.sm,
		fontWeight: FontWeight.medium,
		color: Colors.textMuted,
	},
	badgeGreen: {
		paddingHorizontal: Spacing.sm,
		paddingVertical: 3,
		borderRadius: Radius.full,
		backgroundColor: "rgba(16,185,129,0.1)",
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: "rgba(16,185,129,0.3)",
	},
	badgeGreenText: {
		fontSize: 10,
		fontWeight: FontWeight.semibold,
		color: Colors.success,
	},
	badgeGray: {
		paddingHorizontal: Spacing.sm,
		paddingVertical: 3,
		borderRadius: Radius.full,
		backgroundColor: "rgba(255,255,255,0.05)",
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: "rgba(255,255,255,0.1)",
	},
	badgeGrayText: {
		fontSize: 10,
		fontWeight: FontWeight.semibold,
		color: Colors.textSubtle,
	},
	badgeTeal: {
		flexDirection: "row",
		alignItems: "center",
		gap: 3,
		backgroundColor: "rgba(3,152,172,0.1)",
		borderColor: "rgba(3,152,172,0.25)",
	},
	badgeTealText: {
		fontSize: 10,
		fontWeight: FontWeight.semibold,
		color: Colors.primary,
	},
});
