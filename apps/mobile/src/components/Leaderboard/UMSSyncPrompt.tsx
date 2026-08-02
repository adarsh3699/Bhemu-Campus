import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Trophy, BarChart3, Users, RefreshCw, Shield } from "lucide-react-native";
import { Colors, Spacing, FontSize, FontWeight, Radius } from "@/constants/Theme";

const features = [
	{ icon: BarChart3, text: "Your CGPA rank", color: Colors.blue },
	{ icon: Users, text: "Among batchmates", color: Colors.secondary },
	{ icon: Trophy, text: "Top 10 toppers", color: Colors.gold },
] as const;

export default function UMSSyncPrompt() {
	const router = useRouter();

	return (
		<ScrollView style={local.scroll} contentContainerStyle={local.container} showsVerticalScrollIndicator={false}>
			<View style={local.iconWrap}>
				<Trophy size={28} color={Colors.indigo} accessibilityLabel="Leaderboard trophy" />
			</View>

			<Text style={local.title}>See Where You Stand</Text>
			<Text style={local.subtitle}>
				Sync your UMS data to see your CGPA rank among your batchmates. Use the built-in Sync button in the
				bottom navigation to get started.
			</Text>

			<View style={local.features}>
				{features.map((item) => {
					const Icon = item.icon;
					return (
						<View key={item.text} style={local.featureItem}>
							<Icon size={20} color={item.color} />
							<Text style={local.featureText}>{item.text}</Text>
						</View>
					);
				})}
			</View>

			<Pressable
				style={({ pressed }) => [local.ctaBtn, pressed && local.ctaPressed]}
				onPress={() => router.replace("/(app)/(tabs)" as never)}
				accessibilityRole="button"
				accessibilityLabel="Click sync button"
			>
				<RefreshCw size={18} color={Colors.textPrimary} />
				<Text style={local.ctaText}>Click Sync Button in Home</Text>
			</Pressable>

			<View style={local.privacyRow}>
				<Shield size={16} color={Colors.textSubtle} />
				<Text style={local.privacyText}>
					Only your profile name and CGPA are shown publicly. You can change your display name anytime. Opt
					out from Settings whenever you want.
				</Text>
			</View>
		</ScrollView>
	);
}

const local = StyleSheet.create({
	scroll: {
		flex: 1,
	},
	container: {
		flexGrow: 1,
		justifyContent: "flex-start",
		alignItems: "center",
		paddingHorizontal: Spacing.xl,
		paddingTop: Spacing.xxxl,
		paddingBottom: Spacing.xl,
		gap: Spacing.lg,
	},
	iconWrap: {
		width: 56,
		height: 56,
		alignItems: "center",
		justifyContent: "center",
	},
	title: {
		fontSize: FontSize.xxl,
		fontWeight: FontWeight.bold,
		color: Colors.primary,
		textAlign: "center",
	},
	subtitle: {
		fontSize: FontSize.base,
		color: Colors.textMuted,
		textAlign: "center",
		lineHeight: 22,
		maxWidth: 380,
	},
	features: {
		flexDirection: "row",
		width: "100%",
		gap: Spacing.lg,
		marginTop: Spacing.md,
	},
	featureItem: {
		flex: 1,
		alignItems: "center",
		gap: Spacing.sm,
		minHeight: 64,
	},
	featureText: {
		fontSize: FontSize.xs,
		fontWeight: FontWeight.medium,
		color: Colors.textBody,
		flexShrink: 1,
		textAlign: "center",
		lineHeight: 16,
	},
	ctaBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: Spacing.sm,
		minHeight: 52,
		paddingHorizontal: Spacing.xl,
		paddingVertical: Spacing.sm,
		backgroundColor: Colors.primary,
		borderRadius: Radius.lg,
		width: "100%",
	},
	ctaPressed: {
		opacity: 0.82,
	},
	ctaText: {
		fontSize: FontSize.base,
		fontWeight: FontWeight.semibold,
		color: Colors.textPrimary,
	},
	privacyRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: Spacing.sm,
		width: "100%",
		paddingTop: Spacing.lg,
		borderTopWidth: 1,
		borderTopColor: Colors.border,
		marginTop: Spacing.md,
	},
	privacyText: {
		flex: 1,
		fontSize: FontSize.xs,
		color: Colors.textMuted,
		lineHeight: 16,
	},
});
