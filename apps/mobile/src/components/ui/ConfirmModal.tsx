import { View, Text, StyleSheet, Modal, TouchableOpacity } from "react-native";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";

interface ConfirmModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
	title: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
	type?: "danger" | "default";
}

export default function ConfirmModal({
	isOpen,
	onClose,
	onConfirm,
	title,
	message,
	confirmText = "Confirm",
	cancelText = "Cancel",
	type = "default",
}: ConfirmModalProps) {
	return (
		<Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
			<View style={local.overlay}>
				<View style={local.card}>
					<Text style={local.title}>{title}</Text>
					<Text style={local.message}>{message}</Text>
					<View style={local.buttons}>
						<TouchableOpacity style={local.cancelBtn} onPress={onClose} activeOpacity={0.8}>
							<Text style={local.cancelText}>{cancelText}</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[local.confirmBtn, type === "danger" && local.dangerBtn]}
							onPress={onConfirm}
							activeOpacity={0.8}
						>
							<Text style={local.confirmText}>{confirmText}</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
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
	},
	title: {
		fontSize: FontSize.lg,
		fontWeight: FontWeight.bold,
		color: Colors.textPrimary,
		marginBottom: Spacing.sm,
	},
	message: {
		fontSize: FontSize.base,
		color: Colors.textMuted,
		lineHeight: 22,
		marginBottom: Spacing.xl,
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
		height: 44,
		borderRadius: Radius.md,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: Colors.primary,
	},
	dangerBtn: {
		backgroundColor: Colors.destructive,
	},
	confirmText: {
		fontSize: FontSize.base,
		fontWeight: FontWeight.bold,
		color: Colors.textPrimary,
	},
});
