import { memo, useMemo, type ReactNode } from "react";
import { Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { AlertCircle, Check, Clock3, Megaphone, Reply } from "lucide-react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import {
	CHAT_OPTIMISTIC_PREFIX,
	formatChatTime,
	getChatAuthorInitials,
	getChatAvatarIndex,
	extractWhatsAppLinks,
	isDeletedChatAnnouncement,
	messageTimestamp,
	normalizeChatDisplayName,
	parseWhatsAppText,
	summarizeChatReactions,
	type ChatDisplayMessage,
	type WhatsAppInlinePart,
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
	isHighlighted?: boolean;
	onLongPress: (message: ChatDisplayMessage) => void;
	onSwipeReply: (messageId: string) => void;
	onRetry: (messageId: string) => void;
	onReact: (messageId: string, emoji: string) => void;
	onUnreact: (messageId: string) => void;
	canClosePoll: boolean;
	onVotePoll: (pollId: string, optionIds: string[]) => Promise<void>;
	onClosePoll: (pollId: string) => Promise<void>;
	onJumpToMessage?: (messageId: string) => void;
	searchQuery?: string;
}

function renderHighlightedText(value: string, searchQuery: string | undefined, keyPrefix: string): ReactNode[] | string {
	const query = searchQuery?.trim();
	if (!query) return value;

	const normalizedValue = value.toLocaleLowerCase();
	const normalizedQuery = query.toLocaleLowerCase();
	const result: ReactNode[] = [];
	let cursor = 0;
	let matchIndex = normalizedValue.indexOf(normalizedQuery, cursor);
	let matchNumber = 0;

	while (matchIndex >= 0) {
		if (matchIndex > cursor) result.push(value.slice(cursor, matchIndex));
		result.push(
			<Text key={`${keyPrefix}-match-${matchNumber}`} style={local.searchMatch}>
				{value.slice(matchIndex, matchIndex + query.length)}
			</Text>,
		);
		cursor = matchIndex + query.length;
		matchNumber += 1;
		matchIndex = normalizedValue.indexOf(normalizedQuery, cursor);
	}

	if (cursor === 0) return value;
	if (cursor < value.length) result.push(value.slice(cursor));
	return result;
}

function renderWhatsAppInline(parts: WhatsAppInlinePart[], isOwn: boolean, keyPrefix: string, searchQuery?: string): ReactNode[] {
	return parts.map((part, index) => {
		const key = `${keyPrefix}-${index}`;
		switch (part.type) {
			case "bold":
				return <Text key={key} style={local.bold}>{renderWhatsAppInline(part.children, isOwn, key, searchQuery)}</Text>;
			case "italic":
				return <Text key={key} style={local.italic}>{renderWhatsAppInline(part.children, isOwn, key, searchQuery)}</Text>;
			case "strikethrough":
				return <Text key={key} style={local.strikethrough}>{renderWhatsAppInline(part.children, isOwn, key, searchQuery)}</Text>;
			case "monospace":
				return <Text key={key} style={local.monospace}>{renderWhatsAppInline(part.children, isOwn, key, searchQuery)}</Text>;
			case "link":
				return (
					<Text key={key} style={isOwn ? local.ownLink : local.link} onPress={() => void Linking.openURL(part.url)}>
						{renderHighlightedText(part.url, searchQuery, key)}
					</Text>
				);
			default:
				return renderHighlightedText(part.text, searchQuery, key);
		}
	});
}

