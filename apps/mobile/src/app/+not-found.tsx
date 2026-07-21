import { View, Text, StyleSheet } from "react-native";
import { Link } from "expo-router";

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
		backgroundColor: "#0a0a0a",
		gap: 12,
	},
	title: { fontSize: 48, fontWeight: "700", color: "#ffffff" },
	subtitle: { fontSize: 16, color: "#888888" },
	link: { fontSize: 16, color: "#6366f1", marginTop: 8 },
});
