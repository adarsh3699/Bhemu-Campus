import { memo, useMemo } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { AlertCircle, Check, Clock3, Megaphone, Reply } from "lucide-react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import {
	CHAT_OPTIMISTIC_PREFIX,
	formatChatTime,
	getChatAuthorInitials,
	getChatAvatarIndex,
	isDeletedChatAnnouncement,
	messageTimestamp,
	normalizeChatDisplayName,
	summarizeChatReactions,
	type ChatDisplayMessage,
} from "@bhemu/shared";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "@/constants/Theme";
import ChatPollCard from "./ChatPollCard";

const AVATAR_COLORS = [Colors.primary, Colors.indigo, Colors.warning, Colors.success, Colors.destructive] as const;
const SWIPE_REPLY_DISTANCE = 76;
const SWIPE_REPLY_TRIGGER = 52;

interface Props {
	message: ChatDisplayMessage;
	repliedMessage?: ChatDisplayMessage;
	currentUserId: string | null;
	showIdentity: boolean;
	onLongPress: (message: ChatDisplayMessage) => void;
	onSwipeReply: (messageId: string) => void;
	onRetry: (messageId: string) => void;
	onReact: (messageId: string, emoji: string) => void;
	onUnreact: (messageId: string) => void;
	canClosePoll: boolean;
	onVotePoll: (pollId: string, optionIds: string[]) => Promise<void>;
	onClosePoll: (pollId: string) => Promise<void>;
}

function renderMessageContent(content: string, isOwn: boolean) {
	return content.split(/(https?:\/\/[^\s]+)/g).map((part, index) =>
		part.match(/^https?:\/\//) ? (
			<Text
				key={`${part}-${index}`}
				style={isOwn ? local.ownLink : local.link}
				onPress={() => void Linking.openURL(part)}
			>
				{part}
			</Text>
		) : (
			part
		)
	);
}

