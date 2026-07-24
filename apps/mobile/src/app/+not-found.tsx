import { View, Text, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { Colors } from "@/constants/Colors";

export default function NotFound() {
	return (
		<View style={styles.container}>
			<Text style={styles.title}>404</Text>
			<Text style={styles.subtitle}>This screen does not exist.</Text>
			<Link href="/" style={styles.link}>
				Go to home screen
			</Link>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: Colors.background,
		gap: 12,
	},
	title:    { fontSize: 48, fontWeight: "700", color: Colors.textPrimary },
	subtitle: { fontSize: 16, color: Colors.textMuted },
	link:     { fontSize: 16, color: Colors.secondary, marginTop: 8 },
});
