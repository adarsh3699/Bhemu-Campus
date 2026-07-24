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
					<Text style={styles.heading}>Create account</Text>
					<Text style={styles.subheading}>Join thousands of LPU students.</Text>
				</View>

				{/* Form with labels */}
				<View style={styles.form}>
					<View style={styles.field}>
						<Text style={styles.label}>Full Name</Text>
						<TextInput
							style={styles.input}
							value={name}
							onChangeText={setName}
							placeholder="Your name"
							placeholderTextColor={Colors.textSubtle}
							autoCapitalize="words"
							autoComplete="name"
						/>
					</View>

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
						<Text style={styles.label}>Password</Text>
						<View style={styles.inputRow}>
							<TextInput
								style={styles.inputFlex}
								value={password}
								onChangeText={setPassword}
								placeholder="Min. 6 characters"
								placeholderTextColor={Colors.textSubtle}
								secureTextEntry={!showPassword}
								autoCapitalize="none"
								autoComplete="new-password"
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
						style={[styles.primaryButton, loading && styles.disabled]}
						onPress={handleSignUp}
						disabled={loading}
						activeOpacity={0.85}
					>
						{loading ? (
							<ActivityIndicator color={Colors.textPrimary} size="small" />
						) : (
							<Text style={styles.primaryButtonText}>Create Account</Text>
						)}
					</TouchableOpacity>
				</View>

				<View style={styles.footer}>
					<Text style={styles.footerText}>Already have an account? </Text>
					<Link href="/(auth)/sign-in" style={styles.link}>
						Sign in
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

	primaryButton: {
		backgroundColor: Colors.primary,
		borderRadius: 8,
		height: 48,
		alignItems: "center",
		justifyContent: "center",
		marginTop: 4,
		shadowColor: Colors.primary,
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.4,
		shadowRadius: 20,
		elevation: 8,
	},
	primaryButtonText: { color: Colors.textPrimary, fontSize: 15, fontWeight: "700" },
	disabled: { opacity: 0.5 },

	footer: { flexDirection: "row", justifyContent: "center", marginTop: 28, flexWrap: "wrap" },
	footerText: { color: Colors.textMuted, fontSize: 13 },
	link: { color: Colors.secondary, fontSize: 13, fontWeight: "700" },
});