const ChatMessageBubble = memo(function ChatMessageBubbleView({
	message,
	repliedMessage,
	currentUserId,
	showIdentity,
	onLongPress,
	onSwipeReply,
	onRetry,
	onReact,
	onUnreact,
	canClosePoll,
	onVotePoll,
	onClosePoll,
}: Props) {
	const isOwn = currentUserId === message.authorUid;
	const isDeleted = message.visibility === "DELETED";
	const isAnnouncement = message.type === "ANNOUNCEMENT";
	const isPending = message.id.startsWith(CHAT_OPTIMISTIC_PREFIX);
	const canReply = !isPending && !message.failed && !isDeleted && !isAnnouncement;
	const authorName = normalizeChatDisplayName(message.authorName);
	const reactions = useMemo(
		() => summarizeChatReactions(message.reactions, currentUserId),
		[currentUserId, message.reactions]
	);
	const swipeX = useSharedValue(0);
	const swipeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: swipeX.value }] }));
	const leftReplyActionStyle = useAnimatedStyle(() => {
		const progress = Math.min(Math.max(swipeX.value, 0) / SWIPE_REPLY_TRIGGER, 1);
		return {
			opacity: progress,
			transform: [{ scale: 0.8 + progress * 0.2 }],
		};
	});
	const rightReplyActionStyle = useAnimatedStyle(() => {
		const progress = Math.min(Math.max(-swipeX.value, 0) / SWIPE_REPLY_TRIGGER, 1);
		return {
			opacity: progress,
			transform: [{ scale: 0.8 + progress * 0.2 }],
		};
	});
	const swipeGesture = useMemo(
		() =>
			Gesture.Pan()
				.enabled(canReply)
				.activeOffsetX([-10, 10])
				.failOffsetY([-12, 12])
				.onUpdate((event) => {
					swipeX.value = Math.min(Math.max(event.translationX, -SWIPE_REPLY_DISTANCE), SWIPE_REPLY_DISTANCE);
				})
				.onEnd(() => {
					const shouldReply = Math.abs(swipeX.value) >= SWIPE_REPLY_TRIGGER;
					swipeX.value = withSpring(0);
					if (shouldReply) runOnJS(onSwipeReply)(message.id);
				})
				.onFinalize(() => {
					swipeX.value = withSpring(0);
				}),
		[canReply, message.id, onSwipeReply, swipeX]
	);

	if (isDeletedChatAnnouncement(message)) return null;

	if (isAnnouncement) {
		return (
			<View style={local.announcementRow}>
				<Pressable
					accessibilityRole="text"
					accessibilityLabel={`Announcement from ${authorName}: ${message.content}`}
					delayLongPress={250}
					onLongPress={!isPending ? () => onLongPress(message) : undefined}
					style={({ pressed }) => [local.announcement, pressed && local.pressed]}
				>
					<View style={local.announcementHeader}>
						<View style={local.announcementIcon}>
							<Megaphone size={16} color={Colors.primary} />
						</View>
						<View style={local.announcementCopy}>
							<Text style={local.announcementLabel}>Announcement</Text>
							<Text style={local.announcementAuthor}>{authorName}</Text>
						</View>
						<Text style={local.announcementTime}>{formatChatTime(messageTimestamp(message))}</Text>
					</View>
					<Text style={local.announcementText}>{message.content}</Text>
				</Pressable>
			</View>
		);
	}

	if (isDeleted) {
		return (
			<View style={[local.row, isOwn && local.ownRow, showIdentity ? local.groupStart : local.groupContinuation]}>
				{!isOwn ? (
					<View style={local.avatarSlot}>
						{showIdentity ? (
							<View
								style={[
									local.avatar,
									{
										backgroundColor:
											AVATAR_COLORS[getChatAvatarIndex(message.authorUid, AVATAR_COLORS.length)],
									},
								]}
							>
								<Text style={local.avatarText}>{getChatAuthorInitials(authorName)}</Text>
							</View>
						) : null}
					</View>
				) : null}
				<View style={[local.messageColumn, isOwn && local.ownMessageColumn]}>
					{!isOwn && showIdentity ? <Text style={local.author}>{authorName}</Text> : null}
					<View style={local.deleted}>
						<Text style={local.deletedText}>Message deleted</Text>
					</View>
				</View>
			</View>
		);
	}

	return (
		<GestureDetector gesture={swipeGesture}>
			<View style={local.swipeContainer}>
				<Animated.View
					pointerEvents="none"
					style={[local.replyAction, local.leftReplyAction, leftReplyActionStyle]}
				>
					<Reply size={18} color={Colors.primary} />
				</Animated.View>
				<Animated.View
					pointerEvents="none"
					style={[local.replyAction, local.rightReplyAction, rightReplyActionStyle]}
				>
					<Reply size={18} color={Colors.primary} />
				</Animated.View>
				<Animated.View
					style={[
						local.row,
						isOwn && local.ownRow,
						showIdentity ? local.groupStart : local.groupContinuation,
						swipeStyle,
					]}
				>
					{!isOwn ? (
						<View style={local.avatarSlot}>
							{showIdentity ? (
								<View
									accessible
									accessibilityLabel={`${authorName}'s avatar`}
									style={[
										local.avatar,
										{
											backgroundColor:
												AVATAR_COLORS[
													getChatAvatarIndex(message.authorUid, AVATAR_COLORS.length)
												],
										},
									]}
								>
									<Text style={local.avatarText}>{getChatAuthorInitials(authorName)}</Text>
								</View>
							) : null}
						</View>
					) : null}

					<View style={[local.messageColumn, isOwn && local.ownMessageColumn]}>
						{!isOwn && showIdentity ? <Text style={local.author}>{authorName}</Text> : null}
						<Pressable
							accessibilityRole="text"
							accessibilityLabel={`${isOwn ? "Your" : authorName + "'s"} message: ${message.content}`}
							delayLongPress={200}
							onLongPress={canReply ? () => onLongPress(message) : undefined}
							style={[
								local.bubble,
								isOwn ? local.ownBubble : local.otherBubble,
								reactions.length > 0 && local.bubbleWithReactions,
								isPending && local.pendingBubble,
							]}
						>
							{message.replyToMessageId ? (
								<View
									style={[
										local.replyPreview,
										isOwn ? local.ownReplyPreview : local.otherReplyPreview,
									]}
								>
									<Text style={[local.replyAuthor, isOwn && local.ownReplyText]}>
										{repliedMessage
											? repliedMessage.authorUid === currentUserId
												? "You"
												: normalizeChatDisplayName(repliedMessage.authorName)
											: "Replied message"}
									</Text>
									<Text style={[local.replyContent, isOwn && local.ownReplyText]} numberOfLines={1}>
										{repliedMessage?.content ?? "Message content not loaded"}
									</Text>
								</View>
							) : null}

							<Text
								style={[
									local.content,
									message.type === "POLL" && local.pollContent,
									isOwn && local.ownContent,
								]}
							>
								{renderMessageContent(message.content, isOwn)}
							</Text>

							{message.type === "POLL" && message.poll ? (
								<ChatPollCard
									poll={message.poll}
									isOwn={isOwn}
									canClose={canClosePoll}
									onVote={onVotePoll}
									onClose={onClosePoll}
								/>
							) : null}

							<View style={[local.footer, reactions.length > 0 && local.footerWithReactions]}>
								{reactions.length > 0 ? (
									<View style={local.reactions}>
										{reactions.map(([emoji, summary]) => (
											<Pressable
												key={emoji}
												accessibilityRole="button"
												accessibilityLabel={
													summary.hasReacted
														? `Remove ${emoji} reaction`
														: `React with ${emoji}`
												}
												hitSlop={4}
												onPress={() =>
													summary.hasReacted
														? onUnreact(message.id)
														: onReact(message.id, emoji)
												}
												style={({ pressed }) => [
													local.reaction,
													isOwn ? local.ownReaction : local.otherReaction,
													summary.hasReacted && local.reactionSelected,
													pressed && local.pressed,
												]}
											>
												<Text style={local.reactionEmoji}>{emoji}</Text>
												<Text style={local.reactionCount}>{summary.count}</Text>
											</Pressable>
										))}
									</View>
								) : null}
								<View style={local.meta}>
									{message.editedAt ? (
										<Text style={[local.metaText, isOwn && local.ownMeta]}>edited</Text>
									) : null}
									{message.failed ? (
										<Pressable
											accessibilityRole="button"
											accessibilityLabel="Retry sending message"
											onPress={() => onRetry(message.id)}
											style={local.retry}
										>
											<AlertCircle size={12} color={Colors.destructive} />
											<Text style={local.retryText}>Retry</Text>
										</Pressable>
									) : (
										<>
											<Text style={[local.metaText, isOwn && local.ownMeta]}>
												{formatChatTime(messageTimestamp(message))}
											</Text>
											{isOwn ? (
												isPending ? (
													<Clock3 size={12} color={Colors.textPrimary} />
												) : (
													<Check size={13} color={Colors.textPrimary} />
												)
											) : null}
										</>
									)}
								</View>
							</View>
						</Pressable>
					</View>
				</Animated.View>
			</View>
		</GestureDetector>
	);
});

