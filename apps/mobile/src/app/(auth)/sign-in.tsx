import { useState } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	ActivityIndicator,
	Image,
} from "react-native";
import { Link, router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useMessage } from "@/contexts/MessageContext";
import { Colors, Spacing, FontSize, FontWeight } from "@/constants/Theme";
import { Layout, Buttons, AuthStyles } from "@/styles";
import AppInput from "@/components/ui/AppInput";

export default function SignIn() {
	const { login, signInWithGoogle } = useAuth();
	const { showMessage } = useMessage();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [googleLoading, setGoogleLoading] = useState(false);

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
						<Image source={require("../../../assets/text_only.png")} style={AuthStyles.logoImage} />
					</View>
					{/* <Text style={local.appName}>bCampus</Text> */}
				</View>

				<View style={AuthStyles.form}>
					<AppInput
						label="Email address"
						value={email}
						onChangeText={setEmail}
						placeholder="name@gmail.in"
						keyboardType="email-address"
						autoCapitalize="none"
						autoComplete="email"
					/>

					<View style={AuthStyles.field}>
						<View style={local.labelRow}>
							<Text style={AuthStyles.label}>Password</Text>
							<Link href="/(auth)/forgot-password" style={local.forgotLink}>
								Forgot password?
							</Link>
						</View>
						<AppInput
							value={password}
							onChangeText={setPassword}
							placeholder="••••••••"
							secureTextEntry
							autoCapitalize="none"
							autoComplete="current-password"
						/>
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
