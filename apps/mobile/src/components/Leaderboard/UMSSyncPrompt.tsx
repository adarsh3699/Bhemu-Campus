import { View, Text, StyleSheet, TouchableOpacity, Linking } from "react-native";
import { Trophy, BarChart3, Users, Puzzle, ArrowRight, Shield } from "lucide-react-native";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";

const EXTENSION_URL = "https://chromewebstore.google.com/detail/bfmmcngnpcmnopnjacnebpnfcohhigkp";

const features = [
	{ icon: BarChart3, text: "Your CGPA rank", color: "#60A5FA" },
	{ icon: Users, text: "Among batchmates", color: "#2DD4BF" },
	{ icon: Trophy, text: "Top 10 toppers", color: "#FBBF24" },
] as const;

export default function UMSSyncPrompt() {
	return (
		<View style={local.container}>
			<View style={local.card}>
				{/* Icon */}
				<View style={local.iconWrap}>
					<Trophy size={28} color="#818CF8" />
				</View>

				{/* Title */}
				<Text style={local.title}>See Where You Stand</Text>
				<Text style={local.subtitle}>
					Sync your UMS data to see your CGPA rank among your batchmates. Connect with the Bhemu Calculator - UMS Sync extension to get started.
				</Text>

				{/* Feature pills */}
				<View style={local.features}>
					{features.map((item) => {
						const Icon = item.icon;
						return (
							<View key={item.text} style={local.featureItem}>
								<Icon size={14} color={item.color} />
								<Text style={local.featureText}>{item.text}</Text>
							</View>
						);
					})}
				</View>

				{/* CTA */}
				<TouchableOpacity
					style={local.ctaBtn}
					onPress={() => Linking.openURL(EXTENSION_URL)}
					activeOpacity={0.7}
				>
					<Puzzle size={16} color={Colors.textPrimary} />
					<Text style={local.ctaText}>Connect UMS Extension</Text>
					<ArrowRight size={16} color={Colors.textPrimary} />
				</TouchableOpacity>

				{/* Privacy note */}
				<View style={local.privacyRow}>
					<Shield size={14} color={Colors.textSubtle} />
					<Text style={local.privacyText}>
						Only your profile name and CGPA are shown publicly. You can change your display name anytime. Opt out from Settings whenever you want.
					</Text>
				</View>
			</View>
		</View>
	);
}

const local = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: Spacing.xl,
	},
	card: {
		width: "100%",
		backgroundColor: Colors.surface,
		borderRadius: Radius.xl,
		borderWidth: 1,
		borderColor: Colors.border,
		padding: Spacing.xl,
		alignItems: "center",
		gap: Spacing.md,
	},
	iconWrap: {
		width: 56,
		height: 56,
		borderRadius: Radius.lg,
		backgroundColor: "rgba(99,102,241,0.1)",
		borderWidth: 1,
		borderColor: "rgba(99,102,241,0.2)",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: Spacing.xs,
	},
	title: {
		fontSize: FontSize.xl,
		fontWeight: FontWeight.bold,
		color: Colors.primary,
	},
	subtitle: {
		fontSize: FontSize.base,
		color: Colors.textMuted,
		textAlign: "center",
		lineHeight: 20,
	},
	features: {
		flexDirection: "row",
		gap: Spacing.sm,
		marginVertical: Spacing.sm,
	},
	featureItem: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.xs + 2,
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.sm,
		backgroundColor: "rgba(255,255,255,0.05)",
		borderRadius: Radius.lg,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.05)",
	},
	featureText: {
		fontSize: FontSize.xs,
		fontWeight: FontWeight.medium,
		color: "rgba(255,255,255,0.9)",
	},
	ctaBtn: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
		paddingHorizontal: Spacing.xl,
		paddingVertical: Spacing.md,
		backgroundColor: Colors.primary,
		borderRadius: Radius.lg,
		marginTop: Spacing.sm,
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
		padding: Spacing.md,
		backgroundColor: "rgba(255,255,255,0.03)",
		borderRadius: Radius.lg,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.06)",
		marginTop: Spacing.sm,
	},
	privacyText: {
		flex: 1,
		fontSize: FontSize.xs,
		color: Colors.textSubtle,
		lineHeight: 16,
	},
});
