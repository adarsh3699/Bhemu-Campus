import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Colors, Spacing, FontSize, FontWeight } from "@/constants/Theme";

interface Props {
	title: string;
}

export default function ScreenHeader({ title }: Props) {
	const router = useRouter();

	return (
		<View style={local.wrap}>
			<TouchableOpacity onPress={() => router.back()} hitSlop={8} style={local.backBtn}>
				<ArrowLeft size={22} color={Colors.textBody} />
			</TouchableOpacity>
			<Text style={local.title}>{title}</Text>
		</View>
	);
}

const local = StyleSheet.create({
	wrap: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.md,
	},
	backBtn: {
		width: 36,
		height: 36,
		alignItems: "center",
		justifyContent: "center",
	},
	title: {
		fontSize: FontSize.md,
		fontWeight: FontWeight.semibold,
		color: Colors.textBody,
	},
});
