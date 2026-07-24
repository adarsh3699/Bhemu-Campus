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
import { Layout, Inputs, Buttons, AuthStyles } from "@/styles";

export default function SignUp() {
	const { signup } = useAuth();
	const { showMessage } = useMessage();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const togglePassword = useCallback(() => setShowPassword((v) => !v), []);

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
				<View style={AuthStyles.logoSection}>
					<View style={AuthStyles.logoBox}>
						<Image source={require("../../../assets/app_icon.png")} style={AuthStyles.logoImage} />
					</View>
					<Text style={AuthStyles.heading}>Create account</Text>
					<Text style={AuthStyles.subheading}>Join thousands of LPU students.</Text>
				</View>

				<View style={AuthStyles.form}>
					<View style={AuthStyles.field}>
						<Text style={AuthStyles.label}>Full Name</Text>
						<TextInput
							style={Inputs.field}
							value={name}
							onChangeText={setName}
							placeholder="Your name"
							placeholderTextColor={Colors.textSubtle}
							autoCapitalize="words"
							autoComplete="name"
						/>
					</View>

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
						<Text style={AuthStyles.label}>Password</Text>
						<View style={Inputs.row}>
							<TextInput
								style={Inputs.rowInner}
								value={password}
								onChangeText={setPassword}
								placeholder="Min. 6 characters"
								placeholderTextColor={Colors.textSubtle}
								secureTextEntry={!showPassword}
								autoCapitalize="none"
								autoComplete="new-password"
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
});
