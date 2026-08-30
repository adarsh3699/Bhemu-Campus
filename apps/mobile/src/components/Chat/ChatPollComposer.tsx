import { useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Check, Plus, X } from "lucide-react-native";
import { MAX_CHAT_POLL_OPTIONS, MAX_CHAT_POLL_OPTION_LENGTH, MAX_CHAT_POLL_QUESTION_LENGTH, MIN_CHAT_POLL_OPTIONS, validateChatPollDraft } from "@bhemu/shared";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "@/constants/Theme";

interface Props {
	visible: boolean;
	onClose: () => void;
	onSubmit: (question: string, options: string[], multipleChoice: boolean) => Promise<void>;
}

export default function ChatPollComposer({ visible, onClose, onSubmit }: Props) {
	const [question, setQuestion] = useState("");
	const [options, setOptions] = useState(["", ""]);
	const [multipleChoice, setMultipleChoice] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const optionRefs = useRef<Array<TextInput | null>>([]);

	const updateOption = (index: number, value: string) => {
		setOptions((current) => current.map((option, optionIndex) => optionIndex === index ? value : option));
	};

	const addOption = () => {
		const nextIndex = options.length;
		if (nextIndex >= MAX_CHAT_POLL_OPTIONS) return;
		setOptions((current) => current.length >= MAX_CHAT_POLL_OPTIONS ? current : [...current, ""]);
		requestAnimationFrame(() => optionRefs.current[nextIndex]?.focus());
	};

	const handleOptionSubmit = (index: number) => {
		const nextIndex = index + 1;
		if (nextIndex < options.length) {
			optionRefs.current[nextIndex]?.focus();
			return;
		}
		addOption();
	};
	const pollDraft = validateChatPollDraft(question, options);

	const submit = async () => {
		if (pollDraft.error) {
			setError(pollDraft.error);
			return;
		}

		setSubmitting(true);
		setError(null);
		try {
			await onSubmit(pollDraft.question, pollDraft.options, multipleChoice);
			onClose();
		} catch (submitError) {
			setError(submitError instanceof Error ? submitError.message : "Poll could not be created.");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
			<View style={local.overlay}>
				<Pressable accessibilityRole="button" accessibilityLabel="Close poll composer" style={StyleSheet.absoluteFill} onPress={onClose} />
				<KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={local.modalWrap}>
					<View style={local.card}>
						<View style={local.header}>
							<View style={local.headerCopy}>
								<Text style={local.eyebrow}>New poll</Text>
								<Text style={local.title}>Ask your campus</Text>
								<Text style={local.subtitle}>Share a question and let everyone vote.</Text>
							</View>
							<Pressable accessibilityRole="button" accessibilityLabel="Close poll composer" onPress={onClose} hitSlop={8} style={local.closeButton}>
								<X size={18} color={Colors.textMuted} />
							</Pressable>
						</View>

						<ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={local.scrollContent}>
							<Text style={local.label}>Question</Text>
							<TextInput
								value={question}
								onChangeText={setQuestion}
								maxLength={MAX_CHAT_POLL_QUESTION_LENGTH}
								multiline
								numberOfLines={3}
								placeholder="What should the campus community decide?"
								placeholderTextColor={Colors.textSubtle}
								style={[local.input, local.questionInput]}
							/>
							<Text style={local.counter}>{question.length}/500</Text>

							<View style={local.optionsHeading}>
								<Text style={local.label}>Options</Text>
								<Text style={local.counter}>{options.length}/{MAX_CHAT_POLL_OPTIONS}</Text>
							</View>
							{options.map((option, index) => (
								<View key={index} style={local.optionRow}>
									<Text style={local.optionNumber}>{index + 1}</Text>
									<TextInput
										ref={(element) => { optionRefs.current[index] = element; }}
										value={option}
										onChangeText={(value) => updateOption(index, value)}
										onSubmitEditing={() => handleOptionSubmit(index)}
										returnKeyType="next"
										blurOnSubmit={false}
										maxLength={MAX_CHAT_POLL_OPTION_LENGTH}
										placeholder={`Option ${index + 1}`}
										placeholderTextColor={Colors.textSubtle}
										style={[local.input, local.optionInput]}
									/>
									{options.length > MIN_CHAT_POLL_OPTIONS ? (
										<Pressable accessibilityRole="button" accessibilityLabel={`Remove option ${index + 1}`} onPress={() => setOptions((current) => current.filter((_, optionIndex) => optionIndex !== index))} hitSlop={6} style={local.removeButton}>
											<X size={16} color={Colors.textSubtle} />
										</Pressable>
									) : null}
								</View>
							))}
							{options.length < MAX_CHAT_POLL_OPTIONS ? (
								<Pressable accessibilityRole="button" onPress={addOption} style={({ pressed }) => [local.addOption, pressed && local.pressed]}>
									<Plus size={16} color={Colors.primary} />
									<Text style={local.addOptionText}>Add option</Text>
								</Pressable>
							) : null}

							<View style={local.multipleRow}>
								<Text style={local.multipleLabel}>Allow multiple answers</Text>
								<Switch value={multipleChoice} onValueChange={setMultipleChoice} trackColor={{ false: Colors.borderLight, true: Colors.primaryDark }} thumbColor={multipleChoice ? Colors.primary : Colors.textMuted} />
							</View>
							{error ? <Text style={local.error}>{error}</Text> : null}
						</ScrollView>

						<View style={local.footer}>
							<Pressable accessibilityRole="button" onPress={onClose} style={({ pressed }) => [local.cancelButton, pressed && local.pressed]}>
								<Text style={local.cancelText}>Cancel</Text>
							</Pressable>
							<Pressable accessibilityRole="button" onPress={() => void submit()} disabled={submitting} style={({ pressed }) => [local.createButton, (!question.trim() || submitting) && local.disabledButton, pressed && local.pressed]}>
								{submitting ? <ActivityIndicator size="small" color={Colors.textPrimary} /> : <Check size={16} color={Colors.textPrimary} />}
								<Text style={local.createText}>{submitting ? "Creating…" : "Create poll"}</Text>
							</Pressable>
						</View>
					</View>
				</KeyboardAvoidingView>
			</View>
		</Modal>
	);
}

const local = StyleSheet.create({
	overlay: { flex: 1, justifyContent: "center", paddingHorizontal: Spacing.lg, backgroundColor: "rgba(0,0,0,0.72)" },
	modalWrap: { width: "100%", maxHeight: "92%" },
	card: { overflow: "hidden", borderWidth: 1, borderColor: Colors.borderLight, borderRadius: Radius.xl, backgroundColor: Colors.surface },
	header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: Spacing.md, padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
	headerCopy: { flex: 1, gap: 3 },
	eyebrow: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 1.5, textTransform: "uppercase", color: Colors.primary },
	title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
	subtitle: { fontSize: FontSize.sm, color: Colors.textMuted },
	closeButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: Radius.full },
	scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.md },
	label: { marginBottom: Spacing.sm, fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textBody },
	input: { borderWidth: 1, borderColor: Colors.borderLight, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSize.base, color: Colors.textPrimary, backgroundColor: Colors.surfaceElevated },
	questionInput: { minHeight: 88, textAlignVertical: "top" },
	counter: { fontSize: FontSize.xs, color: Colors.textSubtle },
	optionsHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: Spacing.lg },
	optionRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginBottom: Spacing.sm },
	optionNumber: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textMuted, backgroundColor: Colors.surfaceElevated },
	optionInput: { flex: 1, minHeight: 46 },
	removeButton: { width: 32, height: 40, alignItems: "center", justifyContent: "center" },
	addOption: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: Spacing.xs, alignSelf: "flex-start", paddingHorizontal: Spacing.xs, borderRadius: Radius.md },
	addOptionText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.primary },
	multipleRow: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing.md, marginTop: Spacing.lg },
	multipleLabel: { flex: 1, fontSize: FontSize.sm, color: Colors.textBody },
	error: { marginTop: Spacing.sm, padding: Spacing.sm, borderRadius: Radius.md, fontSize: FontSize.sm, color: Colors.destructive, backgroundColor: "rgba(239,68,68,0.1)" },
	footer: { flexDirection: "row", justifyContent: "flex-end", gap: Spacing.sm, padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border },
	cancelButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: Spacing.md, borderRadius: Radius.md },
	cancelText: { fontSize: FontSize.base, color: Colors.textMuted },
	createButton: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, paddingHorizontal: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.primary },
	disabledButton: { opacity: 0.45 },
	createText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
	pressed: { opacity: 0.78 },
});
