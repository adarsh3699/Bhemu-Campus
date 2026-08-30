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
import Svg, { Path } from "react-native-svg";
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
							<View style={local.googleBtnRow}>
								<Svg width={20} height={20} viewBox="0 0 24 24">
									<Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
									<Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
									<Path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
									<Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
								</Svg>
								<Text style={Buttons.outlineText}>Sign in with Google</Text>
							</View>
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
	googleBtnRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
});
