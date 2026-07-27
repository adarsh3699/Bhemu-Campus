import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Spacing, FontSize, FontWeight, Radius } from "@/constants/Theme";
import { Layout } from "@/styles";
import ScreenHeader from "./ScreenHeader";

interface Props {
	title: string;
	icon: React.ReactNode;
}

export default function PlaceholderScreen({ title, icon }: Props) {
	return (
		<SafeAreaView style={Layout.flex} edges={["top"]}>
			<ScreenHeader title={title} />
			<View style={[Layout.flex, local.center]}>
				<View style={local.iconBox}>{icon}</View>
				<Text style={local.title}>{title}</Text>
				<Text style={local.subtitle}>Coming soon</Text>
			</View>
		</SafeAreaView>
	);
}

const local = StyleSheet.create({
	center: { alignItems: "center", justifyContent: "center", gap: Spacing.md },
	iconBox: {
		width: 64,
		height: 64,
		borderRadius: Radius.lg,
		backgroundColor: Colors.surfaceElevated,
		alignItems: "center",
		justifyContent: "center",
	},
	title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
	subtitle: { fontSize: FontSize.base, color: Colors.textMuted },
});
