import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { X } from "lucide-react-native";
import type { ReportReason } from "@bhemu/shared";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "@/constants/Theme";

const REASONS: Array<{ value: ReportReason; label: string }> = [
	{ value: "SPAM", label: "Spam" },
	{ value: "HARASSMENT", label: "Harassment" },
	{ value: "ABUSE", label: "Abuse" },
	{ value: "INAPPROPRIATE", label: "Inappropriate" },
	{ value: "MISINFORMATION", label: "Misinformation" },
	{ value: "OTHER", label: "Other" },
];

interface Props {
	visible: boolean;
	onConfirm: (reason: ReportReason, description?: string) => Promise<void>;
	onClose: () => void;
}

export default function ChatMessageReportModal({ visible, onConfirm, onClose }: Props) {
	const [reason, setReason] = useState<ReportReason>("SPAM");
	const [description, setDescription] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const close = () => {
		setReason("SPAM");
		setDescription("");
		onClose();
	};

	const submit = async () => {
		if (submitting) return;
		setSubmitting(true);
		try {
			await onConfirm(reason, description.trim() || undefined);
			close();
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Modal transparent visible={visible} animationType="fade" onRequestClose={close}>
			<KeyboardAvoidingView style={local.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
				<Pressable style={StyleSheet.absoluteFill} onPress={close} />
				<View style={local.panel}>
					<View style={local.header}>
						<Text style={local.title}>Report message</Text>
						<Pressable accessibilityRole="button" accessibilityLabel="Close report message" onPress={close} hitSlop={8} style={local.close}>
							<X size={18} color={Colors.textMuted} />
						</Pressable>
					</View>
					<View style={local.reasonGrid}>
						{REASONS.map((item) => {
							const selected = reason === item.value;
							return (
								<Pressable
									key={item.value}
									accessibilityRole="radio"
									accessibilityState={{ selected }}
									onPress={() => setReason(item.value)}
									style={({ pressed }) => [local.reason, selected && local.selectedReason, pressed && local.pressed]}
								>
									<Text style={[local.reasonText, selected && local.selectedReasonText]}>{item.label}</Text>
								</Pressable>
							);
						})}
					</View>
					<TextInput
						value={description}
						onChangeText={setDescription}
						multiline
						placeholder="Additional details (optional)"
						placeholderTextColor={Colors.textSubtle}
						textAlignVertical="top"
						style={local.input}
					/>
					<View style={local.actions}>
						<Pressable accessibilityRole="button" accessibilityLabel="Cancel report" onPress={close} style={({ pressed }) => [local.cancel, pressed && local.pressed]}>
							<Text style={local.cancelText}>Cancel</Text>
						</Pressable>
						<Pressable accessibilityRole="button" accessibilityLabel="Submit report" disabled={submitting} onPress={() => void submit()} style={({ pressed }) => [local.report, pressed && local.pressed, submitting && local.disabled]}>
							{submitting ? <ActivityIndicator size="small" color={Colors.textPrimary} /> : <Text style={local.reportText}>Report</Text>}
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
	reasonGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, marginBottom: Spacing.md },
	reason: { width: "47%", minHeight: 44, justifyContent: "center", paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: Radius.md, backgroundColor: Colors.surfaceElevated },
	selectedReason: { borderColor: Colors.primary, backgroundColor: "rgba(3,152,172,0.12)" },
	reasonText: { fontSize: FontSize.sm, color: Colors.textMuted },
	selectedReasonText: { color: Colors.textPrimary },
	input: { minHeight: 72, maxHeight: 140, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.base, lineHeight: 20, color: Colors.textPrimary, backgroundColor: Colors.surfaceElevated },
	actions: { flexDirection: "row", justifyContent: "flex-end", gap: Spacing.sm, marginTop: Spacing.lg },
	cancel: { minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: Spacing.lg, borderRadius: Radius.md },
	cancelText: { fontSize: FontSize.base, fontWeight: FontWeight.medium, color: Colors.textMuted },
	report: { minWidth: 88, minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: Spacing.lg, borderRadius: Radius.md, backgroundColor: Colors.destructive },
	reportText: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
	disabled: { opacity: 0.45 },
	pressed: { opacity: 0.78 },
});
