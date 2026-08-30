import { useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ReactNode } from "react";
import { ChevronLeft, Flag, Pencil, Pin, PinOff, Reply, RotateCcw, Trash2 } from "lucide-react-native";
import { PIN_DURATION_OPTIONS, QUICK_CHAT_REACTIONS, type ChatDisplayMessage, type PinDuration } from "@bhemu/shared";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "@/constants/Theme";

interface Props {
	message: ChatDisplayMessage;
	currentUserId: string | null;
	onClose: () => void;
	onReply: (message: ChatDisplayMessage) => void;
	onEdit: (message: ChatDisplayMessage) => void;
	onDelete: (messageId: string) => void;
	onRetry: (messageId: string) => void;
	onReact: (messageId: string, emoji: string) => void;
	onUnreact: (messageId: string) => void;
	onReport: (messageId: string) => void;
	canPin: boolean;
	isPinned: boolean;
	onTogglePin: (messageId: string, duration?: PinDuration) => Promise<void>;
}

export default function ChatMessageActionSheet({
	message,
	currentUserId,
	onClose,
	onReply,
	onEdit,
	onDelete,
	onRetry,
	onReact,
	onUnreact,
	onReport,
	canPin,
	isPinned,
	onTogglePin,
}: Props) {
	const isOwn = message.authorUid === currentUserId;
	const isFailed = Boolean(message.failed);
	const isAnnouncement = message.type === "ANNOUNCEMENT";
	const [showPinDurations, setShowPinDurations] = useState(false);

	const chooseReaction = (emoji: string) => {
		const alreadyReacted = message.reactions?.some((reaction) => reaction.userUid === currentUserId && reaction.emoji === emoji);
		onClose();
		if (alreadyReacted) onUnreact(message.id);
		else onReact(message.id, emoji);
	};

	const confirmDelete = () => {
		Alert.alert("Delete message?", "This message will be removed for everyone.", [
			{ text: "Cancel", style: "cancel" },
			{ text: "Delete", style: "destructive", onPress: () => { onClose(); onDelete(message.id); } },
		]);
	};

	return (
		<Modal transparent visible animationType="slide" onRequestClose={onClose}>
			<View style={local.overlay}>
				<Pressable accessibilityRole="button" accessibilityLabel="Close message actions" style={StyleSheet.absoluteFill} onPress={onClose} />
				<SafeAreaView edges={["bottom"]} style={local.sheet}>
					<View style={local.handle} />
					<View style={local.titleRow}>
						{showPinDurations ? (
							<Pressable accessibilityRole="button" accessibilityLabel="Back to message actions" onPress={() => setShowPinDurations(false)} hitSlop={8} style={local.backButton}>
								<ChevronLeft size={18} color={Colors.textMuted} />
							</Pressable>
						) : null}
						<Text style={local.title}>{showPinDurations ? "Pin message for" : "Message actions"}</Text>
					</View>

					{showPinDurations ? (
						<View style={local.durationList}>
							{PIN_DURATION_OPTIONS.map((option) => (
								<ActionRow key={option.value} label={option.label} onPress={() => { onClose(); void onTogglePin(message.id, option.value); }} />
							))}
						</View>
					) : <View style={local.reactions}>
						{QUICK_CHAT_REACTIONS.map((emoji) => (
							<Pressable
								key={emoji}
								accessibilityRole="button"
								accessibilityLabel={`React with ${emoji}`}
								onPress={() => chooseReaction(emoji)}
								style={({ pressed }) => [local.emojiButton, pressed && local.pressed]}
							>
								<Text style={local.emoji}>{emoji}</Text>
							</Pressable>
						))}
					</View>}

					{!showPinDurations && isFailed ? (
						<ActionRow icon={<RotateCcw size={18} color={Colors.warning} />} label="Retry sending" onPress={() => { onClose(); onRetry(message.id); }} />
						) : !showPinDurations && !isAnnouncement ? (
							<ActionRow icon={<Reply size={18} color={Colors.textMuted} />} label="Reply" onPress={() => { onClose(); onReply(message); }} />
						) : null}

					{!showPinDurations && isOwn && !isFailed ? (
						<>
							<ActionRow icon={<Pencil size={18} color={Colors.textMuted} />} label="Edit message" onPress={() => { onClose(); onEdit(message); }} />
							<ActionRow destructive icon={<Trash2 size={18} color={Colors.destructive} />} label="Delete message" onPress={confirmDelete} />
						</>
					) : null}

					{!showPinDurations && !isOwn && !isFailed ? (
						<ActionRow icon={<Flag size={18} color={Colors.textMuted} />} label="Report message" onPress={() => { onClose(); onReport(message.id); }} />
					) : null}

					{!showPinDurations && canPin && !isFailed ? (
						<ActionRow
							icon={isPinned ? <PinOff size={18} color={Colors.primary} /> : <Pin size={18} color={Colors.primary} />}
							label={isPinned ? "Unpin message" : "Pin message"}
							onPress={() => {
								if (isPinned) {
									onClose();
									void onTogglePin(message.id);
									return;
								}
								setShowPinDurations(true);
							}}
						/>
					) : null}
				</SafeAreaView>
			</View>
		</Modal>
	);
}

function ActionRow({ icon, label, destructive = false, onPress }: { icon?: ReactNode; label: string; destructive?: boolean; onPress: () => void }) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			onPress={onPress}
			style={({ pressed }) => [local.action, pressed && local.pressed]}
		>
			{icon}
			<Text style={[local.actionText, destructive && local.destructiveText]}>{label}</Text>
		</Pressable>
	);
}

const local = StyleSheet.create({
	overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.58)" },
	sheet: { gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.sm, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, borderTopWidth: 1, borderColor: Colors.borderLight, backgroundColor: Colors.surface },
	handle: { alignSelf: "center", width: 40, height: 4, marginBottom: Spacing.xs, borderRadius: Radius.full, backgroundColor: Colors.textSubtle },
	titleRow: { flexDirection: "row", alignItems: "center", gap: Spacing.xs, marginBottom: Spacing.xs },
	backButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: Radius.md },
	title: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
	durationList: { gap: Spacing.xs },
	reactions: { flexDirection: "row", justifyContent: "space-between", paddingVertical: Spacing.xs },
	emojiButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: Radius.full, backgroundColor: Colors.surfaceElevated },
	emoji: { fontSize: 22 },
	action: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: Spacing.md, paddingHorizontal: Spacing.sm, borderRadius: Radius.md },
	actionText: { fontSize: FontSize.base, fontWeight: FontWeight.medium, color: Colors.textBody },
	destructiveText: { color: Colors.destructive },
	pressed: { backgroundColor: Colors.surfaceElevated, opacity: 0.86 },
});
