import { useState, useCallback } from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	ActivityIndicator,
	Image,
} from "react-native";
import { Link, router } from "expo-router";
import { Eye, EyeOff } from "lucide-react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useMessage } from "@/contexts/MessageContext";
import { Colors } from "@/constants/Colors";

export default function SignIn() {
	const { login, signInWithGoogle } = useAuth();
	const { showMessage } = useMessage();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [googleLoading, setGoogleLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const togglePassword = useCallback(() => setShowPassword((v) => !v), []);

	async function handleLogin() {
		if (!email || !password) {
			showMessage("Please fill in all fields", "warning");
			return;
		}
		setLoading(true);
		try {
			await login(email.trim(), password);
			router.replace("/(app)/(tabs)/");
		} catch (err: unknown) {
			const code = (err as { code?: string }).code;
			const msg =
				code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential"
					? "Invalid email or password"
					: code === "auth/too-many-requests"
						? "Too many attempts. Try again later."
						: "Sign in failed. Please try again.";
			showMessage(msg, "error");
		} finally {
			setLoading(false);
		}
	}

	async function handleGoogleSignIn() {
		setGoogleLoading(true);
		try {
			await signInWithGoogle();
			router.replace("/(app)/(tabs)/");
		} catch (err: unknown) {
			console.error("Google sign-in error:", err);
			const error = err as { code?: string; message?: string };
			const msg =
				error.code === "SIGN_IN_CANCELLED" ? "Sign in cancelled" : error.message || "Google sign in failed";
			showMessage(msg, "error");
		} finally {
			setGoogleLoading(false);
		}
	}

	return (
		<KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
			<ScrollView
				contentContainerStyle={styles.container}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				{/* Big centered logo + app name */}
				<View style={styles.logoSection}>
					<View style={styles.logoBox}>
						<Image source={require("../../../assets/app_icon.png")} style={styles.logoImage} />
					</View>
					<Text style={styles.appName}>Bhemu Calculator</Text>
				</View>

				{/* Form with labels */}
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

					<View style={styles.field}>
						<View style={styles.labelRow}>
							<Text style={styles.label}>Password</Text>
							<Link href="/(auth)/forgot-password" style={styles.forgotLink}>
								Forgot password?
							</Link>
						</View>
						<View style={styles.inputRow}>
							<TextInput
								style={styles.inputFlex}
								value={password}
								onChangeText={setPassword}
								placeholder="••••••••"
								placeholderTextColor={Colors.textSubtle}
								secureTextEntry={!showPassword}
								autoCapitalize="none"
								autoComplete="current-password"
							/>
							<TouchableOpacity onPress={togglePassword} style={styles.eyeBtn} hitSlop={8}>
								{showPassword ? (
									<EyeOff size={20} color={Colors.textMuted} />
								) : (
									<Eye size={20} color={Colors.textMuted} />
								)}
							</TouchableOpacity>
						</View>
					</View>

					<TouchableOpacity
						style={[styles.primaryButton, (loading || googleLoading) && styles.disabled]}
						onPress={handleLogin}
						disabled={loading || googleLoading}
						activeOpacity={0.85}
					>
						{loading ? (
							<ActivityIndicator color={Colors.textPrimary} size="small" />
						) : (
							<Text style={styles.primaryButtonText}>Login</Text>
						)}
					</TouchableOpacity>

					<View style={styles.divider}>
						<View style={styles.dividerLine} />
						<Text style={styles.dividerText}>OR CONTINUE WITH</Text>
						<View style={styles.dividerLine} />
					</View>

					<TouchableOpacity
						style={[styles.googleButton, (loading || googleLoading) && styles.disabled]}
						onPress={handleGoogleSignIn}
						disabled={loading || googleLoading}
						activeOpacity={0.8}
					>
						{googleLoading ? (
							<ActivityIndicator color={Colors.textPrimary} size="small" />
						) : (
							<Text style={styles.googleButtonText}>Sign in with Google</Text>
						)}
					</TouchableOpacity>
				</View>

				<View style={styles.footer}>
					<Text style={styles.footerText}>Don't have an account? </Text>
					<Link href="/(auth)/sign-up" style={styles.link}>
						Create one
					</Link>
				</View>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	flex: { flex: 1, backgroundColor: Colors.background },
	container: { flexGrow: 1, justifyContent: "center", padding: 24 },

	logoSection: { alignItems: "center", marginBottom: 36, gap: 14 },
	logoBox: { width: 96, height: 96, borderRadius: 24, overflow: "hidden" },
	logoImage: { width: 96, height: 96 },
	appName: { fontSize: 24, fontWeight: "700", color: Colors.textPrimary },

	form: { gap: 20 },
	field: { gap: 6 },
	label: { fontSize: 13, fontWeight: "500", color: Colors.textMuted },
	labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

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
	inputRow: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: Colors.surfaceElevated,
		borderWidth: 1,
		borderColor: Colors.borderLight,
		borderRadius: 8,
		height: 48,
	},
	inputFlex: {
		flex: 1,
		paddingHorizontal: 14,
		fontSize: 14,
		color: Colors.textPrimary,
		height: "100%",
	},
	eyeBtn: { paddingHorizontal: 12, height: "100%", justifyContent: "center" },
	forgotLink: { fontSize: 12, fontWeight: "600", color: Colors.secondary },

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

	divider: { flexDirection: "row", alignItems: "center", gap: 10 },
	dividerLine: { flex: 1, height: 1, backgroundColor: Colors.borderLight },
	dividerText: {
		color: Colors.textSubtle,
		fontSize: 10,
		fontWeight: "500",
		letterSpacing: 1.5,
		textTransform: "uppercase",
	},

	googleButton: {
		height: 48,
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
		borderColor: Colors.borderLight,
	},
	googleButtonText: { color: Colors.textPrimary, fontSize: 14, fontWeight: "500" },

	footer: { flexDirection: "row", justifyContent: "center", marginTop: 28, flexWrap: "wrap" },
	footerText: { color: Colors.textMuted, fontSize: 13 },
	link: { color: Colors.secondary, fontSize: 13, fontWeight: "700" },
});
