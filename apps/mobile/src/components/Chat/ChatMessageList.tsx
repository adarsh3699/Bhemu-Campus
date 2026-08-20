import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import type { ListRenderItem } from "react-native";
import {
	formatChatDate,
	messageTimestamp,
	shouldShowChatDateSeparator,
	startsChatAuthorGroup,
	type ChatDisplayMessage,
	type ChatMessage,
} from "@bhemu/shared";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "@/constants/Theme";
import ChatMessageActionSheet from "./ChatMessageActionSheet";
import ChatMessageBubble from "./ChatMessageBubble";

interface Props {
	messages: ChatDisplayMessage[];
	currentUserId: string | null;
	hasMore: boolean;
	loadingMessages: boolean;
	onLoadOlder: () => Promise<void>;
	onReply: (message: ChatMessage) => void;
	onEdit: (message: ChatMessage) => void;
	onDelete: (messageId: string) => void;
	onRetry: (messageId: string) => void;
	onReact: (messageId: string, emoji: string) => void;
	onUnreact: (messageId: string) => void;
	onReport: (messageId: string) => void;
}

export default function ChatMessageList({
	messages,
	currentUserId,
	hasMore,
	loadingMessages,
	onLoadOlder,
	onReply,
	onEdit,
	onDelete,
	onRetry,
	onReact,
	onUnreact,
	onReport,
}: Props) {
	const data = useMemo(() => [...messages].reverse(), [messages]);
	const messageMap = useMemo(() => new Map(messages.map((message) => [message.id, message])), [messages]);
	const messageMapRef = useRef(messageMap);
	useEffect(() => {
		messageMapRef.current = messageMap;
	}, [messageMap]);
	const [actionsMessage, setActionsMessage] = useState<ChatDisplayMessage | null>(null);
	const handleSwipeReply = useCallback((messageId: string) => {
		const message = messageMapRef.current.get(messageId);
		if (message) onReply(message);
	}, [onReply]);

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
						repliedMessage={item.replyToMessageId ? messageMap.get(item.replyToMessageId) : undefined}
						currentUserId={currentUserId}
						showIdentity={!item.authorUid || item.authorUid !== currentUserId ? startsChatAuthorGroup(item, olderMessage) : false}
						onLongPress={setActionsMessage}
						onSwipeReply={handleSwipeReply}
						onRetry={onRetry}
						onReact={onReact}
						onUnreact={onUnreact}
					/>
				</View>
			);
		},
		[currentUserId, data, handleSwipeReply, messageMap, onReact, onRetry, onUnreact],
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

	return (
		<>
			<FlatList
				style={local.list}
				data={data}
				inverted
				keyExtractor={(item) => item.id}
				renderItem={renderItem}
				ListEmptyComponent={empty}
				ListFooterComponent={olderMessagesFooter}
				onEndReached={hasMore ? loadOlder : undefined}
				onEndReachedThreshold={0.2}
				contentContainerStyle={[local.content, data.length === 0 && local.emptyContent]}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
				keyboardDismissMode={"on-drag"}
				initialNumToRender={20}
				maxToRenderPerBatch={12}
				windowSize={7}
				removeClippedSubviews
			/>
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
				/>
			) : null}
		</>
	);
}

const local = StyleSheet.create({
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
});
