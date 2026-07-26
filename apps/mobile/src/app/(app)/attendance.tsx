import { View, Text, StyleSheet } from "react-native";
import { Colors, FontSize, FontWeight, Spacing } from "@/constants/Theme";
import { Layout } from "@/styles";

export default function AttendanceTab() {
	return (
		<View style={Layout.center}>
			<Text style={local.title}>Attendance</Text>
			<Text style={local.subtitle}>Coming soon</Text>
		</View>
	);
}

const local = StyleSheet.create({
	title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
	subtitle: { fontSize: FontSize.base, color: Colors.textMuted, marginTop: Spacing.xs },
});
