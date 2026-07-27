import { ScrollView, View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Spacing, FontSize, FontWeight } from "@/constants/Theme";
import { Layout } from "@/styles";
import AccountInfo from "@/components/Settings/AccountInfo";
import SecuritySection from "@/components/Settings/SecuritySection";
import ProfileSettings from "@/components/Settings/ProfileSettings";
import DangerZone from "@/components/Settings/DangerZone";

export default function SettingsTab() {
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
});
