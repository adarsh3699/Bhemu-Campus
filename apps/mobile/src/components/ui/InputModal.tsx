import { useState, useRef, useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	Modal,
	TouchableOpacity,
	KeyboardAvoidingView,
	Platform,
	TextInput,
} from "react-native";
import { Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";
import { Colors } from "@/constants/Colors";
import { Buttons } from "@/styles";
import AppInput from "@/components/ui/AppInput";

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

function InputCard({
	initialValue,
	placeholder,
	title,
	confirmText,
	cancelText,
	onConfirm,
	onClose,
}: Omit<InputModalProps, "isOpen">) {
	const [value, setValue] = useState(initialValue ?? "");
	const inputRef = useRef<TextInput>(null);

	useEffect(() => {
		const t = setTimeout(() => inputRef.current?.focus(), 200);
		return () => clearTimeout(t);
	}, []);

	const handleConfirm = () => {
		if (!value.trim()) return;
		onConfirm(value.trim());
		onClose();
	};

	return (
		<View style={local.card}>
			<Text style={local.title}>{title}</Text>
			<AppInput
				ref={inputRef}
				value={value}
				onChangeText={setValue}
				placeholder={placeholder}
				onSubmitEditing={handleConfirm}
				returnKeyType="done"
			/>
			<View style={local.buttons}>
				<TouchableOpacity style={local.cancelBtn} onPress={onClose} activeOpacity={0.8}>
					<Text style={local.cancelText}>{cancelText ?? "Cancel"}</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={[Buttons.primary, local.confirmBtn, !value.trim() && Buttons.disabled]}
					onPress={handleConfirm}
					disabled={!value.trim()}
					activeOpacity={0.8}
				>
					<Text style={Buttons.primaryText}>{confirmText ?? "Confirm"}</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}

export default function InputModal(props: InputModalProps) {
	const { isOpen, onClose } = props;

	return (
		<Modal visible={isOpen} transparent animationType="none" onRequestClose={onClose}>
			<KeyboardAvoidingView style={local.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
				<TouchableOpacity style={local.backdropTouch} onPress={onClose} activeOpacity={1} />
				{/* key forces remount on every open — fresh useState + autoFocus fires natively */}
				{isOpen && <InputCard key={String(isOpen) + String(props.initialValue)} {...props} />}
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
	backdropTouch: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
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
	buttons: {
		flexDirection: "row",
		gap: Spacing.sm,
	},
	cancelBtn: {
		flex: 1,
		height: 48,
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
