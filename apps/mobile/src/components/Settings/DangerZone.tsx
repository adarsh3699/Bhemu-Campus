import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator } from "react-native";
import { AlertTriangle, Trash2, X } from "lucide-react-native";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";
import { useAuth } from "@/contexts/AuthContext";
import { useMessage } from "@/contexts/MessageContext";
import AppInput from "@/components/ui/AppInput";

type Step = "idle" | "confirm" | "password" | "google";

export default function DangerZone() {
	const { deleteAllUserData, isGoogleUser, hasPassword } = useAuth();
	const { showMessage } = useMessage();

	const [step, setStep] = useState<Step>("idle");
	const [password, setPassword] = useState("");
	const [deleting, setDeleting] = useState(false);

	const isGoogle = isGoogleUser();
	const hasPw = hasPassword();

	const reset = () => {
		setStep("idle");
		setPassword("");
		setDeleting(false);
	};

	const handleInitialConfirm = () => {
		// Determine next step based on provider
		if (!hasPw && isGoogle) {
			// Google-only: jump straight to Google re-auth step
			setStep("google");
		} else {
			// Has password (may also have Google): show password input
			setStep("password");
		}
	};

	const handleDelete = async (useGoogle = false) => {
		setDeleting(true);
		const result = await deleteAllUserData(useGoogle ? null : password.trim() || null, useGoogle);
		setDeleting(false);

		if (result.success) {
			// Auth state change handles navigation
			reset();
		} else if (result.requiresPassword) {
			showMessage("Password required", "error");
		} else if (result.requiresRelogin) {
			showMessage("Please log out and back in first", "error");
			reset();
		} else {
			showMessage(result.error ?? "Failed to delete account", "error");
		}
	};

	return (
		<>
			<View style={local.card}>
				<View style={local.header}>
					<View style={local.headerIcon}>
						<AlertTriangle size={15} color={Colors.destructive} />
					</View>
					<View>
						<Text style={local.headerTitle}>Danger Zone</Text>
						<Text style={local.headerSub}>Irreversible account actions</Text>
					</View>
				</View>

				<View style={local.divider} />

				<View style={local.row}>
					<View style={local.rowContent}>
						<Text style={local.rowTitle}>Delete Account</Text>
						<Text style={local.rowSub}>Permanently removes all your data and cannot be undone</Text>
					</View>
					<TouchableOpacity
						style={local.deleteBtn}
						onPress={() => setStep("confirm")}
						activeOpacity={0.7}
					>
						<Trash2 size={14} color={Colors.destructive} />
						<Text style={local.deleteBtnText}>Delete</Text>
					</TouchableOpacity>
				</View>
			</View>

			{/* Confirm modal */}
			<Modal
				visible={step !== "idle"}
				transparent
				animationType="fade"
				onRequestClose={reset}
				presentationStyle="overFullScreen"
			>
				<View style={modal.overlay}>
					<TouchableOpacity style={modal.backdrop} onPress={reset} activeOpacity={1} />
					<View style={modal.sheet}>
						{/* Close */}
						<TouchableOpacity style={modal.closeBtn} onPress={reset} hitSlop={8}>
							<X size={18} color={Colors.textMuted} />
						</TouchableOpacity>

						<View style={modal.iconWrap}>
							<Trash2 size={24} color={Colors.destructive} />
						</View>

						<Text style={modal.title}>Delete Account</Text>

						{step === "confirm" && (
							<>
								<Text style={modal.body}>
									This will permanently delete your account and all associated data — profiles, semesters, attendance, and shared data. This cannot be undone.
								</Text>
								<TouchableOpacity
									style={modal.dangerBtn}
									onPress={handleInitialConfirm}
									activeOpacity={0.8}
								>
									<Text style={modal.dangerBtnText}>I understand, continue</Text>
								</TouchableOpacity>
								<TouchableOpacity style={modal.cancelBtn} onPress={reset}>
									<Text style={modal.cancelBtnText}>Cancel</Text>
								</TouchableOpacity>
							</>
						)}

						{step === "password" && (
							<>
								<Text style={modal.body}>Enter your password to authorize deletion:</Text>
								<AppInput
									value={password}
									onChangeText={setPassword}
									placeholder="Account password"
									secureTextEntry
									size="md"
									autoFocus
								/>
								{isGoogle && hasPw && (
									<TouchableOpacity
										style={modal.googleLink}
										onPress={() => { setStep("google"); setPassword(""); }}
									>
										<Text style={modal.googleLinkText}>Use Google authentication instead</Text>
									</TouchableOpacity>
								)}
								<TouchableOpacity
									style={[modal.dangerBtn, (deleting || !password.trim()) && modal.dangerBtnDisabled]}
									onPress={() => handleDelete(false)}
									disabled={deleting || !password.trim()}
									activeOpacity={0.8}
								>
									{deleting ? (
										<ActivityIndicator size="small" color={Colors.textPrimary} />
									) : (
										<Text style={modal.dangerBtnText}>Delete Everything</Text>
									)}
								</TouchableOpacity>
								<TouchableOpacity style={modal.cancelBtn} onPress={reset} disabled={deleting}>
									<Text style={modal.cancelBtnText}>Cancel</Text>
								</TouchableOpacity>
							</>
						)}

						{step === "google" && (
							<>
								<Text style={modal.body}>
									We'll use Google to confirm your identity before deleting your account.
								</Text>
								{hasPw && (
									<TouchableOpacity
										style={modal.googleLink}
										onPress={() => setStep("password")}
									>
										<Text style={modal.googleLinkText}>Use password instead</Text>
									</TouchableOpacity>
								)}
								<TouchableOpacity
									style={[modal.dangerBtn, deleting && modal.dangerBtnDisabled]}
									onPress={() => handleDelete(true)}
									disabled={deleting}
									activeOpacity={0.8}
								>
									{deleting ? (
										<ActivityIndicator size="small" color={Colors.textPrimary} />
									) : (
										<Text style={modal.dangerBtnText}>Confirm with Google</Text>
									)}
								</TouchableOpacity>
								<TouchableOpacity style={modal.cancelBtn} onPress={reset} disabled={deleting}>
									<Text style={modal.cancelBtnText}>Cancel</Text>
								</TouchableOpacity>
							</>
						)}
					</View>
				</View>
			</Modal>
		</>
	);
}

