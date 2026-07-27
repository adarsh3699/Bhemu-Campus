import { useState, forwardRef } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, type TextInputProps, type ViewStyle } from "react-native";
import type { ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react-native";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";

interface AppInputProps extends TextInputProps {
	label?: ReactNode;
	error?: boolean;
	size?: "sm" | "md" | "lg";
	containerStyle?: ViewStyle;
}

const HEIGHTS = { sm: 40, md: 44, lg: 48 } as const;

const AppInput = forwardRef<TextInput, AppInputProps>(function AppInput(
	{ label, error, size = "lg", containerStyle, secureTextEntry, style, ...rest },
	ref
) {
	const [secure, setSecure] = useState(true);
	const isPassword = secureTextEntry === true;
	const height = HEIGHTS[size];

	return (
		<View style={[local.wrap, containerStyle]}>
			{label && <Text style={local.label}>{label}</Text>}
			<View style={[local.inputWrap, { height }, error && local.inputWrapError]}>
				<TextInput
					ref={ref}
					{...rest}
					secureTextEntry={isPassword ? secure : false}
					placeholderTextColor={Colors.textSubtle}
					style={[local.input, isPassword && local.inputWithEye, style]}
				/>
				{isPassword && (
					<TouchableOpacity onPress={() => setSecure((v) => !v)} style={local.eyeBtn} hitSlop={8}>
						{secure ? (
							<Eye size={20} color={Colors.textMuted} />
						) : (
							<EyeOff size={20} color={Colors.textMuted} />
						)}
					</TouchableOpacity>
				)}
			</View>
		</View>
	);
});

export default AppInput;

const local = StyleSheet.create({
	wrap: { gap: 6 },
	label: {
		fontSize: FontSize.xs,
		fontWeight: FontWeight.semibold,
		color: Colors.textMuted,
		textTransform: "uppercase",
		letterSpacing: 0.8,
	},
	inputWrap: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: Colors.surfaceElevated,
		borderWidth: 1,
		borderColor: Colors.borderLight,
		borderRadius: Radius.md,
		overflow: "hidden",
	},
	inputWrapError: {
		borderColor: Colors.destructive,
	},
	input: {
		flex: 1,
		height: "100%",
		paddingHorizontal: Spacing.md,
		fontSize: FontSize.base,
		color: Colors.textPrimary,
	},
	inputWithEye: {
		paddingRight: 0,
	},
	eyeBtn: {
		paddingHorizontal: Spacing.md,
		height: "100%",
		justifyContent: "center",
	},
});
