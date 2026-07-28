import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Database } from "lucide-react-native";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";
import { Layout } from "@/styles";
import AccountInfo from "@/components/Settings/AccountInfo";
import SecuritySection from "@/components/Settings/SecuritySection";
import ProfileSettings from "@/components/Settings/ProfileSettings";
import DangerZone from "@/components/Settings/DangerZone";

export default function SettingsTab() {
	const router = useRouter();

	return (
		<SafeAreaView style={Layout.flex} edges={["top"]}>
			<ScrollView
				contentContainerStyle={local.scroll}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
			>
				<View style={local.toolbar}>
					<Text style={local.toolbarTitle}>Settings</Text>
				</View>

				<AccountInfo />
				<ProfileSettings />

				<TouchableOpacity
					style={local.dataViewerBtn}
					onPress={() => router.push("/ums-data-viewer" as never)}
					activeOpacity={0.7}
				>
					<Database size={18} color={Colors.textMuted} />
					<View style={local.dataViewerText}>
						<Text style={local.dataViewerTitle}>UMS Data Viewer</Text>
						<Text style={local.dataViewerSub}>View raw synced data for debugging</Text>
					</View>
				</TouchableOpacity>

				<SecuritySection />
				<DangerZone />
			</ScrollView>
		</SafeAreaView>
	);
}

const local = StyleSheet.create({
	scroll: {
		padding: Spacing.lg,
		paddingBottom: Spacing.xxxl,
		gap: Spacing.lg,
	},
	toolbar: {
		marginBottom: Spacing.xs,
	},
	toolbarTitle: {
		fontSize: FontSize.xl,
		fontWeight: FontWeight.bold,
		color: Colors.textPrimary,
	},
	dataViewerBtn: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.md,
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		borderWidth: 1,
		borderColor: Colors.border,
		padding: Spacing.lg,
	},
	dataViewerText: { flex: 1, gap: 2 },
	dataViewerTitle: { fontSize: FontSize.base, fontWeight: FontWeight.medium, color: Colors.textPrimary },
	dataViewerSub: { fontSize: FontSize.xs, color: Colors.textMuted },
});
