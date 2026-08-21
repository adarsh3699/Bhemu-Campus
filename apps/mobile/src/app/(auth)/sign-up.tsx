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
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Theme";
import { Layout, Buttons, AuthStyles } from "@/styles";
import AppInput from "@/components/ui/AppInput";

export default function SignUp() {
	const { signup } = useAuth();
	const { showMessage } = useMessage();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);

	async function handleSignUp() {
		if (!name || !email || !password) {
			showMessage("Please fill in all fields", "warning");
			return;
		}
		if (password.length < 6) {
			showMessage("Password must be at least 6 characters", "warning");
			return;
		}
		setLoading(true);
		try {
			await signup(email.trim(), password, name.trim());
			router.replace("/(app)/(tabs)/");
		} catch (err: unknown) {
			const code = (err as { code?: string }).code;
			const msg =
				code === "auth/email-already-in-use"
					? "An account with this email already exists"
					: code === "auth/invalid-email"
						? "Please enter a valid email address"
						: code === "auth/weak-password"
							? "Password is too weak"
							: "Sign up failed. Please try again.";
			showMessage(msg, "error");
		} finally {
			setLoading(false);
		}
	}

	return (
		<KeyboardAvoidingView style={Layout.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
			<ScrollView
				contentContainerStyle={AuthStyles.container}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				<View style={local.logoSection}>
					<View style={local.logoBox}>
						<Image source={require("../../../assets/logo_only.png")} style={local.logoImage} />
					</View>
					<Text style={AuthStyles.heading}>Create account</Text>
					<Text style={AuthStyles.subheading}>Join thousands of LPU students.</Text>
				</View>

				<View style={AuthStyles.form}>
					<AppInput
						label="Full Name"
						value={name}
						onChangeText={setName}
						placeholder="Your name"
						autoCapitalize="words"
						autoComplete="name"
					/>

					<AppInput
						label="Email address"
						value={email}
						onChangeText={setEmail}
						placeholder="name@gmail.in"
						keyboardType="email-address"
						autoCapitalize="none"
						autoComplete="email"
					/>

					<AppInput
						label="Password"
						value={password}
						onChangeText={setPassword}
						placeholder="Min. 6 characters"
						secureTextEntry
						autoCapitalize="none"
						autoComplete="new-password"
					/>

					<TouchableOpacity
						style={[Buttons.primary, local.buttonMargin, loading && Buttons.disabled]}
						onPress={handleSignUp}
						disabled={loading}
						activeOpacity={0.85}
					>
						{loading ? (
							<ActivityIndicator color={Colors.textPrimary} size="small" />
						) : (
							<Text style={Buttons.primaryText}>Create Account</Text>
						)}
					</TouchableOpacity>
				</View>

				<View style={AuthStyles.footer}>
					<Text style={AuthStyles.footerText}>Already have an account? </Text>
					<Link href="/(auth)/sign-in" style={AuthStyles.footerLink}>
						Sign in
					</Link>
				</View>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

const local = StyleSheet.create({
	buttonMargin: { marginTop: 4 },
	logoSection: { alignItems: "center", marginBottom: 36, gap: 14 },
	logoBox: { width: 98, height: 98, borderRadius: Spacing.md, overflow: "hidden" },
	logoImage: { width: 98, height: 98 },
});
