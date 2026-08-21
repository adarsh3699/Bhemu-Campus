import { StyleSheet } from "react-native";
import { Colors, Spacing, FontSize, FontWeight } from "@/constants/Theme";

export const AuthStyles = StyleSheet.create({
	container: { flexGrow: 1, justifyContent: "center", padding: Spacing.xl },

	logoSection: { alignItems: "center", marginVertical: 60, gap: 14 },
	logoBox: { width: 180, height: 60, borderRadius: Spacing.md, overflow: "hidden" },
	logoImage: { width: 180, height: 60 },

	heading: { fontSize: FontSize.h1, fontWeight: FontWeight.bold, color: Colors.textPrimary, textAlign: "center" },
	subheading: { fontSize: FontSize.md, color: Colors.textMuted, textAlign: "center" },

	form: { gap: 20 },
	field: { gap: Spacing.sm - 2 },
	label: {
		fontSize: FontSize.xs,
		fontWeight: FontWeight.bold,
		color: Colors.textSubtle,
		textTransform: "uppercase",
		letterSpacing: 0.8,
	},

	footer: { flexDirection: "row", justifyContent: "center", marginTop: 28, flexWrap: "wrap" },
	footerText: { color: Colors.textMuted, fontSize: 13 },
	footerLink: { color: Colors.secondary, fontSize: 13, fontWeight: FontWeight.bold },
});
