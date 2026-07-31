import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { LogOut } from "lucide-react-native";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "@/constants/Theme";
import { useAuth } from "@/contexts/AuthContext";
import { useMessage } from "@/contexts/MessageContext";

export default function LogoutButton() {
	const { logout } = useAuth();
	const { showMessage } = useMessage();
	const [loggingOut, setLoggingOut] = useState(false);

	const handleLogout = async () => {
		if (loggingOut) return;
		setLoggingOut(true);
		try {
			await logout();
		} catch {
			setLoggingOut(false);
			showMessage("Unable to log out. Please try again.", "error");
		}
	};

	const confirmLogout = () => {
		Alert.alert(
			"Log out of bCampus?",
			"Your data stays safe in your account. We’ll only clear this device’s saved data. You can sync again with UMS anytime.",
			[
				{ text: "Cancel", style: "cancel" },
				{ text: "Log out", style: "destructive", onPress: () => void handleLogout() },
			]
		);
	};

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel="Log out"
			onPress={confirmLogout}
			disabled={loggingOut}
			style={({ pressed }) => [local.card, pressed && local.pressed, loggingOut && local.disabled]}
		>
			<View style={local.iconWrap}>
				{loggingOut ? (
					<ActivityIndicator size="small" color={Colors.destructive} />
				) : (
					<LogOut size={18} color={Colors.destructive} />
				)}
			</View>
			<View style={local.content}>
				<Text style={local.title}>Log out</Text>
				<Text style={local.subtitle}>Clear saved data on this device</Text>
			</View>
		</Pressable>
	);
}

const local = StyleSheet.create({
	card: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.md,
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		borderWidth: 1,
		borderColor: "rgba(239,68,68,0.2)",
		padding: Spacing.lg,
	},
	pressed: { opacity: 0.78 },
	disabled: { opacity: 0.55 },
	iconWrap: {
		width: 36,
		height: 36,
		borderRadius: Radius.md,
		backgroundColor: "rgba(239,68,68,0.1)",
		alignItems: "center",
		justifyContent: "center",
	},
	content: { flex: 1, gap: 2 },
	title: {
		fontSize: FontSize.base,
		fontWeight: FontWeight.semibold,
		color: Colors.destructive,
	},
	subtitle: { fontSize: FontSize.xs, color: Colors.textMuted },
});
