import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Send, X } from "lucide-react-native";
import type { ChatMessage } from "@bhemu/shared";
import { MAX_CHAT_MESSAGE_LENGTH } from "@bhemu/shared";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "@/constants/Theme";

interface Props {
	disabled: boolean;
	replyTo: ChatMessage | null;
	onCancelReply: () => void;
	onSend: (content: string, replyToId?: string) => Promise<void>;
}

export default function ChatComposer({ disabled, replyTo, onCancelReply, onSend }: Props) {
	const [value, setValue] = useState("");
	const inputRef = useRef<TextInput | null>(null);
	const selectedReplyId = replyTo?.id;

	useEffect(() => {
		if (!selectedReplyId) return;
		const frame = requestAnimationFrame(() => inputRef.current?.focus());
		return () => cancelAnimationFrame(frame);
	}, [selectedReplyId]);

	const send = useCallback(() => {
		const content = value.trim();
		if (!content || disabled) return;

		const replyToId = replyTo?.id;
		setValue("");
		onCancelReply();
		// Keep the composer available while this message is being acknowledged.
		// Each send gets its own optimistic message and delivery state below.
		void onSend(content, replyToId).catch(() => undefined);
	}, [disabled, onCancelReply, onSend, replyTo, value]);

	return (
		<View style={local.container}>
			{replyTo ? (
				<View style={local.replyBanner}>
					<View style={local.replyCopy}>
						<Text style={local.replyLabel}>Replying to</Text>
						<Text style={local.replyText} numberOfLines={1}>
							{replyTo.content}
						</Text>
					</View>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Cancel reply"
						onPress={onCancelReply}
						hitSlop={8}
						style={local.closeReply}
					>
						<X size={16} color={Colors.textMuted} />
					</Pressable>
				</View>
			) : null}
			<View style={local.inputRow}>
				<View style={local.inputWrap}>
					<TextInput
						ref={inputRef}
						value={value}
						onChangeText={setValue}
						placeholder={disabled ? "Connecting…" : "Message…"}
						placeholderTextColor={Colors.textSubtle}
						accessibilityLabel="Message"
						multiline
						maxLength={MAX_CHAT_MESSAGE_LENGTH}
						editable={!disabled}
						returnKeyType="send"
						onSubmitEditing={() => void send()}
						blurOnSubmit={false}
						style={local.input}
					/>
				</View>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Send message"
					accessibilityState={{ disabled: disabled || !value.trim() }}
					disabled={disabled || !value.trim()}
					onPress={() => void send()}
					style={({ pressed }) => [
						local.send,
						pressed && local.pressed,
						(disabled || !value.trim()) && local.sendDisabled,
					]}
				>
					<Send size={18} color={disabled || !value.trim() ? Colors.textSubtle : Colors.textPrimary} />
				</Pressable>
			</View>
		</View>
	);
}

const local = StyleSheet.create({
	container: {
		paddingHorizontal: Spacing.lg,
		paddingTop: Spacing.sm,
		paddingBottom: Spacing.sm,
		borderTopWidth: 1,
		borderTopColor: Colors.border,
		backgroundColor: Colors.surface,
	},
	replyBanner: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.md,
		marginBottom: Spacing.sm,
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.sm,
		borderWidth: 1,
		borderColor: Colors.borderLight,
		borderRadius: Radius.lg,
		backgroundColor: Colors.surfaceElevated,
	},
	replyCopy: { flex: 1, minWidth: 0, borderLeftWidth: 2, borderLeftColor: Colors.primary, paddingLeft: Spacing.sm },
	replyLabel: {
		marginBottom: 2,
		fontSize: FontSize.xs,
		fontWeight: FontWeight.bold,
		letterSpacing: 0.7,
		textTransform: "uppercase",
		color: Colors.primary,
	},
	replyText: { fontSize: FontSize.sm, color: Colors.textBody },
	closeReply: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: Radius.md },
	inputRow: { flexDirection: "row", alignItems: "flex-end", gap: Spacing.sm },
	inputWrap: {
		flex: 1,
		minHeight: 48,
		maxHeight: 120,
		justifyContent: "center",
		borderWidth: 1,
		borderColor: Colors.borderLight,
		borderRadius: Radius.lg,
		borderCurve: "continuous",
		backgroundColor: Colors.surfaceElevated,
	},
	input: {
		maxHeight: 112,
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.sm,
		fontSize: FontSize.base,
		lineHeight: 20,
		color: Colors.textPrimary,
	},
	send: {
		width: 48,
		height: 48,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: Radius.lg,
		backgroundColor: Colors.primary,
	},
	sendDisabled: { backgroundColor: Colors.border },
	pressed: { opacity: 0.78 },
});
