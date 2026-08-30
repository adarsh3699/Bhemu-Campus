import { useCallback, useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { AlertCircle, CheckCircle2, X } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { canPerformChatAction, type ChatMessage, type ReportReason } from "@bhemu/shared";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "@/constants/Theme";
import { Layout } from "@/styles";
import { ChatProvider, useChat } from "@/contexts/ChatContext";
import ChatComposer from "./ChatComposer";
import ChatConversationBackground from "./ChatConversationBackground";
import ChatMessageEditModal from "./ChatMessageEditModal";
import ChatMessageList from "./ChatMessageList";
import ChatMessageReportModal from "./ChatMessageReportModal";
import ChatPollComposer from "./ChatPollComposer";
import ChatRoomTabs from "./ChatRoomTabs";

export default function ChatScreen() {
	return (
		<ChatProvider>
			<ChatScreenContent />
		</ChatProvider>
	);
}

function ChatScreenContent() {
	const {
		activeRoom,
		batchmateRoom,
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
	} = useChat();

	const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
	const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
	const [reportingId, setReportingId] = useState<string | null>(null);
	const [pollComposerOpen, setPollComposerOpen] = useState(false);
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
			setActiveRoom(room);
		},
		[setActiveRoom]
	);
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

	const statusLabel = connected ? `${onlineUsers.length} online` : currentRoom ? "Connecting…" : "Unavailable";

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
						<View style={local.status} accessibilityLabel={`Chat status: ${statusLabel}`}>
							{connected ? (
								<CheckCircle2 size={15} color={Colors.success} />
							) : (
								<View style={[local.statusDot, !currentRoom && local.statusDotMuted]} />
							)}
							<Text style={[local.statusText, connected && local.connectedText]}>{statusLabel}</Text>
						</View>
					</View>

					<ChatRoomTabs
						activeRoom={activeRoom}
						batchmateRoom={batchmateRoom}
						onlineCounts={onlineCounts}
						onSelect={handleSelectRoom}
					/>

					{error ? (
						<View style={local.errorBanner}>
							<View style={local.errorCopy}>
								<AlertCircle size={16} color={Colors.destructive} />
								<Text style={local.errorText}>{error}</Text>
							</View>
							<Pressable
								accessibilityRole="button"
								accessibilityLabel="Dismiss chat error"
								onPress={dismissError}
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
						/>
					</View>

					<ChatComposer
						disabled={!currentRoom}
						onCancelReply={() => setReplyTo(null)}
						onSend={handleSend}
						replyTo={replyTo}
						canCreatePoll={canCreatePoll}
						canAnnounce={canAnnounce}
						onCreatePoll={() => setPollComposerOpen(true)}
						onSendAnnouncement={sendAnnouncement}
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
		</>
	);
}

const local = StyleSheet.create({
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: Spacing.lg,
		paddingTop: Spacing.md,
		paddingBottom: Spacing.sm,
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
