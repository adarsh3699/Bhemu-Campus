// Full design system — spacing, radius, typography, and shadow tokens.
// Import { Colors } from here as a convenience so callers only need one import.

import { Colors } from "./Colors";

export const Spacing = {
	xs: 4,
	sm: 8,
	md: 12,
	lg: 16,
	xl: 24,
	xxl: 32,
	xxxl: 48,
} as const;

export const Radius = {
	sm: 6,
	md: 8,
	lg: 12,
	xl: 16,
	full: 9999,
} as const;

export const FontSize = {
	xs: 11,
	sm: 12,
	base: 14,
	md: 15,
	lg: 18,
	xl: 20,
	xxl: 24,
	xxxl: 28,
	h1: 30,
} as const;

export const FontWeight = {
	regular: "400",
	medium: "500",
	semibold: "600",
	bold: "700",
	extrabold: "800",
} as const;

// Shadow tokens — use spread into StyleSheet objects
// e.g. StyleSheet.create({ btn: { ...Shadow.glow, borderRadius: Radius.md } })
export const Shadow = {
	// Primary brand glow — use on CTAs and focused inputs
	glow: {
		shadowColor: Colors.primary,
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.4,
		shadowRadius: 20,
		elevation: 8,
	},
	// Soft depth shadow — use on cards and modals
	card: {
		shadowColor: "#000000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.6,
		shadowRadius: 20,
		elevation: 6,
	},
} as const;

// Re-export Colors so callers can `import { Colors, Spacing, Radius } from '@/constants/Theme'`
export { Colors };
