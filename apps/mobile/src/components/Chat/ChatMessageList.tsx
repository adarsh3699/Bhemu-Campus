import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, Keyboard } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import type { ListRenderItem } from "react-native";
import {
	formatChatDate,
	messageTimestamp,
	shouldShowChatDateSeparator,
	startsChatAuthorGroup,
	type ChatDisplayMessage,
	type ChatMessage,
	type PinDuration,
	type RoomPin,
} from "@bhemu/shared";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "@/constants/Theme";
import ChatMessageActionSheet from "./ChatMessageActionSheet";
import ChatMessageBubble from "./ChatMessageBubble";
import ChatPinnedMessagesBar from "./ChatPinnedMessagesBar";

interface Props {
	messages: ChatDisplayMessage[];
	pinnedMessages: RoomPin[];
	canPin: boolean;
	canClosePoll: boolean;
	currentUserId: string | null;
	hasMore: boolean;
	loadingMessages: boolean;
	notificationMessageId?: string;
	onLoadOlder: () => Promise<void>;
	onReply: (message: ChatMessage) => void;
	onEdit: (message: ChatMessage) => void;
	onDelete: (messageId: string) => void;
	onRetry: (messageId: string) => void;
	onReact: (messageId: string, emoji: string) => void;
	onUnreact: (messageId: string) => void;
	onReport: (messageId: string) => void;
	onTogglePin: (messageId: string, duration?: PinDuration) => Promise<void>;
	onVotePoll: (pollId: string, optionIds: string[]) => Promise<void>;
	onClosePoll: (pollId: string) => Promise<void>;
	onNotificationMessageUnavailable?: (messageId: string) => void;
	searchFocusMessageId?: string | null;
	searchQuery?: string;
}

