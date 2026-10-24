import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { AlertCircle, CheckCircle2, Search, X } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { canPerformChatAction, type ChatMessage, type ReportReason } from "@bhemu/shared";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "@/constants/Theme";
import { Layout } from "@/styles";
import { ChatProvider, useChat } from "@/contexts/ChatContext";
import ChatComposer from "./ChatComposer";
import ChatAnnouncementComposer from "./ChatAnnouncementComposer";
import ChatConversationBackground from "./ChatConversationBackground";
import ChatMessageEditModal from "./ChatMessageEditModal";
import ChatMessageList from "./ChatMessageList";
import ChatTypingIndicator from "./ChatTypingIndicator";
import ChatMessageReportModal from "./ChatMessageReportModal";
import ChatPollComposer from "./ChatPollComposer";
import ChatRoomTabs from "./ChatRoomTabs";
import ChatSearchBar from "./ChatSearchBar";

export type ChatNotificationTarget = {
	roomId: string;
	messageId: string;
	roomType?: "UNIVERSITY" | "BATCHMATE";
};

export default function ChatScreen({ notificationTarget }: { notificationTarget?: ChatNotificationTarget }) {
	const initialRoom = notificationTarget?.roomType === "BATCHMATE" ? "batchmate" : "university";
	return (
		<ChatProvider initialRoom={initialRoom}>
			<ChatScreenContent notificationTarget={notificationTarget} />
		</ChatProvider>
	);
}

