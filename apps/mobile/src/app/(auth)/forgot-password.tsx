import { useState } from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	KeyboardAvoidingView,
	Platform,
	ActivityIndicator,
	Image,
	ScrollView,
} from "react-native";
import { Link } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useMessage } from "@/contexts/MessageContext";
import { Colors } from "@/constants/Colors";

export default function ForgotPassword() {
	const { resetPassword } = useAuth();
	const { showMessage } = useMessage();
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [sent, setSent] = useState(false);

	async function handleReset() {
		if (!email) {
			showMessage("Please enter your email", "warning");
			return;
		}
		setLoading(true);
		try {
			await resetPassword(email.trim());
			setSent(true);
		} catch (err: unknown) {
			const code = (err as { code?: string }).code;
			const msg =
				code === "auth/user-not-found"
					? "No account found with this email"
					: code === "auth/invalid-email"
						? "Please enter a valid email address"
						: "Failed to send reset email. Please try again.";
			showMessage(msg, "error");
		} finally {
			setLoading(false);
		}
	}

	return (
		<KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
			<ScrollView
				contentContainerStyle={styles.container}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				{/* Big centered logo + heading */}
				<View style={styles.logoSection}>
					<View style={styles.logoBox}>
						<Image source={require("../../../assets/app_icon.png")} style={styles.logoImage} />
					</View>
					<Text style={styles.heading}>Reset password</Text>
					<Text style={styles.subheading}>
						{sent ? "Check your email for a reset link." : "We'll send you a link to reset it."}
					</Text>
				</View>

				{!sent ? (
					<View style={styles.form}>
						<View style={styles.field}>
							<Text style={styles.label}>Email address</Text>
							<TextInput
								style={styles.input}
								value={email}
								onChangeText={setEmail}
								placeholder="name@gmail.in"
								placeholderTextColor={Colors.textSubtle}
								keyboardType="email-address"
								autoCapitalize="none"
								autoComplete="email"
							/>
						</View>

						<TouchableOpacity
							style={[styles.primaryButton, loading && styles.disabled]}
							onPress={handleReset}
							disabled={loading}
							activeOpacity={0.85}
						>
							{loading ? (
								<ActivityIndicator color={Colors.textPrimary} size="small" />
							) : (
								<Text style={styles.primaryButtonText}>Send Reset Link</Text>
							)}
						</TouchableOpacity>
					</View>
				) : (
					<View style={styles.successBox}>
						<Text style={styles.successText}>
							Reset link sent to {email}. Check your inbox and spam folder.
						</Text>
					</View>
				)}

				<Link href="/(auth)/sign-in" style={styles.backLink}>
					← Back to Sign In
				</Link>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	flex: { flex: 1, backgroundColor: Colors.background },
	container: { flexGrow: 1, justifyContent: "center", padding: 24, gap: 24 },

	logoSection: { alignItems: "center", marginBottom: 36, gap: 14 },
	logoBox: { width: 96, height: 96, borderRadius: 24, overflow: "hidden" },
	logoImage: { width: 96, height: 96 },
	heading: { fontSize: 30, fontWeight: "700", color: Colors.textPrimary, textAlign: "center" },
	subheading: { fontSize: 15, color: Colors.textMuted, textAlign: "center" },

	form: { gap: 20 },
	field: { gap: 6 },
	label: { fontSize: 13, fontWeight: "500", color: Colors.textMuted },

	input: {
		backgroundColor: Colors.surfaceElevated,
		borderWidth: 1,
		borderColor: Colors.borderLight,
		borderRadius: 8,
		height: 48,
		paddingHorizontal: 14,
		fontSize: 14,
		color: Colors.textPrimary,
	},
	primaryButton: {
		backgroundColor: Colors.primary,
		borderRadius: 8,
		height: 48,
		alignItems: "center",
		justifyContent: "center",
		shadowColor: Colors.primary,
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.4,
		shadowRadius: 20,
		elevation: 8,
	},
	primaryButtonText: { color: Colors.textPrimary, fontSize: 15, fontWeight: "700" },
	disabled: { opacity: 0.5 },
	successBox: {
		backgroundColor: "rgba(16,185,129,0.08)",
		borderWidth: 1,
		borderColor: "rgba(16,185,129,0.25)",
		borderRadius: 8,
		padding: 16,
	},
	successText: { color: Colors.success, fontSize: 14, lineHeight: 20 },
	backLink: { color: Colors.secondary, fontSize: 14, textAlign: "center" },
});