function renderMessageContent(content: string, isOwn: boolean, searchQuery?: string): ReactNode[] {
	return parseWhatsAppText(content).flatMap((block, index) => {
		const lineBreak = index > 0 ? "\n" : "";
		const key = `whatsapp-block-${index}`;
		if (block.type === "code") {
			return [lineBreak, <Text key={key} style={local.codeBlock}>{block.text || "\u00a0"}</Text>];
		}

		const children = renderWhatsAppInline(block.children, isOwn, key, searchQuery);
		if (block.type === "bullet") {
			return [lineBreak, <Text key={key} style={local.bulletLine}>• {children}</Text>];
		}
		if (block.type === "numbered") {
			return [lineBreak, <Text key={key} style={local.numberedLine}>{block.number}. {children}</Text>];
		}
		if (block.type === "quote") {
			return [lineBreak, <Text key={key} style={local.quoteLine}>│ {children.length > 0 ? children : "\u00a0"}</Text>];
		}
		return [lineBreak, <Text key={key}>{children.length > 0 ? children : "\u00a0"}</Text>];
	});
}

const ChatMessageBubble = memo(function ChatMessageBubbleView({
	message,
	repliedMessage,
	currentUserId,
	showIdentity,
	isHighlighted = false,
	onLongPress,
	onSwipeReply,
	onRetry,
	onReact,
	onUnreact,
	canClosePoll,
	onVotePoll,
	onClosePoll,
	onJumpToMessage,
	searchQuery,
}: Props) {
	const isOwn = currentUserId === message.authorUid;
	const isDeleted = message.visibility === "DELETED";
	const isAnnouncement = message.type === "ANNOUNCEMENT";
	const isPoll = message.type === "POLL";
	const isPending = message.id.startsWith(CHAT_OPTIMISTIC_PREFIX);
	const canReply = !isPending && !message.failed && !isDeleted;
	const authorName = normalizeChatDisplayName(message.authorName);
	const reactions = useMemo(
		() => summarizeChatReactions(message.reactions, currentUserId),
		[currentUserId, message.reactions]
	);
	const renderedContent = useMemo(
		() => renderMessageContent(message.content, isOwn, searchQuery),
		[isOwn, message.content, searchQuery]
	);
	const previewLink = useMemo(() => extractWhatsAppLinks(message.content)[0] ?? null, [message.content]);
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
					// Reanimated shared values are intentionally mutated inside worklets.
					// eslint-disable-next-line react-hooks/immutability
					swipeX.value = Math.min(Math.max(event.translationX, -SWIPE_REPLY_DISTANCE), SWIPE_REPLY_DISTANCE);
				})
				.onEnd(() => {
					const shouldReply = Math.abs(swipeX.value) >= SWIPE_REPLY_TRIGGER;
					// eslint-disable-next-line react-hooks/immutability
					swipeX.value = withSpring(0);
					if (shouldReply) runOnJS(onSwipeReply)(message.id);
				})
				.onFinalize(() => {
					// eslint-disable-next-line react-hooks/immutability
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
					style={({ pressed }) => [local.announcement, isHighlighted && local.highlightedBubble, pressed && local.pressed]}
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
					<Text style={local.announcementText}>{renderedContent}</Text>
					{previewLink ? (
						<LinkPreviewCard
							url={previewLink}
							isOwn={false}
							onLongPress={!isPending ? () => onLongPress(message) : undefined}
						/>
					) : null}
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
						<Text style={local.deletedText}>Message deleted{"\u00a0"}</Text>
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

					<View style={[local.messageColumn, isOwn && local.ownMessageColumn, isPoll && local.pollMessageColumn]}>
						{!isOwn && showIdentity ? <Text style={local.author}>{authorName}</Text> : null}
						<Pressable
							accessibilityRole="text"
							accessibilityLabel={`${isOwn ? "Your" : authorName + "'s"} message: ${message.content}`}
							delayLongPress={200}
							onLongPress={canReply ? () => onLongPress(message) : undefined}
							style={[
								local.bubble,
								isOwn ? local.ownBubble : local.otherBubble,
								isHighlighted && local.highlightedBubble,
								message.type === "POLL" && local.pollBubble,
								reactions.length > 0 && local.bubbleWithReactions,
								isPending && local.pendingBubble,
							]}
						>
							{message.replyToMessageId ? (
								<Pressable
									style={[
										local.replyPreview,
										isOwn ? local.ownReplyPreview : local.otherReplyPreview,
									]}
									onPress={repliedMessage && onJumpToMessage ? () => onJumpToMessage(repliedMessage.id) : undefined}
									onLongPress={canReply ? () => onLongPress(message) : undefined}
									delayLongPress={200}
									accessibilityRole={repliedMessage && onJumpToMessage ? "button" : "text"}
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
								</Pressable>
							) : null}

							<Text
								style={[
									local.content,
									message.type === "POLL" && local.pollContent,
									isOwn && local.ownContent,
								]}
							>
								{renderedContent}
							</Text>
							{previewLink ? (
								<LinkPreviewCard
									url={previewLink}
									isOwn={isOwn}
									onLongPress={canReply ? () => onLongPress(message) : undefined}
								/>
							) : null}

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

function LinkPreviewCard({ url, isOwn, onLongPress }: { url: string; isOwn: boolean; onLongPress?: () => void }) {
		const hostname = useMemo(() => {
			try {
				return new URL(url).hostname.replace(/^www\./, "");
			} catch {
				return url;
			}
		}, [url]);

	return (
		<Pressable
			accessibilityRole="link"
			accessibilityLabel={`Open link preview for ${hostname}`}
			delayLongPress={200}
			onLongPress={onLongPress}
			onPress={() => void Linking.openURL(url)}
			style={[local.linkPreview, isOwn ? local.ownLinkPreview : local.otherLinkPreview]}
		>
			<Text style={local.linkPreviewLabel}>LINK PREVIEW</Text>
			<Text style={[local.linkPreviewHost, isOwn && local.ownLinkPreviewText]} numberOfLines={1}>{hostname}</Text>
			<Text style={[local.linkPreviewUrl, isOwn && local.ownLinkPreviewText]} numberOfLines={1}>{url}</Text>
		</Pressable>
	);
}

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
	pollMessageColumn: { width: "86%" },
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
	pollBubble: { alignSelf: "stretch" },
	pendingBubble: { opacity: 0.8 },
	content: { fontSize: FontSize.md, lineHeight: 22, color: Colors.textPrimary },
	searchMatch: { borderRadius: 3, backgroundColor: "#f2c94c", color: "#171717" },
	pollContent: { fontWeight: FontWeight.semibold, lineHeight: 21 },
	ownContent: { color: Colors.textPrimary },
	link: { color: Colors.secondary, textDecorationLine: "underline" },
	ownLink: { color: Colors.textPrimary, textDecorationLine: "underline" },
	bold: { fontWeight: FontWeight.bold },
	italic: { fontStyle: "italic" },
	strikethrough: { textDecorationLine: "line-through" },
	monospace: { fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }) },
	codeBlock: { fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }), color: Colors.textPrimary },
	bulletLine: { paddingLeft: Spacing.xs },
	numberedLine: { paddingLeft: Spacing.xs },
	quoteLine: { color: Colors.textMuted, fontStyle: "italic" },
	linkPreview: { marginTop: Spacing.sm, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.sm },
	otherLinkPreview: { borderColor: Colors.borderLight, backgroundColor: Colors.surface },
	ownLinkPreview: { borderColor: "rgba(255,255,255,0.25)", backgroundColor: Colors.primaryDark },
	linkPreviewLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 1, color: Colors.secondary },
	linkPreviewHost: { marginTop: 2, fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
	linkPreviewUrl: { marginTop: 2, fontSize: FontSize.xs, color: Colors.textMuted },
	ownLinkPreviewText: { color: Colors.textPrimary },
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
	highlightedBubble: {
		borderColor: Colors.secondary,
		shadowColor: Colors.secondary,
		shadowOpacity: 0.75,
		shadowRadius: 12,
		elevation: 8,
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
	deletedText: { flexShrink: 0, fontSize: FontSize.sm, fontStyle: "italic", color: Colors.textSubtle },
});
