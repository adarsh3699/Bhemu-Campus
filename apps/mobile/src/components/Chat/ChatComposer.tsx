import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { ReactNode } from "react";
import { BarChart3, Megaphone, Plus, Send, X } from "lucide-react-native";
import type { ChatMessage } from "@bhemu/shared";
import { MAX_CHAT_MESSAGE_LENGTH } from "@bhemu/shared";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "@/constants/Theme";

interface Props {
	disabled: boolean;
	replyTo: ChatMessage | null;
	onCancelReply: () => void;
	onSend: (content: string, replyToId?: string) => Promise<void>;
	canCreatePoll: boolean;
	canAnnounce: boolean;
	onCreatePoll: () => void;
	onSendAnnouncement: (content: string) => Promise<void>;
}

export default function ChatComposer({ disabled, replyTo, onCancelReply, onSend, canCreatePoll, canAnnounce, onCreatePoll, onSendAnnouncement }: Props) {
	const [value, setValue] = useState("");
	const [announcementMode, setAnnouncementMode] = useState(false);
	const [toolsOpen, setToolsOpen] = useState(false);
	const inputRef = useRef<TextInput | null>(null);
	const selectedReplyId = replyTo?.id;

	useEffect(() => {
		if (!selectedReplyId) return;
		const frame = requestAnimationFrame(() => inputRef.current?.focus());
		return () => cancelAnimationFrame(frame);
	}, [selectedReplyId]);

	useEffect(() => {
		if (!announcementMode || disabled) return;
		const frame = requestAnimationFrame(() => inputRef.current?.focus());
		return () => cancelAnimationFrame(frame);
	}, [announcementMode, disabled]);

	const send = useCallback(() => {
		const content = value.trim();
		if (!content || disabled) return;

		const replyToId = replyTo?.id;
		setValue("");
		onCancelReply();
		// Keep the composer available while this message is being acknowledged.
		// Each send gets its own optimistic message and delivery state below.
		const sendMessage = announcementMode && canAnnounce ? onSendAnnouncement(content) : onSend(content, replyToId);
		void sendMessage.catch(() => undefined);
	}, [announcementMode, canAnnounce, disabled, onCancelReply, onSend, onSendAnnouncement, replyTo, value]);

	const handleCreatePoll = useCallback(() => {
		setToolsOpen(false);
		Keyboard.dismiss();
		onCreatePoll();
	}, [onCreatePoll]);

	const toggleAnnouncementMode = useCallback(() => {
		setAnnouncementMode((current) => !current);
		setToolsOpen(false);
	}, []);

	return (
		<View style={local.container}>
			{toolsOpen ? (
				<Modal transparent visible animationType="fade" onRequestClose={() => setToolsOpen(false)}>
					<View style={local.toolsOverlay}>
						<Pressable accessibilityRole="button" accessibilityLabel="Close chat tools" style={StyleSheet.absoluteFill} onPress={() => setToolsOpen(false)} />
						<View style={local.toolsMenu}>
							{canCreatePoll ? <ToolRow icon={<BarChart3 size={18} color={Colors.primary} />} label="Poll" onPress={handleCreatePoll} /> : null}
							{canAnnounce ? <ToolRow icon={<Megaphone size={18} color={Colors.primary} />} label="Announcement" active={announcementMode} onPress={toggleAnnouncementMode} /> : null}
						</View>
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
				{(canCreatePoll || canAnnounce) ? (
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Open chat tools"
						accessibilityState={{ expanded: toolsOpen, disabled }}
						disabled={disabled}
						onPress={() => setToolsOpen((current) => !current)}
						style={({ pressed }) => [local.toolButton, announcementMode && local.toolButtonActive, pressed && local.pressed]}
					>
						<Plus size={20} color={announcementMode ? Colors.primary : Colors.textMuted} />
					</Pressable>
				) : null}
				<View style={local.inputWrap}>
					<TextInput
						ref={inputRef}
						value={value}
						onChangeText={setValue}
						placeholder={disabled ? "Connecting…" : announcementMode ? "Write an announcement…" : "Message…"}
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

function ToolRow({ icon, label, active = false, onPress }: { icon: ReactNode; label: string; active?: boolean; onPress: () => void }) {
	return (
		<Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [local.toolRow, active && local.toolRowActive, pressed && local.pressed]}>
			{icon}
			<Text style={[local.toolLabel, active && local.toolLabelActive]}>{label}</Text>
		</Pressable>
	);
}

const local = StyleSheet.create({
	container: {
		position: "relative",
		paddingHorizontal: Spacing.lg,
		paddingTop: Spacing.sm,
		paddingBottom: Spacing.sm,
		borderTopWidth: 1,
		borderTopColor: Colors.border,
		backgroundColor: Colors.surface,
	},
	toolsOverlay: { flex: 1, backgroundColor: "transparent" },
	toolsMenu: { position: "absolute", left: Spacing.lg, right: Spacing.lg, bottom: 78, gap: Spacing.xs, padding: Spacing.xs, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: Radius.lg, backgroundColor: Colors.surface, shadowColor: "#000000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },
	toolRow: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: Spacing.md, paddingHorizontal: Spacing.md, borderRadius: Radius.md },
	toolRowActive: { backgroundColor: Colors.surfaceElevated },
	toolLabel: { fontSize: FontSize.base, color: Colors.textBody },
	toolLabelActive: { color: Colors.primary, fontWeight: FontWeight.medium },
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
	toolButton: { width: 40, height: 48, alignItems: "center", justifyContent: "center", borderRadius: Radius.full, backgroundColor: Colors.surfaceElevated },
	toolButtonActive: { backgroundColor: Colors.surfaceGlass },
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
