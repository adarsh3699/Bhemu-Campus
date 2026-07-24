import { StyleSheet } from "react-native";
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from "@/constants/Theme";

export const Layout = StyleSheet.create({
	flex: { flex: 1, backgroundColor: Colors.background },
	center: { flex: 1, alignItems: "center", justifyContent: "center" },
	row: { flexDirection: "row", alignItems: "center" },
});

export const Inputs = StyleSheet.create({
	field: {
		backgroundColor: Colors.surfaceElevated,
		borderWidth: 1,
		borderColor: Colors.borderLight,
		borderRadius: Radius.md,
		height: 48,
		paddingHorizontal: 14,
		fontSize: FontSize.base,
		color: Colors.textPrimary,
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: Colors.surfaceElevated,
		borderWidth: 1,
		borderColor: Colors.borderLight,
		borderRadius: Radius.md,
		height: 48,
	},
	rowInner: {
		flex: 1,
		paddingHorizontal: 14,
		fontSize: FontSize.base,
		color: Colors.textPrimary,
		height: "100%",
	},
	iconButton: { paddingHorizontal: Spacing.md, height: "100%", justifyContent: "center" },
});

export const Buttons = StyleSheet.create({
	primary: {
		backgroundColor: Colors.primary,
		borderRadius: Radius.md,
		height: 48,
		alignItems: "center",
		justifyContent: "center",
		...Shadow.glow,
	},
	primaryText: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
	outline: {
		height: 48,
		borderRadius: Radius.md,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
		borderColor: Colors.borderLight,
	},
	outlineText: { color: Colors.textPrimary, fontSize: FontSize.base, fontWeight: FontWeight.medium },
	disabled: { opacity: 0.5 },
});
