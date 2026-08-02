import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Lock, KeyRound, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react-native";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";
import { useAuth } from "@/contexts/AuthContext";
import { useMessage } from "@/contexts/MessageContext";
import AppInput from "@/components/ui/AppInput";
import { SettingsCard, SettingsDivider, SettingsHeader } from "@/components/Settings/SettingsPrimitives";

// Strength: 0-4 criteria met
function passwordStrength(pw: string): { score: number; labels: string[] } {
	const checks = [
		{ ok: pw.length >= 8, label: "8+ characters" },
		{ ok: /[A-Z]/.test(pw), label: "Uppercase letter" },
		{ ok: /[0-9]/.test(pw), label: "Number" },
		{ ok: /[^A-Za-z0-9]/.test(pw), label: "Symbol" },
	];
	return {
		score: checks.filter((c) => c.ok).length,
		labels: checks.filter((c) => !c.ok).map((c) => c.label),
	};
}

const STRENGTH_COLORS = ["", Colors.destructive, Colors.warning, Colors.warning, Colors.success];
const STRENGTH_LABELS = ["", "Weak", "Fair", "Good", "Strong"];

function StrengthBar({ password }: { password: string }) {
	if (!password) return null;
	const { score } = passwordStrength(password);
	const color = STRENGTH_COLORS[score];
	return (
		<View style={bar.wrap}>
			<View style={bar.track}>
				{[1, 2, 3, 4].map((i) => (
					<View
						key={i}
						style={[bar.segment, { backgroundColor: i <= score ? color : "rgba(255,255,255,0.08)" }]}
					/>
				))}
			</View>
			{score > 0 && <Text style={[bar.label, { color }]}>{STRENGTH_LABELS[score]}</Text>}
		</View>
	);
}

const bar = StyleSheet.create({
	wrap: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginTop: 4 },
	track: { flexDirection: "row", gap: 3, flex: 1 },
	segment: { flex: 1, height: 3, borderRadius: 2 },
	label: { fontSize: 10, fontWeight: FontWeight.semibold },
});

