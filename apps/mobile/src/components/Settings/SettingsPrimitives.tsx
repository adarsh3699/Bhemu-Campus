import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "@/constants/Theme";

export type SettingsTone = "neutral" | "teal" | "indigo" | "warning" | "danger";

type SettingsCardProps = {
	children: ReactNode;
	style?: ViewStyle | ViewStyle[];
};

type SettingsHeaderProps = {
	icon: ReactNode;
	title: string;
	subtitle: string;
	tone?: SettingsTone;
	trailing?: ReactNode;
};

type SettingsCardPressableProps = {
	children: ReactNode;
	onPress: () => void;
	disabled?: boolean;
	accessibilityLabel: string;
	style?: ViewStyle | ViewStyle[];
};

type SettingsRowProps = {
	icon?: ReactNode;
	title: string;
	subtitle?: string;
	trailing?: ReactNode;
	onPress?: () => void;
	disabled?: boolean;
	accessibilityLabel?: string;
	accessibilityState?: { disabled?: boolean; expanded?: boolean };
	style?: ViewStyle | ViewStyle[];
};

const iconBackgrounds: Record<SettingsTone, string> = {
	neutral: Colors.surfaceElevated,
	teal: "rgba(3,152,172,0.12)",
	indigo: "rgba(129,140,248,0.12)",
	warning: "rgba(245,158,11,0.12)",
	danger: "rgba(239,68,68,0.12)",
};

export function SettingsCard({ children, style }: SettingsCardProps) {
	return <View style={[styles.card, style]}>{children}</View>;
}

export function SettingsCardPressable({
	children,
	onPress,
	disabled = false,
	accessibilityLabel,
	style,
}: SettingsCardPressableProps) {
	return (
		<Pressable
			style={({ pressed }) => [
				styles.card,
				styles.cardPressable,
				style,
				pressed && styles.pressed,
				disabled && styles.disabled,
			]}
			onPress={onPress}
			disabled={disabled}
			android_ripple={{ color: Colors.border }}
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel}
			accessibilityState={{ disabled }}
		>
			{children}
		</Pressable>
	);
}

export function SettingsHeader({ icon, title, subtitle, tone = "neutral", trailing }: SettingsHeaderProps) {
	return (
		<View style={styles.header}>
			<View style={[styles.headerIcon, { backgroundColor: iconBackgrounds[tone] }]}>{icon}</View>
			<View style={styles.headerContent}>
				<Text style={styles.headerTitle}>{title}</Text>
				<Text style={styles.headerSubtitle} numberOfLines={2}>
					{subtitle}
				</Text>
			</View>
			{trailing}
		</View>
	);
}

export function SettingsDivider() {
	return <View style={styles.divider} />;
}

export function SettingsRow({
	icon,
	title,
	subtitle,
	trailing,
	onPress,
	disabled = false,
	accessibilityLabel,
	accessibilityState,
	style,
}: SettingsRowProps) {
	const content = (
		<>
			{icon ? <View style={styles.rowIcon}>{icon}</View> : null}
			<View style={styles.rowContent}>
				<Text style={styles.rowTitle} numberOfLines={2}>
					{title}
				</Text>
				{subtitle ? (
					<Text style={styles.rowSubtitle} numberOfLines={2}>
						{subtitle}
					</Text>
				) : null}
			</View>
			{trailing}
		</>
	);

	if (!onPress) {
		return <View style={[styles.row, style]}>{content}</View>;
	}

	return (
		<Pressable
			style={({ pressed }) => [styles.row, style, pressed && styles.pressed, disabled && styles.disabled]}
			onPress={onPress}
			disabled={disabled}
			android_ripple={{ color: Colors.border }}
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel ?? title}
			accessibilityState={{ ...accessibilityState, disabled }}
		>
			{content}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: Colors.surface,
		borderRadius: Radius.xl,
		borderCurve: "continuous",
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: Colors.border,
		overflow: "hidden",
	},
	cardPressable: {
		minHeight: 72,
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.md,
		paddingHorizontal: Spacing.xl,
		paddingVertical: Spacing.sm,
	},
	header: {
		minHeight: 80,
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.md,
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.md,
	},
	headerIcon: {
		width: 40,
		height: 40,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: Radius.lg,
	},
	headerContent: {
		flex: 1,
		gap: 3,
	},
	headerTitle: {
		fontSize: FontSize.md,
		fontWeight: FontWeight.semibold,
		color: Colors.textPrimary,
	},
	headerSubtitle: {
		fontSize: FontSize.xs,
		lineHeight: 16,
		color: Colors.textSubtle,
	},
	divider: {
		height: StyleSheet.hairlineWidth,
		marginHorizontal: Spacing.xl,
		backgroundColor: Colors.border,
	},
	row: {
		minHeight: 72,
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.md,
		paddingHorizontal: Spacing.xl,
		paddingVertical: Spacing.sm,
	},
	rowIcon: {
		width: 32,
		alignItems: "center",
		justifyContent: "center",
	},
	rowContent: {
		flex: 1,
		gap: 3,
		minWidth: 0,
	},
	rowTitle: {
		fontSize: FontSize.base,
		fontWeight: FontWeight.medium,
		color: Colors.textPrimary,
	},
	rowSubtitle: {
		fontSize: FontSize.xs,
		lineHeight: 16,
		color: Colors.textMuted,
	},
	pressed: {
		backgroundColor: Colors.surfaceElevated,
	},
	disabled: {
		opacity: 0.55,
	},
});
