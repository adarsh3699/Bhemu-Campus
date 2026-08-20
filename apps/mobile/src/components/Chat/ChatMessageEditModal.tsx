import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { X } from "lucide-react-native";
import { MAX_CHAT_MESSAGE_LENGTH } from "@bhemu/shared";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "@/constants/Theme";

interface Props {
	visible: boolean;
	initialContent: string;
	onConfirm: (content: string) => Promise<void>;
	onClose: () => void;
}

export default function ChatMessageEditModal({ visible, initialContent, onConfirm, onClose }: Props) {
	const [value, setValue] = useState(initialContent);
	const [saving, setSaving] = useState(false);

	const submit = async () => {
		const trimmed = value.trim();
		if (!trimmed || trimmed === initialContent.trim() || saving) {
			onClose();
			return;
		}
		setSaving(true);
		try {
			await onConfirm(trimmed);
			onClose();
		} finally {
			setSaving(false);
		}
	};

	return (
		<Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
			<KeyboardAvoidingView style={local.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
				<Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
				<View style={local.panel}>
					<View style={local.header}>
						<Text style={local.title}>Edit message</Text>
						<Pressable accessibilityRole="button" accessibilityLabel="Close edit message" onPress={onClose} hitSlop={8} style={local.close}>
							<X size={18} color={Colors.textMuted} />
						</Pressable>
					</View>
					<TextInput
						value={value}
						onChangeText={setValue}
						multiline
						maxLength={MAX_CHAT_MESSAGE_LENGTH}
						autoFocus
						textAlignVertical="top"
						style={local.input}
					/>
					<View style={local.actions}>
						<Pressable accessibilityRole="button" accessibilityLabel="Cancel editing" onPress={onClose} style={({ pressed }) => [local.cancel, pressed && local.pressed]}>
							<Text style={local.cancelText}>Cancel</Text>
						</Pressable>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Save edited message"
							accessibilityState={{ disabled: saving || !value.trim() || value.trim() === initialContent.trim() }}
							disabled={saving || !value.trim() || value.trim() === initialContent.trim()}
							onPress={() => void submit()}
							style={({ pressed }) => [local.save, pressed && local.pressed, (!value.trim() || value.trim() === initialContent.trim()) && local.disabled]}
						>
							{saving ? <ActivityIndicator size="small" color={Colors.textPrimary} /> : <Text style={local.saveText}>Save</Text>}
						</Pressable>
					</View>
				</View>
			</KeyboardAvoidingView>
		</Modal>
	);
}

const local = StyleSheet.create({
	overlay: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: Spacing.lg, backgroundColor: "rgba(0,0,0,0.6)" },
	panel: { width: "100%", maxWidth: 440, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: Radius.xl, padding: Spacing.lg, backgroundColor: Colors.surface },
	header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.md },
	title: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
	close: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: Radius.md },
	input: { minHeight: 112, maxHeight: 180, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.base, lineHeight: 21, color: Colors.textPrimary, backgroundColor: Colors.surfaceElevated },
	actions: { flexDirection: "row", justifyContent: "flex-end", gap: Spacing.sm, marginTop: Spacing.lg },
	cancel: { minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: Spacing.lg, borderRadius: Radius.md },
	cancelText: { fontSize: FontSize.base, fontWeight: FontWeight.medium, color: Colors.textMuted },
	save: { minWidth: 88, minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: Spacing.lg, borderRadius: Radius.md, backgroundColor: Colors.primary },
	saveText: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
	disabled: { opacity: 0.4 },
	pressed: { opacity: 0.78 },
});