export default function ChatMessageList({
	messages,
	pinnedMessages,
	canPin,
	canClosePoll,
	currentUserId,
	hasMore,
	loadingMessages,
	notificationMessageId,
	onLoadOlder,
	onReply,
	onEdit,
	onDelete,
	onRetry,
	onReact,
	onUnreact,
	onReport,
	onTogglePin,
	onVotePoll,
	onClosePoll,
	onNotificationMessageUnavailable,
	searchFocusMessageId,
	searchQuery,
}: Props) {
	const data = useMemo(() => [...messages].reverse(), [messages]);
	const listRef = useRef<FlatList<ChatDisplayMessage>>(null);
	const messageMap = useMemo(() => new Map(messages.map((message) => [message.id, message])), [messages]);
	const messageMapRef = useRef(messageMap);
	const pendingScrollMessageIdRef = useRef<string | null>(null);
	const notificationHandledRef = useRef<string | null>(null);
	const notificationUnavailableRef = useRef<string | null>(null);
	const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
	const [unreadCount, setUnreadCount] = useState(0);
	const isAtLatestRef = useRef(true);
	const previousMessageCountRef = useRef(messages.length);
	const messageCount = messages.length;
	const newestMessageId = messages[messageCount - 1]?.id;
	const previousNewestMessageIdRef = useRef(newestMessageId);
	useEffect(() => {
		messageMapRef.current = messageMap;
	}, [messageMap]);
	useEffect(() => {
		const previousCount = previousMessageCountRef.current;
		const newestMessageChanged = newestMessageId !== previousNewestMessageIdRef.current;
		if (messageCount === 0) {
			const timer = setTimeout(() => setUnreadCount(0), 0);
			previousMessageCountRef.current = messageCount;
			previousNewestMessageIdRef.current = newestMessageId;
			return () => clearTimeout(timer);
		} else if (messageCount > previousCount && newestMessageChanged) {
			const timer = setTimeout(() => {
				if (isAtLatestRef.current) setUnreadCount(0);
				else setUnreadCount((current) => Math.min(99, current + messageCount - previousCount));
			}, 0);
			previousMessageCountRef.current = messageCount;
			previousNewestMessageIdRef.current = newestMessageId;
			return () => clearTimeout(timer);
		}
		previousMessageCountRef.current = messageCount;
		previousNewestMessageIdRef.current = newestMessageId;
	}, [messageCount, newestMessageId]);
	const [actionsMessage, setActionsMessage] = useState<ChatDisplayMessage | null>(null);
	const handleSwipeReply = useCallback((messageId: string) => {
		const message = messageMapRef.current.get(messageId);
		if (message) onReply(message);
	}, [onReply]);
	const handleLongPress = useCallback((message: ChatDisplayMessage) => {
		Keyboard.dismiss();
		setActionsMessage(message);
	}, []);
	const highlightMessage = useCallback((messageId: string) => {
		setHighlightedMessageId(messageId);
		if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
		highlightTimerRef.current = setTimeout(() => {
			setHighlightedMessageId(null);
			highlightTimerRef.current = null;
		}, 3_000);
	}, []);
	useEffect(() => () => {
		if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
	}, []);
	const scrollToMessage = useCallback((messageId: string) => {
		const index = data.findIndex((message) => message.id === messageId);
		if (index >= 0) {
			listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
			highlightMessage(messageId);
			return;
		}
		if (hasMore) {
			pendingScrollMessageIdRef.current = messageId;
			if (!loadingMessages) void onLoadOlder();
		}
	}, [data, hasMore, highlightMessage, loadingMessages, onLoadOlder]);

	useEffect(() => {
		if (!notificationMessageId) {
			if (highlightTimerRef.current) {
				clearTimeout(highlightTimerRef.current);
				highlightTimerRef.current = null;
			}
			const timer = setTimeout(() => setHighlightedMessageId(null), 0);
			return () => clearTimeout(timer);
		}
		if (notificationHandledRef.current === notificationMessageId) return;

		const index = data.findIndex((message) => message.id === notificationMessageId);
		if (index >= 0) {
			notificationHandledRef.current = notificationMessageId;
			notificationUnavailableRef.current = null;
			listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
			const highlightTimer = setTimeout(() => highlightMessage(notificationMessageId), 0);
			return () => clearTimeout(highlightTimer);
		}

		if (loadingMessages) return;
		pendingScrollMessageIdRef.current = notificationMessageId;
		if (hasMore && !loadingMessages) void onLoadOlder();
		else {
			pendingScrollMessageIdRef.current = null;
			if (notificationUnavailableRef.current !== notificationMessageId) {
				notificationUnavailableRef.current = notificationMessageId;
				onNotificationMessageUnavailable?.(notificationMessageId);
			}
		}
	}, [data, hasMore, highlightMessage, loadingMessages, notificationMessageId, onLoadOlder, onNotificationMessageUnavailable]);

	useEffect(() => {
		if (!searchFocusMessageId) return;
		const index = data.findIndex((message) => message.id === searchFocusMessageId);
		if (index < 0) return;
		listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
		const timer = setTimeout(() => highlightMessage(searchFocusMessageId), 0);
		return () => clearTimeout(timer);
	}, [data, highlightMessage, searchFocusMessageId]);

	useEffect(() => {
		const messageId = pendingScrollMessageIdRef.current;
		if (!messageId || loadingMessages) return;
		const index = data.findIndex((message) => message.id === messageId);
		if (index >= 0) {
			pendingScrollMessageIdRef.current = null;
			if (messageId === notificationMessageId) {
				notificationHandledRef.current = messageId;
				notificationUnavailableRef.current = null;
				highlightMessage(messageId);
			}
			listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
			return;
		}
		if (hasMore) {
			void onLoadOlder();
			return;
		}
		pendingScrollMessageIdRef.current = null;
		if (messageId === notificationMessageId && notificationUnavailableRef.current !== messageId) {
			notificationUnavailableRef.current = messageId;
			onNotificationMessageUnavailable?.(messageId);
		}
	}, [data, hasMore, highlightMessage, loadingMessages, notificationMessageId, onLoadOlder, onNotificationMessageUnavailable]);

	const handleScrollToIndexFailed = useCallback(({ index, averageItemLength }: { index: number; averageItemLength: number }) => {
		const estimatedOffset = Math.max(0, index * Math.max(averageItemLength, 1));
		listRef.current?.scrollToOffset({ offset: estimatedOffset, animated: false });
		setTimeout(() => {
			listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
		}, 120);
	}, []);

	const renderItem = useCallback<ListRenderItem<ChatDisplayMessage>>(
		({ item, index }) => {
			const olderMessage = data[index + 1];
			return (
				<View>
					{shouldShowChatDateSeparator(item, olderMessage) ? (
						<View style={local.dateSeparator}>
							<Text style={local.dateText}>{formatChatDate(messageTimestamp(item))}</Text>
						</View>
					) : null}
					<ChatMessageBubble
						message={item}
						isHighlighted={highlightedMessageId === item.id || searchFocusMessageId === item.id}
						repliedMessage={item.replyToMessageId ? messageMap.get(item.replyToMessageId) : undefined}
						currentUserId={currentUserId}
						showIdentity={!item.authorUid || item.authorUid !== currentUserId ? startsChatAuthorGroup(item, olderMessage) : false}
						onLongPress={handleLongPress}
						onSwipeReply={handleSwipeReply}
						onRetry={onRetry}
						onReact={onReact}
						onUnreact={onUnreact}
						canClosePoll={canClosePoll}
						onVotePoll={onVotePoll}
						onClosePoll={onClosePoll}
						onJumpToMessage={scrollToMessage}
						searchQuery={searchFocusMessageId === item.id ? searchQuery : undefined}
					/>
				</View>
			);
		},
		[currentUserId, data, handleLongPress, handleSwipeReply, highlightedMessageId, messageMap, onClosePoll, onReact, onRetry, onUnreact, onVotePoll, canClosePoll, searchFocusMessageId, scrollToMessage, searchQuery],
	);

	const empty = useMemo(
		() => (
			<View style={local.empty}>
				{loadingMessages ? <ActivityIndicator size="small" color={Colors.textMuted} /> : null}
				<Text style={local.emptyTitle}>{loadingMessages ? "Loading conversation…" : "No messages yet"}</Text>
				{!loadingMessages ? <Text style={local.emptyText}>Be the first to say something!</Text> : null}
			</View>
		),
		[loadingMessages],
	);

	const loadOlder = useCallback(() => {
		if (!loadingMessages && hasMore) void onLoadOlder();
	}, [hasMore, loadingMessages, onLoadOlder]);
	const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
		const atLatest = event.nativeEvent.contentOffset.y <= 48;
		isAtLatestRef.current = atLatest;
		if (atLatest) setUnreadCount(0);
	}, []);
	const jumpToLatest = useCallback(() => {
		isAtLatestRef.current = true;
		setUnreadCount(0);
		listRef.current?.scrollToOffset({ offset: 0, animated: true });
	}, []);

	const olderMessagesFooter = useMemo(() => {
		if (loadingMessages && data.length > 0) {
			return <ActivityIndicator style={local.footerSpinner} size="small" color={Colors.textMuted} />;
		}
		if (!hasMore) return null;
		return (
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Load older messages"
				onPress={loadOlder}
				style={({ pressed }) => [local.loadOlder, pressed && local.pressed]}
			>
				<Text style={local.loadOlderText}>Load older messages</Text>
			</Pressable>
		);
	}, [data.length, hasMore, loadOlder, loadingMessages]);

	const selectedMessage = actionsMessage ? messageMap.get(actionsMessage.id) ?? null : null;
	const selectedMessageIsPinned = selectedMessage ? pinnedMessages.some((pin) => pin.messageId === selectedMessage.id) : false;

	return (
		<>
			<ChatPinnedMessagesBar
				pins={pinnedMessages}
				messages={messages}
				canManage={canPin}
				onSelect={scrollToMessage}
				onUnpin={onTogglePin}
			/>
			<View style={local.listContainer}>
				<FlatList
					ref={listRef}
					style={local.list}
					data={data}
					inverted
					keyExtractor={(item) => item.id}
					renderItem={renderItem}
					ListEmptyComponent={empty}
					ListFooterComponent={olderMessagesFooter}
					onEndReached={hasMore ? loadOlder : undefined}
					onEndReachedThreshold={0.2}
					onScroll={handleScroll}
					scrollEventThrottle={100}
					contentContainerStyle={[local.content, data.length === 0 && local.emptyContent]}
					showsVerticalScrollIndicator={false}
					keyboardShouldPersistTaps="handled"
					keyboardDismissMode={"on-drag"}
					onScrollToIndexFailed={handleScrollToIndexFailed}
					initialNumToRender={20}
					maxToRenderPerBatch={12}
					windowSize={7}
					removeClippedSubviews
				/>
				{unreadCount > 0 ? (
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={`Jump to ${unreadCount} new message${unreadCount === 1 ? "" : "s"}`}
						onPress={jumpToLatest}
						style={({ pressed }) => [local.unreadButton, pressed && local.pressed]}
					>
						<View style={local.unreadLine} />
						<Text style={local.unreadText}>{unreadCount} new {unreadCount === 1 ? "message" : "messages"} · Jump to latest</Text>
						<View style={local.unreadLine} />
					</Pressable>
				) : null}
			</View>
			{selectedMessage ? (
				<ChatMessageActionSheet
					message={selectedMessage}
					currentUserId={currentUserId}
					onClose={() => setActionsMessage(null)}
					onReply={onReply}
					onEdit={onEdit}
					onDelete={onDelete}
					onRetry={onRetry}
					onReact={onReact}
					onUnreact={onUnreact}
					onReport={onReport}
					canPin={canPin}
					isPinned={selectedMessageIsPinned}
					onTogglePin={onTogglePin}
				/>
			) : null}
		</>
	);
}