export default function SecuritySection() {
	const { isGoogleUser, hasPassword, createPassword, changePassword } = useAuth();
	const { showMessage } = useMessage();

	const isGoogle = isGoogleUser();
	const hasPw = hasPassword();

	// Create password
	const [showCreate, setShowCreate] = useState(false);
	const [newPw, setNewPw] = useState("");
	const [confirmPw, setConfirmPw] = useState("");
	const [creatingPw, setCreatingPw] = useState(false);

	// Change password
	const [showChange, setShowChange] = useState(false);
	const [currentPw, setCurrentPw] = useState("");
	const [changePw, setChangePw] = useState("");
	const [changeConfirm, setChangeConfirm] = useState("");
	const [changingPw, setChangingPw] = useState(false);

	const handleCreatePassword = async () => {
		if (!newPw.trim() || newPw !== confirmPw) {
			showMessage("Passwords do not match", "error");
			return;
		}
		const { score } = passwordStrength(newPw);
		if (score < 2) {
			showMessage("Password is too weak", "error");
			return;
		}
		setCreatingPw(true);
		const result = await createPassword(newPw);
		setCreatingPw(false);
		if (result.success) {
			showMessage("Password created successfully", "success");
			setShowCreate(false);
			setNewPw("");
			setConfirmPw("");
		} else {
			showMessage(result.error ?? "Failed to create password", "error");
		}
	};

	const handleChangePassword = async () => {
		if (!currentPw.trim() || !changePw.trim() || changePw !== changeConfirm) {
			showMessage("Passwords do not match", "error");
			return;
		}
		const { score } = passwordStrength(changePw);
		if (score < 2) {
			showMessage("New password is too weak", "error");
			return;
		}
		setChangingPw(true);
		const result = await changePassword(currentPw, changePw);
		setChangingPw(false);
		if (result.success) {
			showMessage("Password changed successfully", "success");
			setShowChange(false);
			setCurrentPw("");
			setChangePw("");
			setChangeConfirm("");
		} else {
			showMessage(result.error ?? "Failed to change password", "error");
		}
	};

	return (
		<SettingsCard>
			<SettingsHeader
				icon={<Lock size={19} color={Colors.indigo} />}
				title="Security"
				subtitle="Manage your password and sign-in methods"
				tone="indigo"
			/>

			<SettingsDivider />

			{/* Google-only warning */}
			{isGoogle && !hasPw && (
				<View style={local.warningRow}>
					<AlertTriangle size={14} color={Colors.warning} />
					<Text style={local.warningText}>
						Your account only uses Google sign-in. Add a password for email login.
					</Text>
				</View>
			)}

			{/* Create password (Google-only users) */}
			{isGoogle && !hasPw && (
				<View style={local.section}>
					<Pressable
						style={({ pressed }) => [local.row, pressed && local.pressed]}
						onPress={() => setShowCreate((v) => !v)}
						accessibilityRole="button"
						accessibilityState={{ expanded: showCreate }}
					>
						<View style={local.rowIcon}>
							<KeyRound size={14} color={Colors.blue} />
						</View>
						<View style={local.rowContent}>
							<Text style={local.rowTitle}>Create Password</Text>
							<Text style={local.rowSub}>Enable email & password sign-in</Text>
						</View>
						{showCreate ? (
							<ChevronUp size={16} color={Colors.textSubtle} />
						) : (
							<ChevronDown size={16} color={Colors.textSubtle} />
						)}
					</Pressable>

					{showCreate && (
						<View style={local.form}>
							<AppInput
								value={newPw}
								onChangeText={setNewPw}
								placeholder="New password"
								secureTextEntry
								size="md"
							/>
							<StrengthBar password={newPw} />
							<AppInput
								value={confirmPw}
								onChangeText={setConfirmPw}
								placeholder="Confirm password"
								secureTextEntry
								size="md"
							/>
							<View style={local.formActions}>
								<Pressable
									style={({ pressed }) => [local.cancelBtn, pressed && local.pressed]}
									onPress={() => { setShowCreate(false); setNewPw(""); setConfirmPw(""); }}
								>
									<Text style={local.cancelBtnText}>Cancel</Text>
								</Pressable>
								<Pressable
									style={({ pressed }) => [local.saveBtn, creatingPw && local.saveBtnDisabled, pressed && local.pressed]}
									onPress={handleCreatePassword}
									disabled={creatingPw}
								>
									{creatingPw ? (
										<ActivityIndicator size="small" color={Colors.textPrimary} />
									) : (
										<Text style={local.saveBtnText}>Create</Text>
									)}
								</Pressable>
							</View>
						</View>
					)}
				</View>
			)}

			{/* Change password (has password) */}
			{hasPw && (
				<View style={local.section}>
					<Pressable
						style={({ pressed }) => [local.row, pressed && local.pressed]}
						onPress={() => setShowChange((v) => !v)}
						accessibilityRole="button"
						accessibilityState={{ expanded: showChange }}
					>
						<View style={local.rowIcon}>
							<KeyRound size={14} color={Colors.blue} />
						</View>
						<View style={local.rowContent}>
							<Text style={local.rowTitle}>Change Password</Text>
							<Text style={local.rowSub}>Update your current password</Text>
						</View>
						{showChange ? (
							<ChevronUp size={16} color={Colors.textSubtle} />
						) : (
							<ChevronDown size={16} color={Colors.textSubtle} />
						)}
					</Pressable>

					{showChange && (
						<View style={local.form}>
							<AppInput
								value={currentPw}
								onChangeText={setCurrentPw}
								placeholder="Current password"
								secureTextEntry
								size="md"
							/>
							<AppInput
								value={changePw}
								onChangeText={setChangePw}
								placeholder="New password"
								secureTextEntry
								size="md"
							/>
							<StrengthBar password={changePw} />
							<AppInput
								value={changeConfirm}
								onChangeText={setChangeConfirm}
								placeholder="Confirm new password"
								secureTextEntry
								size="md"
							/>
							<View style={local.formActions}>
								<Pressable
									style={({ pressed }) => [local.cancelBtn, pressed && local.pressed]}
									onPress={() => { setShowChange(false); setCurrentPw(""); setChangePw(""); setChangeConfirm(""); }}
								>
									<Text style={local.cancelBtnText}>Cancel</Text>
								</Pressable>
								<Pressable
									style={({ pressed }) => [local.saveBtn, changingPw && local.saveBtnDisabled, pressed && local.pressed]}
									onPress={handleChangePassword}
									disabled={changingPw}
								>
									{changingPw ? (
										<ActivityIndicator size="small" color={Colors.textPrimary} />
									) : (
										<Text style={local.saveBtnText}>Update</Text>
									)}
								</Pressable>
							</View>
						</View>
					)}
				</View>
			)}
		</SettingsCard>
	);
}

const local = StyleSheet.create({
	warningRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: Spacing.sm,
		padding: Spacing.md,
		margin: Spacing.md,
		borderRadius: Radius.lg,
		backgroundColor: "rgba(245,158,11,0.08)",
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: "rgba(245,158,11,0.2)",
	},
	warningText: {
		flex: 1,
		fontSize: FontSize.xs,
		color: Colors.warning,
		lineHeight: 16,
	},
	section: {
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: Colors.border,
	},
	row: {
		minHeight: 72,
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.md,
		paddingHorizontal: Spacing.xl,
		paddingVertical: Spacing.sm,
	},
	rowIcon: {
		width: 32,
		height: 32,
		borderRadius: Radius.md,
		backgroundColor: Colors.surfaceElevated,
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
	rowSub: {
		fontSize: FontSize.xs,
		color: Colors.textSubtle,
	},
	form: {
		paddingHorizontal: Spacing.xl,
		paddingBottom: Spacing.xl,
		gap: Spacing.sm,
	},
	formActions: {
		flexDirection: "row",
		gap: Spacing.sm,
		marginTop: Spacing.xs,
	},
	cancelBtn: {
		flex: 1,
		minHeight: 44,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: Radius.md,
		backgroundColor: "rgba(255,255,255,0.05)",
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: "rgba(255,255,255,0.1)",
	},
	cancelBtnText: {
		fontSize: FontSize.sm,
		fontWeight: FontWeight.medium,
		color: Colors.textMuted,
	},
	saveBtn: {
		flex: 1,
		minHeight: 44,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: Radius.md,
		backgroundColor: Colors.primary,
	},
	saveBtnDisabled: {
		opacity: 0.5,
	},
	saveBtnText: {
		fontSize: FontSize.sm,
		fontWeight: FontWeight.semibold,
		color: Colors.textPrimary,
	},
	pressed: { opacity: 0.78 },
});
