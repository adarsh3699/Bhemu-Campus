import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/constants/Colors";

export default function HomeTab() {
	const { currentUser, logout } = useAuth();

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Welcome!</Text>
			<Text style={styles.email}>{currentUser?.email}</Text>
			<TouchableOpacity style={styles.button} onPress={logout}>
				<Text style={styles.buttonText}>Sign Out</Text>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	container:  { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.background, gap: 12 },
	title:      { fontSize: 24, fontWeight: "700", color: Colors.textPrimary },
	email:      { fontSize: 14, color: Colors.textMuted },
	button:     { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: Colors.primary, borderRadius: 8 },
	buttonText: { color: Colors.textPrimary, fontWeight: "600" },
});
