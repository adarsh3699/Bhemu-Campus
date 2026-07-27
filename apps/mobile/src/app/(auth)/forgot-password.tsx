import { useState } from "react";
import {
	View,
	Text,
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
import { Colors, Radius, FontSize, Spacing } from "@/constants/Theme";
import { Layout, Buttons } from "@/styles";
import { AuthStyles } from "@/styles/auth.styles";
import AppInput from "@/components/ui/AppInput";

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
		<KeyboardAvoidingView style={Layout.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
			<ScrollView
				contentContainerStyle={[AuthStyles.container, local.containerGap]}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				<View style={AuthStyles.logoSection}>
					<View style={AuthStyles.logoBox}>
						<Image source={require("../../../assets/app_icon.png")} style={AuthStyles.logoImage} />
					</View>
					<Text style={AuthStyles.heading}>Reset password</Text>
					<Text style={AuthStyles.subheading}>
						{sent ? "Check your email for a reset link." : "We'll send you a link to reset it."}
					</Text>
				</View>

				{!sent ? (
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

						<TouchableOpacity
							style={[Buttons.primary, loading && Buttons.disabled]}
							onPress={handleReset}
							disabled={loading}
							activeOpacity={0.85}
						>
							{loading ? (
								<ActivityIndicator color={Colors.textPrimary} size="small" />
							) : (
								<Text style={Buttons.primaryText}>Send Reset Link</Text>
							)}
						</TouchableOpacity>
					</View>
				) : (
					<View style={local.successBox}>
						<Text style={local.successText}>
							Reset link sent to {email}. Check your inbox and spam folder.
						</Text>
					</View>
				)}

				<Link href="/(auth)/sign-in" style={local.backLink}>
					← Back to Sign In
				</Link>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

const local = StyleSheet.create({
	containerGap: { gap: Spacing.xl },
	successBox: {
		backgroundColor: "rgba(16,185,129,0.08)",
		borderWidth: 1,
		borderColor: "rgba(16,185,129,0.25)",
		borderRadius: Radius.md,
		padding: Spacing.lg,
	},
	successText: { color: Colors.success, fontSize: FontSize.base, lineHeight: 20 },
	backLink: { color: Colors.secondary, fontSize: FontSize.base, textAlign: "center" },
});