const local = StyleSheet.create({
	card: {
		backgroundColor: Colors.surface,
		borderRadius: Radius.xl,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: "rgba(239,68,68,0.2)",
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
		backgroundColor: "rgba(239,68,68,0.1)",
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: "rgba(239,68,68,0.2)",
		alignItems: "center",
		justifyContent: "center",
	},
	headerTitle: {
		fontSize: FontSize.base,
		fontWeight: FontWeight.semibold,
		color: Colors.destructive,
	},
	headerSub: {
		fontSize: FontSize.xs,
		color: Colors.textSubtle,
		marginTop: 1,
	},
	divider: {
		height: StyleSheet.hairlineWidth,
		backgroundColor: "rgba(239,68,68,0.1)",
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.md,
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.md,
	},
	rowContent: {
		flex: 1,
		gap: 3,
	},
	rowTitle: {
		fontSize: FontSize.sm,
		fontWeight: FontWeight.medium,
		color: Colors.textPrimary,
	},
	rowSub: {
		fontSize: FontSize.xs,
		color: Colors.textSubtle,
		lineHeight: 16,
	},
	deleteBtn: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.xs,
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.sm,
		borderRadius: Radius.md,
		backgroundColor: "rgba(239,68,68,0.1)",
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: "rgba(239,68,68,0.25)",
	},
	deleteBtnText: {
		fontSize: FontSize.xs,
		fontWeight: FontWeight.semibold,
		color: Colors.destructive,
	},
});

const modal = StyleSheet.create({
	overlay: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "rgba(0,0,0,0.7)",
		padding: Spacing.xl,
	},
	backdrop: {
		position: "absolute",
		top: 0, left: 0, right: 0, bottom: 0,
	},
	sheet: {
		backgroundColor: Colors.surfaceElevated,
		borderRadius: Radius.xl,
		padding: Spacing.xl,
		width: "100%",
		maxWidth: 360,
		gap: Spacing.md,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: "rgba(239,68,68,0.2)",
	},
	closeBtn: {
		alignSelf: "flex-end",
		width: 28,
		height: 28,
		alignItems: "center",
		justifyContent: "center",
	},
	iconWrap: {
		width: 48,
		height: 48,
		borderRadius: 16,
		backgroundColor: "rgba(239,68,68,0.1)",
		borderWidth: 1,
		borderColor: "rgba(239,68,68,0.2)",
		alignSelf: "center",
		alignItems: "center",
		justifyContent: "center",
	},
	title: {
		fontSize: FontSize.lg,
		fontWeight: FontWeight.bold,
		color: Colors.textPrimary,
		textAlign: "center",
	},
	body: {
		fontSize: FontSize.sm,
		color: Colors.textMuted,
		textAlign: "center",
		lineHeight: 20,
	},
	dangerBtn: {
		height: 48,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: Radius.md,
		backgroundColor: Colors.destructive,
	},
	dangerBtnDisabled: {
		opacity: 0.5,
	},
	dangerBtnText: {
		fontSize: FontSize.base,
		fontWeight: FontWeight.semibold,
		color: Colors.textPrimary,
	},
	cancelBtn: {
		height: 44,
		alignItems: "center",
		justifyContent: "center",
	},
	cancelBtnText: {
		fontSize: FontSize.sm,
		color: Colors.textSubtle,
	},
	googleLink: {
		alignItems: "center",
	},
	googleLinkText: {
		fontSize: FontSize.xs,
		color: Colors.blue,
		textDecorationLine: "underline",
	},
});
