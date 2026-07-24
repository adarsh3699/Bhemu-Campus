import { View, Text, StyleSheet } from "react-native";
import { Colors, FontSize, FontWeight } from "@/constants/Theme";
import { Layout } from "@/styles";

export default function LeaderboardTab() {
	return (
		<View style={[Layout.flex, local.center]}>
			<Text style={local.title}>Leaderboard</Text>
			<Text style={local.subtitle}>Coming in Phase 7</Text>
		</View>
	);
}

const local = StyleSheet.create({
	center: { alignItems: "center", justifyContent: "center" },
	title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
	subtitle: { fontSize: FontSize.base, color: Colors.textMuted, marginTop: 8 },
});
