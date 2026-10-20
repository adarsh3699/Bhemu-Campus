import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Megaphone, Send, X } from "lucide-react-native";
import { MAX_CHAT_MESSAGE_LENGTH } from "@bhemu/shared";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "@/constants/Theme";

interface Props {
	visible: boolean;
	onClose: () => void;
	onSubmit: (content: string) => Promise<void>;
}

export default function ChatAnnouncementComposer({ visible, onClose, onSubmit }: Props) {
	const [value, setValue] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const submit = async () => {
		const content = value.trim();
		if (!content) {
			setError("Announcement cannot be empty.");
			return;
		}
		if (submitting) return;

		setSubmitting(true);
		setError(null);
		try {
			await onSubmit(content);
			onClose();
		} catch (submitError) {
			setError(submitError instanceof Error ? submitError.message : "Announcement could not be sent.");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={local.overlay}
			>
				<Pressable accessibilityRole="button" accessibilityLabel="Close announcement composer" style={StyleSheet.absoluteFill} onPress={onClose} />
				<View style={local.card}>
					<View style={local.header}>
						<View style={local.headerCopy}>
							<View style={local.eyebrowRow}>
								<Megaphone size={15} color={Colors.primary} />
								<Text style={local.eyebrow}>New announcement</Text>
							</View>
							<Text style={local.title}>Share with your campus</Text>
							<Text style={local.subtitle}>This message will be highlighted as an announcement.</Text>
						</View>
						<Pressable accessibilityRole="button" accessibilityLabel="Close announcement composer" onPress={onClose} hitSlop={8} style={local.closeButton}>
							<X size={18} color={Colors.textMuted} />
						</Pressable>
					</View>

					<View style={local.body}>
						<TextInput
							autoFocus
							value={value}
							onChangeText={setValue}
							maxLength={MAX_CHAT_MESSAGE_LENGTH}
							multiline
							placeholder="Write your announcement…"
							placeholderTextColor={Colors.textSubtle}
							textAlignVertical="top"
							style={local.input}
						/>
						<View style={local.metaRow}>
							<Text style={local.counter}>{value.length}/{MAX_CHAT_MESSAGE_LENGTH}</Text>
							{error ? <Text style={local.error}>{error}</Text> : null}
						</View>
					</View>

					<View style={local.footer}>
						<Pressable accessibilityRole="button" onPress={onClose} style={({ pressed }) => [local.cancelButton, pressed && local.pressed]}>
							<Text style={local.cancelText}>Cancel</Text>
						</Pressable>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Send announcement"
							onPress={() => void submit()}
							disabled={submitting || !value.trim()}
							style={({ pressed }) => [local.sendButton, (!value.trim() || submitting) && local.disabledButton, pressed && local.pressed]}
						>
							{submitting ? <ActivityIndicator size="small" color={Colors.textPrimary} /> : <Send size={16} color={Colors.textPrimary} />}
							<Text style={local.sendText}>{submitting ? "Sending…" : "Send announcement"}</Text>
						</Pressable>
					</View>
				</View>
			</KeyboardAvoidingView>
		</Modal>
	);
}

const local = StyleSheet.create({
	overlay: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: Spacing.lg, backgroundColor: "rgba(0,0,0,0.72)" },
	card: { width: "100%", maxWidth: 440, overflow: "hidden", borderWidth: 1, borderColor: Colors.borderLight, borderRadius: Radius.xl, backgroundColor: Colors.surface },
	header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: Spacing.md, padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
	headerCopy: { flex: 1, gap: 3 },
	eyebrowRow: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
	eyebrow: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 1.4, textTransform: "uppercase", color: Colors.primary },
	title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
	subtitle: { fontSize: FontSize.sm, color: Colors.textMuted },
	closeButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: Radius.full },
	body: { padding: Spacing.lg },
	input: { minHeight: 132, maxHeight: 220, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.base, lineHeight: 21, color: Colors.textPrimary, backgroundColor: Colors.surfaceElevated },
	metaRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: Spacing.sm, marginTop: Spacing.xs },
	counter: { fontSize: FontSize.xs, color: Colors.textSubtle },
	error: { flex: 1, fontSize: FontSize.xs, textAlign: "right", color: Colors.destructive },
	footer: { flexDirection: "row", justifyContent: "flex-end", gap: Spacing.sm, padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border },
	cancelButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: Spacing.md, borderRadius: Radius.md },
	cancelText: { fontSize: FontSize.base, color: Colors.textMuted },
	sendButton: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, paddingHorizontal: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.primary },
	sendText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
	disabledButton: { opacity: 0.45 },
	pressed: { opacity: 0.78 },
});