function ChatScreenContent({ notificationTarget }: { notificationTarget?: ChatNotificationTarget }) {
	const {
		activeRoom,
		batchmateRoom,
		universityRoom,
		connected,
		currentRoom,
		dismissError,
		error,
		hasMore,
		loadingMessages,
		loadOlderMessages,
		messages,
		onlineUsers,
		report,
		react,
		unreact,
		retryMessage,
		deleteMessage,
		editMessage,
		setActiveRoom,
		sendText,
		chatRole,
		pinnedMessages,
		createPoll,
		votePoll,
		closePoll,
		sendAnnouncement,
		togglePin,
		currentUserId,
		typingUsers,
		setTyping,
	} = useChat();

	const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
	const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
	const [reportingId, setReportingId] = useState<string | null>(null);
	const [pollComposerOpen, setPollComposerOpen] = useState(false);
	const [announcementComposerOpen, setAnnouncementComposerOpen] = useState(false);
	const [searchOpen, setSearchOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [searchTerm, setSearchTerm] = useState("");
	const [searchIndex, setSearchIndex] = useState(0);
	const [notificationNotice, setNotificationNotice] = useState<string | null>(null);
	const searchPageRequestKeyRef = useRef("");
	const [onlineCounts, setOnlineCounts] = useState<Record<typeof activeRoom, number>>({
		university: 0,
		batchmate: 0,
	});

	const handleSend = useCallback((content: string, replyToId?: string) => sendText(content, replyToId), [sendText]);
	const handleReply = useCallback((message: ChatMessage) => setReplyTo(message), []);
	const handleSelectRoom = useCallback(
		(room: typeof activeRoom) => {
			setReplyTo(null);
			setPollComposerOpen(false);
			setSearchOpen(false);
			setSearchQuery("");
			setSearchTerm("");
			setNotificationNotice(null);
			setActiveRoom(room);
		},
		[setActiveRoom]
	);
	const handleNotificationMessageUnavailable = useCallback(() => {
		setNotificationNotice("That message is no longer available.");
	}, []);
	const handleEdit = useCallback((message: ChatMessage) => setEditingMessage(message), []);
	const handleReport = useCallback((messageId: string) => setReportingId(messageId), []);
	const handleConfirmEdit = useCallback(
		async (content: string) => {
			if (!editingMessage) return;
			await editMessage(editingMessage.id, content);
		},
		[editMessage, editingMessage]
	);
	const handleConfirmReport = useCallback(
		async (reason: ReportReason, description?: string) => {
			if (!reportingId) return;
			await report(reportingId, reason, description);
		},
		[report, reportingId]
	);
	const canCreatePoll = canPerformChatAction(chatRole, currentRoom?.policy.createPollRole);
	const canAnnounce = canPerformChatAction(chatRole, currentRoom?.policy.createAnnouncementRole);
	const canPin = canPerformChatAction(chatRole, currentRoom?.policy.pinMessageRole);
	const canClosePoll = canCreatePoll;
	const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();
	const searchableMessages = useMemo(
		() => messages.map((message) => ({ id: message.id, text: `${message.authorName} ${message.content}`.toLocaleLowerCase() })),
		[messages],
	);
	const searchMatches = useMemo(
		() => searchTerm ? searchableMessages.filter((message) => message.text.includes(searchTerm)).map((message) => message.id) : [],
		[searchTerm, searchableMessages],
	);
	const searchFocusMessageId = searchMatches[searchIndex] ?? null;

	useEffect(() => {
		const timer = setTimeout(() => setSearchTerm(normalizedSearchQuery), 150);
		return () => clearTimeout(timer);
	}, [normalizedSearchQuery]);

	useEffect(() => {
		if (!searchTerm) {
			searchPageRequestKeyRef.current = "";
			return;
		}
		if (!hasMore || loadingMessages || error) return;
		const requestKey = `${searchTerm}:${messages.length}`;
		if (searchPageRequestKeyRef.current === requestKey) return;
		searchPageRequestKeyRef.current = requestKey;
		const timer = setTimeout(() => void loadOlderMessages(), 250);
		return () => clearTimeout(timer);
	}, [error, hasMore, loadOlderMessages, loadingMessages, messages.length, searchTerm]);

	const handleSearchPrevious = useCallback(() => {
		if (searchMatches.length < 2) return;
		setSearchIndex((current) => (current - 1 + searchMatches.length) % searchMatches.length);
	}, [searchMatches.length]);
	const handleSearchChange = useCallback((query: string) => {
		setSearchQuery(query);
		setSearchIndex(0);
	}, []);
	const handleSearchNext = useCallback(() => {
		if (searchMatches.length < 2) return;
		setSearchIndex((current) => (current + 1) % searchMatches.length);
	}, [searchMatches.length]);
	const notificationTargetRoom = notificationTarget
		? notificationTarget.roomId === batchmateRoom?.id
			? "batchmate"
			: notificationTarget.roomId === universityRoom?.id
				? "university"
				: notificationTarget.roomType === "BATCHMATE"
					? "batchmate"
					: notificationTarget.roomType === "UNIVERSITY"
						? "university"
						: null
		: null;
	const notificationNavigationKey = notificationTarget
		? `${notificationTarget.roomId}:${notificationTarget.messageId}`
		: null;
	const appliedNotificationNavigationRef = useRef<string | null>(null);

	useEffect(() => {
		if (!notificationNavigationKey) {
			appliedNotificationNavigationRef.current = null;
			return;
		}
		if (!notificationTargetRoom || appliedNotificationNavigationRef.current === notificationNavigationKey) return;
		if (activeRoom === notificationTargetRoom) {
			appliedNotificationNavigationRef.current = notificationNavigationKey;
			return;
		}

		const targetRoomLoaded = notificationTargetRoom === "university" ? Boolean(universityRoom) : Boolean(batchmateRoom);
		if (!targetRoomLoaded) return;
		if (activeRoom !== notificationTargetRoom) setActiveRoom(notificationTargetRoom);
		appliedNotificationNavigationRef.current = notificationNavigationKey;
	}, [activeRoom, batchmateRoom, notificationNavigationKey, notificationTargetRoom, setActiveRoom, universityRoom]);

	useEffect(() => {
		if (onlineUsers.length === 0) return;
		const timer = setTimeout(() => {
			setOnlineCounts((current) =>
				current[activeRoom] === onlineUsers.length ? current : { ...current, [activeRoom]: onlineUsers.length }
			);
		}, 400);
		return () => clearTimeout(timer);
	}, [activeRoom, onlineUsers.length]);

	useEffect(() => {
		if (!error) return;
		const timer = setTimeout(dismissError, 3_000);
		return () => clearTimeout(timer);
	}, [dismissError, error]);

	useEffect(() => {
		if (!notificationNotice) return;
		const timer = setTimeout(() => setNotificationNotice(null), 4_500);
		return () => clearTimeout(timer);
	}, [notificationNotice]);

	// A room can remain usable from its local cache while the socket silently
	// reconnects. Avoid showing a noisy loading state during normal navigation
	// and short network transitions.
	const statusLabel = connected ? `${onlineUsers.length} online` : currentRoom && messages.length > 0 ? "Offline" : "";
	const visibleError = error ?? notificationNotice;

	return (
		<>
			<SafeAreaView style={Layout.flex} edges={["top"]}>
				<KeyboardAvoidingView
					style={Layout.flex}
					behavior={Platform.OS === "ios" ? "padding" : "height"}
					keyboardVerticalOffset={0}
				>
					<View style={local.header}>
						<View style={local.heading}>
							<Text style={local.title}>
								Chat <Text style={local.beta}>BETA</Text>
							</Text>
						</View>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Search messages"
							onPress={() => setSearchOpen(true)}
							style={({ pressed }) => [local.searchButton, pressed && local.pressed]}
						>
							<Search size={18} color={Colors.textBody} />
						</Pressable>
						{statusLabel ? (
							<View style={local.status} accessibilityLabel={`Chat status: ${statusLabel}`}>
								{connected ? (
									<CheckCircle2 size={15} color={Colors.success} />
								) : (
									<View style={[local.statusDot, !currentRoom && local.statusDotMuted]} />
								)}
								<Text style={[local.statusText, connected && local.connectedText]}>{statusLabel}</Text>
							</View>
						) : null}
					</View>

					<ChatRoomTabs
						activeRoom={activeRoom}
						batchmateRoom={batchmateRoom}
						onlineCounts={onlineCounts}
						onSelect={handleSelectRoom}
					/>

					{searchOpen ? (
						<ChatSearchBar
							query={searchQuery}
							resultCount={searchMatches.length}
							activeIndex={searchIndex}
							loading={Boolean(normalizedSearchQuery && (loadingMessages || hasMore))}
							onChange={handleSearchChange}
							onClose={() => {
								setSearchOpen(false);
								setSearchQuery("");
								setSearchTerm("");
								setSearchIndex(0);
							}}
							onPrevious={handleSearchPrevious}
							onNext={handleSearchNext}
						/>
					) : null}

					{visibleError ? (
						<View style={local.errorBanner}>
							<View style={local.errorCopy}>
								<AlertCircle size={16} color={Colors.destructive} />
								<Text style={local.errorText}>{visibleError}</Text>
							</View>
							<Pressable
								accessibilityRole="button"
								accessibilityLabel="Dismiss chat error"
								onPress={() => {
									dismissError();
									setNotificationNotice(null);
								}}
								hitSlop={8}
							>
								<X size={16} color={Colors.destructive} />
							</Pressable>
						</View>
					) : null}

					<View style={local.conversation}>
						<ChatConversationBackground />
						<ChatMessageList
							currentUserId={currentUserId}
							pinnedMessages={pinnedMessages}
							canPin={canPin}
							canClosePoll={canClosePoll}
							hasMore={hasMore}
							loadingMessages={loadingMessages}
							messages={messages}
							notificationMessageId={
								notificationTargetRoom === activeRoom ? notificationTarget?.messageId : undefined
							}
							onLoadOlder={loadOlderMessages}
							onReply={handleReply}
							onEdit={handleEdit}
							onDelete={deleteMessage}
							onRetry={retryMessage}
							onReact={react}
							onUnreact={unreact}
							onReport={handleReport}
							onTogglePin={togglePin}
							onVotePoll={votePoll}
							onClosePoll={closePoll}
							onNotificationMessageUnavailable={handleNotificationMessageUnavailable}
								searchFocusMessageId={searchFocusMessageId}
							searchQuery={searchTerm}
						/>
					</View>

						<ChatTypingIndicator users={typingUsers} />
					<ChatComposer
						disabled={!currentRoom}
						onCancelReply={() => setReplyTo(null)}
						onSend={handleSend}
							onTyping={setTyping}
						replyTo={replyTo}
						canCreatePoll={canCreatePoll}
						canAnnounce={canAnnounce}
						onCreatePoll={() => setPollComposerOpen(true)}
						onCreateAnnouncement={() => setAnnouncementComposerOpen(true)}
					/>
				</KeyboardAvoidingView>
			</SafeAreaView>
			<ChatMessageEditModal
				key={editingMessage?.id ?? "edit-closed"}
				visible={Boolean(editingMessage)}
				initialContent={editingMessage?.content ?? ""}
				onConfirm={handleConfirmEdit}
				onClose={() => setEditingMessage(null)}
			/>
			<ChatMessageReportModal
				key={reportingId ?? "report-closed"}
				visible={Boolean(reportingId)}
				onConfirm={handleConfirmReport}
				onClose={() => setReportingId(null)}
			/>
			<ChatPollComposer
				key={pollComposerOpen ? "poll-open" : "poll-closed"}
				visible={pollComposerOpen}
				onClose={() => setPollComposerOpen(false)}
				onSubmit={createPoll}
			/>
			<ChatAnnouncementComposer
				key={announcementComposerOpen ? "announcement-open" : "announcement-closed"}
				visible={announcementComposerOpen}
				onClose={() => setAnnouncementComposerOpen(false)}
				onSubmit={sendAnnouncement}
			/>
		</>
	);
}

const local = StyleSheet.create({
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		backgroundColor: Colors.background,
		paddingHorizontal: Spacing.lg,
		paddingTop: 0,
		paddingBottom: Spacing.xs,
	},
	heading: { flex: 1, minWidth: 0, gap: 2 },
	title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, letterSpacing: -0.4, color: Colors.textPrimary },
	beta: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 1, color: Colors.primary },
	subtitle: { fontSize: FontSize.sm, color: Colors.textMuted },
	status: {
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
		paddingHorizontal: Spacing.sm,
		paddingVertical: 6,
		borderRadius: Radius.full,
		backgroundColor: Colors.surface,
	},
	statusDot: { width: 7, height: 7, borderRadius: Radius.full, backgroundColor: Colors.warning },
	statusDotMuted: { backgroundColor: Colors.textSubtle },
	statusText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textMuted },
	connectedText: { color: Colors.success },
	searchButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center", marginRight: Spacing.xs, borderRadius: Radius.full, backgroundColor: Colors.surface },
	pressed: { opacity: 0.75 },
	conversation: { flex: 1, minHeight: 0, position: "relative" },
	errorBanner: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: Spacing.sm,
		marginHorizontal: Spacing.lg,
		marginBottom: Spacing.sm,
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.sm,
		borderRadius: Radius.md,
		borderWidth: 1,
		borderColor: "rgba(239,68,68,0.35)",
		backgroundColor: "rgba(239,68,68,0.1)",
	},
	errorCopy: { flex: 1, flexDirection: "row", alignItems: "center", gap: Spacing.sm },
	errorText: { flex: 1, fontSize: FontSize.xs, color: Colors.destructive },
});
