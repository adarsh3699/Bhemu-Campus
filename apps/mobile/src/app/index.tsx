import { View, Text, StyleSheet } from "react-native";

export default function Index() {
	return (
		<View style={styles.container}>
			<Text style={styles.title}>Bhemu Calculator</Text>
			<Text style={styles.subtitle}>Mobile App — Phase 1 Scaffold</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#0a0a0a",
		gap: 8,
	},
	title: {
		fontSize: 24,
		fontWeight: "700",
		color: "#ffffff",
	},
	subtitle: {
		fontSize: 14,
		color: "#888888",
	},
});
