import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ReactNode } from "react";
import { BarChart3, ChevronRight, Megaphone, Plus, Send, X } from "lucide-react-native";
import { MAX_CHAT_MESSAGE_LENGTH, type ChatMessage } from "@bhemu/shared";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "@/constants/Theme";

interface Props {
	disabled: boolean;
	replyTo: ChatMessage | null;
	onCancelReply: () => void;
	onSend: (content: string, replyToId?: string) => Promise<void>;
	onTyping?: (isTyping: boolean) => void;
	canCreatePoll: boolean;
	canAnnounce: boolean;
	onCreatePoll: () => void;
	onCreateAnnouncement: () => void;
}

export default function ChatComposer({
	disabled,
	replyTo,
	onCancelReply,
	onSend,
	onTyping,
	canCreatePoll,
	canAnnounce,
	onCreatePoll,
	onCreateAnnouncement,
}: Props) {
	const [value, setValue] = useState("");
	const [toolsOpen, setToolsOpen] = useState(false);
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
		onTyping?.(false);
		onCancelReply();
		// Keep the composer available while this message is being acknowledged.
		// Each send gets its own optimistic message and delivery state below.
		void onSend(content, replyToId).catch(() => undefined);
	}, [disabled, onCancelReply, onSend, onTyping, replyTo, value]);

	const handleChangeText = useCallback(
		(nextValue: string) => {
			setValue(nextValue);
			onTyping?.(nextValue.trim().length > 0);
		},
		[onTyping]
	);

	const handleCreatePoll = useCallback(() => {
		setToolsOpen(false);
		Keyboard.dismiss();
		onCreatePoll();
	}, [onCreatePoll]);

	const handleCreateAnnouncement = useCallback(() => {
		setToolsOpen(false);
		Keyboard.dismiss();
		onCreateAnnouncement();
	}, [onCreateAnnouncement]);

	return (
		<View style={local.container}>
			{toolsOpen ? (
				<Modal transparent visible animationType="slide" onRequestClose={() => setToolsOpen(false)}>
					<View style={local.toolsOverlay}>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Close chat tools"
							style={StyleSheet.absoluteFill}
							onPress={() => setToolsOpen(false)}
						/>
						<SafeAreaView edges={["bottom"]} style={local.toolsMenu}>
							<View style={local.handle} />
							<View style={local.toolsHeader}>
								<View style={local.toolsHeaderCopy}>
									<Text style={local.toolsTitle}>Create something</Text>
									<Text style={local.toolsSubtitle}>Choose what you want to share with the room</Text>
								</View>
								<Pressable
									accessibilityRole="button"
									accessibilityLabel="Close chat tools"
									onPress={() => setToolsOpen(false)}
									style={({ pressed }) => [local.closeTools, pressed && local.pressed]}
								>
									<X size={20} color={Colors.textMuted} />
								</Pressable>
							</View>
							<View style={local.toolList}>
								{canCreatePoll ? (
									<ToolRow
										icon={<BarChart3 size={22} color={Colors.primary} />}
										label="Poll"
										description="Ask a question and collect votes"
										onPress={handleCreatePoll}
									/>
								) : null}
								{canAnnounce ? (
									<ToolRow
										icon={<Megaphone size={22} color={Colors.secondary} />}
										label="Announcement"
										description="Share an important update with everyone"
										onPress={handleCreateAnnouncement}
									/>
								) : null}
							</View>
						</SafeAreaView>
					</View>
				</Modal>
			) : null}
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
				{canCreatePoll || canAnnounce ? (
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Open chat tools"
						accessibilityState={{ expanded: toolsOpen, disabled }}
						disabled={disabled}
						onPress={() => setToolsOpen((current) => !current)}
						style={({ pressed }) => [local.toolButton, pressed && local.pressed]}
					>
						<Plus size={20} color={Colors.textMuted} />
					</Pressable>
				) : null}
				<View style={local.inputWrap}>
					<TextInput
						ref={inputRef}
						value={value}
						onChangeText={handleChangeText}
						placeholder={disabled ? "Chat unavailable" : "Message…"}
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

function ToolRow({
	icon,
	label,
	description,
	onPress,
}: {
	icon: ReactNode;
	label: string;
	description: string;
	onPress: () => void;
}) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			accessibilityHint={description}
			onPress={onPress}
			style={({ pressed }) => [local.toolRow, pressed && local.toolRowPressed]}
		>
			<View style={local.toolIcon}>{icon}</View>
			<View style={local.toolCopy}>
				<Text style={local.toolLabel}>{label}</Text>
				<Text style={local.toolDescription}>{description}</Text>
			</View>
			<ChevronRight size={20} color={Colors.textSubtle} />
		</Pressable>
	);
}

const local = StyleSheet.create({
	container: {
		position: "relative",
		paddingHorizontal: Spacing.md,
		paddingTop: Spacing.sm,
		paddingBottom: Spacing.sm,
		borderTopWidth: 1,
		borderTopColor: Colors.border,
		backgroundColor: Colors.surface,
	},
	toolsOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: Colors.scrim },
	toolsMenu: {
		gap: Spacing.lg,
		paddingHorizontal: Spacing.lg,
		paddingTop: Spacing.sm,
		paddingBottom: Spacing.lg,
		borderTopWidth: 1,
		borderColor: Colors.borderLight,
		borderTopLeftRadius: Radius.xl,
		borderTopRightRadius: Radius.xl,
		backgroundColor: Colors.surface,
	},
	handle: {
		alignSelf: "center",
		width: 40,
		height: 4,
		marginBottom: Spacing.xs,
		borderRadius: Radius.full,
		backgroundColor: Colors.textSubtle,
	},
	toolsHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
	toolsHeaderCopy: { flex: 1, minWidth: 0, gap: Spacing.xs },
	toolsTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
	toolsSubtitle: { fontSize: FontSize.sm, lineHeight: 18, color: Colors.textMuted },
	closeTools: {
		width: 44,
		height: 44,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: Radius.full,
		backgroundColor: Colors.surfaceElevated,
	},
	toolList: { gap: Spacing.sm },
	toolRow: {
		minHeight: 72,
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.md,
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.sm,
		borderWidth: 1,
		borderColor: Colors.borderLight,
		borderRadius: Radius.lg,
		backgroundColor: Colors.surfaceElevated,
	},
	toolRowPressed: { borderColor: Colors.primary, backgroundColor: Colors.surfaceGlass, opacity: 0.9 },
	toolIcon: {
		width: 44,
		height: 44,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: Radius.md,
		backgroundColor: Colors.primaryTint,
	},
	toolCopy: { flex: 1, minWidth: 0, gap: 2 },
	toolLabel: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
	toolDescription: { fontSize: FontSize.sm, lineHeight: 18, color: Colors.textMuted },
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
	toolButton: {
		width: 40,
		height: 48,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: Radius.full,
		backgroundColor: Colors.surfaceElevated,
	},
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
