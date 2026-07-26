import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { Colors, Spacing, FontSize, FontWeight, Radius } from "@/constants/Theme";
import { Layout } from "@/styles";

interface Props {
	title: string;
	icon: React.ReactNode;
}

export default function PlaceholderScreen({ title, icon }: Props) {
	const router = useRouter();

	return (
		<SafeAreaView style={Layout.flex} edges={["top"]}>
			<View style={local.header}>
				<TouchableOpacity onPress={() => router.back()} hitSlop={8}>
					<ArrowLeft size={22} color={Colors.textPrimary} />
				</TouchableOpacity>
				<Text style={local.headerTitle}>{title}</Text>
				<View style={{ width: 22 }} />
			</View>

			<View style={[Layout.flex, local.center]}>
				<View style={local.iconBox}>{icon}</View>
				<Text style={local.title}>{title}</Text>
				<Text style={local.subtitle}>Coming soon</Text>
			</View>
		</SafeAreaView>
	);
}

const local = StyleSheet.create({
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.md,
		borderBottomWidth: 1,
		borderBottomColor: Colors.border,
	},
	headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
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
