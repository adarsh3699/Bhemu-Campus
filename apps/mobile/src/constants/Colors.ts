// Design tokens — single source of truth for all colors in the mobile app.
// Mirrors the CSS variables defined in apps/frontend/src/app/globals.css @theme {}.
// Never use raw hex strings in StyleSheet.create — always reference Colors.* here.

export const Colors = {
	// ── Brand ──────────────────────────────────────────────────────────────
	primary:         "#0398AC",   // Teal — main brand, buttons, focus rings
	primaryDark:     "#027A8C",   // Pressed / active state for primary
	accent:          "#004EEB",   // Blue — CTAs, highlights, gradients
	accentLight:     "#2563EB",   // Lighter blue for hover accents
	secondary:       "#00C2FF",   // Cyan — links, secondary highlights
	secondaryDark:   "#0099CC",   // Hover state for secondary/link text

	// ── Backgrounds ────────────────────────────────────────────────────────
	background:      "#0E0E0E",               // Main screen background
	surface:         "#121212",               // Cards, panels
	surfaceElevated: "#1A1A1A",               // Inputs, modals, elevated cards
	surfaceGlass:    "rgba(255,255,255,0.03)", // Glass-card overlay (auth screens)

	// ── Text ───────────────────────────────────────────────────────────────
	textPrimary:     "#FFFFFF",   // Headings, main content
	textMuted:       "#A3A3A3",   // Secondary text, descriptions
	textSubtle:      "#737373",   // Placeholders, disabled text

	// ── Borders ────────────────────────────────────────────────────────────
	border:          "#262626",                    // Default card / divider border
	borderLight:     "rgba(255,255,255,0.1)",      // Subtle input / glass-card borders

	// ── Semantic ───────────────────────────────────────────────────────────
	success:         "#10B981",   // Success states, confirmations
	successLight:    "#34D399",   // Success emphasis, percentile badges
	warning:         "#F59E0B",   // Warning states
	gold:            "#FBBF24",   // Top-3 rank badges, gold highlights
	destructive:     "#EF4444",   // Errors, delete actions

	// ── UI specific ────────────────────────────────────────────────────────
	indigo:          "#818CF8",   // Shared/profile badge accents
	emerald:         "#34D399",   // Edit access badges (same as successLight)
	blue:            "#60A5FA",   // Read-only badges, info accents
	shareCardBg:     "#111827",   // Leaderboard share card background
} as const;

// Useful for exhaustive checks or mapping over all tokens
export type ColorToken = keyof typeof Colors;
