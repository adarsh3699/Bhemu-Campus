import { View, Text, TextInput, StyleSheet, type ViewStyle } from "react-native";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";
import type { MarkDetail } from "./types";

interface Props {
	label: string;
	value: MarkDetail;
	onChange: (v: MarkDetail) => void;
	style?: ViewStyle;
}

export default function MarkInput({ label, value, onChange, style }: Props) {
	return (
		<View style={[local.wrap, style]}>
			<Text style={local.label}>{label}</Text>
			<View style={local.row}>
				<TextInput
					style={local.obtInput}
					value={value.obt}
					onChangeText={(v) => {
						const num = parseFloat(v);
						const clamped = !isNaN(num) && num > value.max ? String(value.max) : v;
						onChange({ ...value, obt: clamped });
					}}
					placeholder="Obtained"
					placeholderTextColor={Colors.textSubtle}
					keyboardType="decimal-pad"
				/>
				<Text style={local.slash}>/</Text>
				<TextInput
					style={local.maxInput}
					value={String(value.max)}
					onChangeText={(v) => onChange({ ...value, max: parseFloat(v) || 0 })}
					keyboardType="decimal-pad"
					selectTextOnFocus
				/>
			</View>
		</View>
	);
}

const local = StyleSheet.create({
	wrap: { gap: 6 },
	label: {
		fontSize: FontSize.xs,
		fontWeight: FontWeight.semibold,
		color: Colors.textMuted,
		textTransform: "uppercase",
		letterSpacing: 0.8,
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
	},
	obtInput: {
		flex: 1,
		height: 44,
		backgroundColor: Colors.surfaceElevated,
		borderRadius: Radius.md,
		borderWidth: 1,
		borderColor: Colors.borderLight,
		paddingHorizontal: Spacing.md,
		fontSize: FontSize.base,
		color: Colors.textPrimary,
	},
	slash: {
		fontSize: FontSize.lg,
		fontWeight: FontWeight.bold,
		color: Colors.textSubtle,
	},
	maxInput: {
		width: 64,
		height: 44,
		backgroundColor: Colors.surfaceElevated,
		borderRadius: Radius.md,
		borderWidth: 1,
		borderColor: Colors.border,
		paddingHorizontal: Spacing.sm,
		fontSize: FontSize.base,
		fontWeight: FontWeight.semibold,
		color: Colors.textMuted,
		textAlign: "center",
	},
});