export default ChatMessageBubble;

const local = StyleSheet.create({
	swipeContainer: { width: "100%", position: "relative" },
	row: { width: "100%", flexDirection: "row", alignItems: "flex-end", gap: Spacing.sm },
	ownRow: { flexDirection: "row-reverse" },
	groupStart: { marginTop: Spacing.lg },
	groupContinuation: { marginTop: Spacing.xs },
	avatarSlot: { width: 40, minHeight: 40, justifyContent: "flex-end" },
	avatar: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: Radius.full },
	avatarText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
	messageColumn: { maxWidth: "86%", alignItems: "flex-start" },
	ownMessageColumn: { alignItems: "flex-end" },
	replyAction: { position: "absolute", top: 0, bottom: 0, width: 44, alignItems: "center", justifyContent: "center" },
	leftReplyAction: { left: 0 },
	rightReplyAction: { right: 0 },
	author: {
		marginBottom: 6,
		paddingHorizontal: Spacing.xs,
		fontSize: FontSize.md,
		fontWeight: FontWeight.semibold,
		letterSpacing: -0.2,
		color: Colors.secondary,
	},
	bubble: {
		minWidth: 80,
		paddingHorizontal: Spacing.sm,
		paddingVertical: Spacing.xs,
		borderWidth: 1,
		borderRadius: Radius.lg,
		borderCurve: "continuous",
		shadowColor: "#000000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.16,
		shadowRadius: 10,
		elevation: 2,
	},
	bubbleWithReactions: { minWidth: 116 },
	otherBubble: {
		borderColor: Colors.borderLight,
		borderBottomLeftRadius: Radius.sm,
		backgroundColor: Colors.surfaceElevated,
	},
	ownBubble: { borderColor: Colors.primary, borderBottomRightRadius: Radius.sm, backgroundColor: Colors.primary },
	pendingBubble: { opacity: 0.8 },
	content: { fontSize: FontSize.md, lineHeight: 22, color: Colors.textPrimary },
	pollContent: { fontWeight: FontWeight.semibold, lineHeight: 21 },
	ownContent: { color: Colors.textPrimary },
	link: { color: Colors.secondary, textDecorationLine: "underline" },
	ownLink: { color: Colors.textPrimary, textDecorationLine: "underline" },
	replyPreview: {
		marginBottom: Spacing.xs,
		minWidth: 120,
		borderLeftWidth: 3,
		borderRadius: Radius.sm,
		paddingHorizontal: Spacing.sm,
		paddingVertical: 2,
	},
	otherReplyPreview: { borderLeftColor: Colors.secondary, backgroundColor: Colors.surface },
	ownReplyPreview: { borderLeftColor: Colors.textPrimary, backgroundColor: Colors.primaryDark },
	replyAuthor: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.secondary },
	replyContent: { fontSize: FontSize.xs, color: Colors.textMuted },
	ownReplyText: { color: Colors.textPrimary },
	footer: {
		flexDirection: "row",
		alignItems: "flex-end",
		justifyContent: "flex-end",
		gap: Spacing.sm,
		marginTop: Spacing.xs,
	},
	footerWithReactions: { justifyContent: "space-between" },
	reactions: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.xs, flexShrink: 1 },
	reaction: {
		minWidth: 48,
		height: 36,
		minHeight: 36,
		flexShrink: 0,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 4,
		borderWidth: 1,
		borderRadius: Radius.full,
		paddingHorizontal: 6,
		paddingVertical: 2,
	},
	otherReaction: { borderColor: Colors.borderLight, backgroundColor: Colors.surface },
	ownReaction: { borderColor: Colors.primaryDark, backgroundColor: Colors.primaryDark },
	reactionSelected: { borderColor: Colors.secondary, backgroundColor: "rgba(0,194,255,0.18)" },
	reactionEmoji: { includeFontPadding: false, fontSize: FontSize.md, lineHeight: 20 },
	reactionCount: {
		includeFontPadding: false,
		fontSize: FontSize.xs,
		lineHeight: 16,
		fontWeight: FontWeight.semibold,
		color: Colors.textPrimary,
	},
	meta: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "flex-end",
		gap: 4,
		alignSelf: "flex-end",
		flexShrink: 0,
	},
	ownMeta: { color: Colors.textPrimary },
	metaText: {
		includeFontPadding: false,
		fontSize: 10,
		lineHeight: 14,
		fontWeight: FontWeight.medium,
		color: Colors.textMuted,
	},
	retry: { flexDirection: "row", alignItems: "center", gap: 4 },
	retryText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.destructive },
	pressed: { opacity: 0.75 },
	announcementRow: { alignItems: "center", marginVertical: Spacing.sm },
	announcement: {
		width: "92%",
		maxWidth: 420,
		borderWidth: 1,
		borderColor: Colors.primaryDark,
		borderRadius: Radius.lg,
		padding: Spacing.md,
		backgroundColor: Colors.surface,
	},
	announcementHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
	announcementIcon: {
		width: 32,
		height: 32,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: Radius.md,
		backgroundColor: Colors.surfaceElevated,
	},
	announcementCopy: { flex: 1, minWidth: 0 },
	announcementLabel: {
		fontSize: 10,
		fontWeight: FontWeight.bold,
		letterSpacing: 1.4,
		textTransform: "uppercase",
		color: Colors.primary,
	},
	announcementAuthor: { marginTop: 2, fontSize: FontSize.xs, color: Colors.textMuted },
	announcementText: { marginTop: Spacing.sm, fontSize: FontSize.base, lineHeight: 21, color: Colors.textPrimary },
	announcementTime: { alignSelf: "flex-start", fontSize: 10, color: Colors.textMuted },
	deleted: {
		borderWidth: 1,
		borderColor: Colors.border,
		borderRadius: Radius.lg,
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.sm,
		backgroundColor: Colors.surface,
	},
	deletedText: { fontSize: FontSize.sm, fontStyle: "italic", color: Colors.textSubtle },
});
