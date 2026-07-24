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
import { Colors, Spacing, FontSize, FontWeight } from "@/constants/Theme";
import { Layout, Inputs, Buttons, AuthStyles } from "@/styles";

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
		<KeyboardAvoidingView style={Layout.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
			<ScrollView
				contentContainerStyle={AuthStyles.container}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				<View style={AuthStyles.logoSection}>
					<View style={AuthStyles.logoBox}>
						<Image source={require("../../../assets/app_icon.png")} style={AuthStyles.logoImage} />
					</View>
					<Text style={local.appName}>Bhemu Calculator</Text>
				</View>

				<View style={AuthStyles.form}>
					<View style={AuthStyles.field}>
						<Text style={AuthStyles.label}>Email address</Text>
						<TextInput
							style={Inputs.field}
							value={email}
							onChangeText={setEmail}
							placeholder="name@gmail.in"
							placeholderTextColor={Colors.textSubtle}
							keyboardType="email-address"
							autoCapitalize="none"
							autoComplete="email"
						/>
					</View>

					<View style={AuthStyles.field}>
						<View style={local.labelRow}>
							<Text style={AuthStyles.label}>Password</Text>
							<Link href="/(auth)/forgot-password" style={local.forgotLink}>
								Forgot password?
							</Link>
						</View>
						<View style={Inputs.row}>
							<TextInput
								style={Inputs.rowInner}
								value={password}
								onChangeText={setPassword}
								placeholder="••••••••"
								placeholderTextColor={Colors.textSubtle}
								secureTextEntry={!showPassword}
								autoCapitalize="none"
								autoComplete="current-password"
							/>
							<TouchableOpacity onPress={togglePassword} style={Inputs.iconButton} hitSlop={8}>
								{showPassword ? (
									<EyeOff size={20} color={Colors.textMuted} />
								) : (
									<Eye size={20} color={Colors.textMuted} />
								)}
							</TouchableOpacity>
						</View>
					</View>

					<TouchableOpacity
						style={[Buttons.primary, (loading || googleLoading) && Buttons.disabled]}
						onPress={handleLogin}
						disabled={loading || googleLoading}
						activeOpacity={0.85}
					>
						{loading ? (
							<ActivityIndicator color={Colors.textPrimary} size="small" />
						) : (
							<Text style={Buttons.primaryText}>Login</Text>
						)}
					</TouchableOpacity>

					<View style={local.divider}>
						<View style={local.dividerLine} />
						<Text style={local.dividerText}>OR CONTINUE WITH</Text>
						<View style={local.dividerLine} />
					</View>

					<TouchableOpacity
						style={[Buttons.outline, (loading || googleLoading) && Buttons.disabled]}
						onPress={handleGoogleSignIn}
						disabled={loading || googleLoading}
						activeOpacity={0.8}
					>
						{googleLoading ? (
							<ActivityIndicator color={Colors.textPrimary} size="small" />
						) : (
							<Text style={Buttons.outlineText}>Sign in with Google</Text>
						)}
					</TouchableOpacity>
				</View>

				<View style={AuthStyles.footer}>
					<Text style={AuthStyles.footerText}>Don't have an account? </Text>
					<Link href="/(auth)/sign-up" style={AuthStyles.footerLink}>
						Create one
					</Link>
				</View>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

const local = StyleSheet.create({
	appName: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
	labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
	forgotLink: { fontSize: FontSize.xs + 1, fontWeight: FontWeight.semibold, color: Colors.secondary },
	divider: { flexDirection: "row", alignItems: "center", gap: Spacing.sm + 2 },
	dividerLine: { flex: 1, height: 1, backgroundColor: Colors.borderLight },
	dividerText: {
		color: Colors.textSubtle,
		fontSize: 10,
		fontWeight: FontWeight.medium,
		letterSpacing: 1.5,
		textTransform: "uppercase",
	},
});