const local = StyleSheet.create({
	listContainer: { flex: 1, minHeight: 0, position: "relative" },
	list: { flex: 1 },
	content: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
	emptyContent: { flexGrow: 1 },
	empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing.sm, paddingHorizontal: Spacing.xl },
	emptyTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, textAlign: "center", color: Colors.textBody },
	emptyText: { fontSize: FontSize.sm, textAlign: "center", color: Colors.textSubtle },
	dateSeparator: { alignItems: "center", marginVertical: Spacing.xl },
	dateText: { borderWidth: 1, borderColor: Colors.borderLight, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textBody, backgroundColor: Colors.surfaceElevated },
	footerSpinner: { marginVertical: Spacing.md },
	loadOlder: { alignSelf: "center", minHeight: 44, justifyContent: "center", marginVertical: Spacing.sm, paddingHorizontal: Spacing.lg, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: Radius.full, backgroundColor: Colors.surface },
	loadOlderText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textMuted },
	pressed: { opacity: 0.75 },
	unreadButton: { position: "absolute", left: Spacing.lg, right: Spacing.lg, bottom: Spacing.md, minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.sm, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.full, backgroundColor: Colors.surfaceElevated },
	unreadLine: { flex: 1, height: 1, backgroundColor: Colors.primary },
	unreadText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.primary },
});
