import { useState } from "react";
import {
	View, Text, StyleSheet, Modal, TouchableOpacity,
	TextInput, KeyboardAvoidingView, Platform,
} from "react-native";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";
import { Inputs, Buttons } from "@/styles";

interface InputModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: (value: string) => void;
	title: string;
	placeholder?: string;
	confirmText?: string;
	cancelText?: string;
	initialValue?: string;
}

export default function InputModal({
	isOpen,
	onClose,
	onConfirm,
	title,
	placeholder = "Enter value",
	confirmText = "Confirm",
	cancelText = "Cancel",
	initialValue = "",
}: InputModalProps) {
	const [value, setValue] = useState(initialValue);

	const handleConfirm = () => {
		if (!value.trim()) return;
		onConfirm(value.trim());
		setValue("");
		onClose();
	};

	const handleClose = () => {
		setValue("");
		onClose();
	};

	return (
		<Modal visible={isOpen} transparent animationType="fade" onRequestClose={handleClose}>
			<KeyboardAvoidingView
				style={local.overlay}
				behavior={Platform.OS === "ios" ? "padding" : undefined}
			>
				<View style={local.card}>
					<Text style={local.title}>{title}</Text>
					<TextInput
						style={[Inputs.field, local.input]}
						value={value}
						onChangeText={setValue}
						placeholder={placeholder}
						placeholderTextColor={Colors.textSubtle}
						autoFocus
						onSubmitEditing={handleConfirm}
						returnKeyType="done"
					/>
					<View style={local.buttons}>
						<TouchableOpacity style={local.cancelBtn} onPress={handleClose} activeOpacity={0.8}>
							<Text style={local.cancelText}>{cancelText}</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[Buttons.primary, local.confirmBtn, !value.trim() && Buttons.disabled]}
							onPress={handleConfirm}
							disabled={!value.trim()}
							activeOpacity={0.8}
						>
							<Text style={Buttons.primaryText}>{confirmText}</Text>
						</TouchableOpacity>
					</View>
				</View>
			</KeyboardAvoidingView>
		</Modal>
	);
}

const local = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.7)",
		alignItems: "center",
		justifyContent: "center",
		padding: Spacing.xl,
	},
	card: {
		width: "100%",
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		padding: Spacing.xl,
		borderWidth: 1,
		borderColor: Colors.border,
		gap: Spacing.lg,
	},
	title: {
		fontSize: FontSize.lg,
		fontWeight: FontWeight.bold,
		color: Colors.textPrimary,
	},
	input: {
		marginBottom: 0,
	},
	buttons: {
		flexDirection: "row",
		gap: Spacing.sm,
	},
	cancelBtn: {
		flex: 1,
		height: 44,
		borderRadius: Radius.md,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
		borderColor: Colors.border,
	},
	cancelText: {
		fontSize: FontSize.base,
		fontWeight: FontWeight.medium,
		color: Colors.textMuted,
	},
	confirmBtn: {
		flex: 1,
	},
});
