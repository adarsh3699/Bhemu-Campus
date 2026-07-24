// Thin hook that returns the full resolved design system.
// Currently returns static dark-mode tokens (the only theme defined in DESIGN.md).
//
// When light mode is added: update ONLY this file to call useColorScheme() and
// return Colors.dark or Colors.light — every component using useTheme() gets
// the right values automatically without being touched.

import { Colors } from "@/constants/Colors";
import { FontSize, FontWeight, Radius, Shadow, Spacing } from "@/constants/Theme";

export function useTheme() {
	return {
		colors:     Colors,
		spacing:    Spacing,
		radius:     Radius,
		fontSize:   FontSize,
		fontWeight: FontWeight,
		shadow:     Shadow,
	};
}
