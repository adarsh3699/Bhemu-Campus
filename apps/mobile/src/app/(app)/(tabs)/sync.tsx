import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RefreshCw, CloudUpload, CheckCircle } from "lucide-react-native";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";
import { Layout } from "@/styles";

export default function SyncTab() {
	return (
		<SafeAreaView style={Layout.flex} edges={["top"]}>
			<View style={[Layout.flex, local.center]}>
				<View style={local.iconBox}>
					<RefreshCw size={36} color={Colors.primary} />
				</View>
				<Text style={local.title}>Sync with UMS</Text>
				<Text style={local.subtitle}>Import your data from the university portal</Text>

				<TouchableOpacity style={local.syncBtn} activeOpacity={0.7}>
					<CloudUpload size={18} color={Colors.textPrimary} />
					<Text style={local.syncBtnText}>Sync Now</Text>
				</TouchableOpacity>

				<Text style={local.hint}>
					Make sure you have the UMS extension installed
				</Text>
			</View>
		</SafeAreaView>
	);
}

const local = StyleSheet.create({
	center: { alignItems: "center", justifyContent: "center", padding: Spacing.xl, gap: Spacing.md },
	iconBox: {
		width: 72,
		height: 72,
		borderRadius: 36,
		backgroundColor: Colors.surfaceElevated,
		borderWidth: 1,
		borderColor: Colors.border,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: Spacing.sm,
	},
	title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
	subtitle: { fontSize: FontSize.base, color: Colors.textMuted, textAlign: "center" },
	syncBtn: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
		paddingHorizontal: Spacing.xl,
		paddingVertical: Spacing.md,
		backgroundColor: Colors.primary,
		borderRadius: Radius.xl,
		marginTop: Spacing.lg,
		shadowColor: Colors.primary,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.4,
		shadowRadius: 10,
		elevation: 6,
	},
	syncBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
	hint: { fontSize: FontSize.xs, color: Colors.textSubtle, marginTop: Spacing.md, textAlign: "center" },
});
