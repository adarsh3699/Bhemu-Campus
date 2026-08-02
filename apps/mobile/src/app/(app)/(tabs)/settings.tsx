import { ScrollView, View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronRight, Database } from "lucide-react-native";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";
import { Layout } from "@/styles";
import AccountInfo from "@/components/Settings/AccountInfo";
import SecuritySection from "@/components/Settings/SecuritySection";
import ProfileSettings from "@/components/Settings/ProfileSettings";
import LogoutButton from "@/components/Settings/LogoutButton";
import NotificationSettings from "@/components/Settings/NotificationSettings";
import { SettingsCardPressable } from "@/components/Settings/SettingsPrimitives";

const SHOW_UMS_DATA_VIEWER = process.env.EXPO_PUBLIC_SHOW_UMS_DATA_VIEWER === "true";

export default function SettingsTab() {
	const router = useRouter();

	return (
		<SafeAreaView style={Layout.flex} edges={["top"]}>
			<ScrollView
				style={Layout.flex}
				contentContainerStyle={local.scroll}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
				contentInsetAdjustmentBehavior="never"
			>
				<View style={local.toolbar}>
					<Text style={local.toolbarTitle}>Settings</Text>
					<Text style={local.toolbarSubtitle}>Everything you need to manage bCampus.</Text>
				</View>

				<AccountInfo />
				<ProfileSettings />
				<NotificationSettings />

				{SHOW_UMS_DATA_VIEWER ? (
					<SettingsCardPressable
						onPress={() => router.push("/ums-data-viewer" as never)}
						accessibilityLabel="Open UMS data viewer"
					>
						<View style={local.dataViewerIcon}>
							<Database size={17} color={Colors.primary} />
						</View>
						<View style={local.dataViewerText}>
							<Text style={local.dataViewerTitle}>UMS Data Viewer</Text>
							<Text style={local.dataViewerSub}>Developer tool · raw synced data</Text>
						</View>
						<ChevronRight size={18} color={Colors.textSubtle} />
					</SettingsCardPressable>
				) : null}

				<SecuritySection />
				<LogoutButton />
				{/*
					Account/profile deletion is intentionally hidden from the mobile UI for now.
					The underlying deletion logic remains available in DangerZone and GpaDataContext;
					restore a clearly confirmed delete flow here if this feature is enabled again.
				*/}
			</ScrollView>
		</SafeAreaView>
	);
}

const local = StyleSheet.create({
	scroll: {
		paddingHorizontal: Spacing.lg,
		paddingTop: Spacing.lg,
		paddingBottom: Spacing.xxxl + Spacing.xl,
		gap: Spacing.lg,
	},
	toolbar: {
		// gap: Spacing.xs,
		paddingHorizontal: Spacing.xs,
		paddingTop: Spacing.xs,
		paddingBottom: Spacing.sm,
	},
	toolbarTitle: {
		fontSize: FontSize.xxxl,
		fontWeight: FontWeight.bold,
		letterSpacing: -0.5,
		color: Colors.textPrimary,
	},
	toolbarSubtitle: {
		fontSize: FontSize.sm,
		lineHeight: 18,
		color: Colors.textMuted,
	},
	dataViewerIcon: {
		width: 40,
		height: 40,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: Radius.lg,
		backgroundColor: "rgba(3,152,172,0.12)",
	},
	dataViewerText: { flex: 1, gap: 2 },
	dataViewerTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
	dataViewerSub: { fontSize: FontSize.xs, color: Colors.textMuted },
});
