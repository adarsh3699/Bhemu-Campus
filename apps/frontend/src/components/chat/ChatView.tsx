"use client";

import React, { useCallback, useState, useEffect, useRef } from "react";
import { AlertCircle, X } from "lucide-react";
import { type ActiveRoom, useChat } from "@/contexts/ChatContext";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import EditMessageModal from "./EditMessageModal";
import ReportModal from "./ReportModal";
import type { ChatMessage, ReportReason } from "@bhemu/shared";
import type { AppRole } from "@bhemu/shared";
import PinnedMessagesBar from "./PinnedMessagesBar";
import PollComposer from "./PollComposer";
import ModerationModal, { type ModerationAction } from "./ModerationModal";

const ROLE_LEVEL: Record<AppRole, number> = { STUDENT: 0, MODERATOR: 1, ADMIN: 2 };

function canPerform(role: AppRole | null, requiredRole: AppRole | undefined): boolean {
	return Boolean(role && requiredRole && ROLE_LEVEL[role] >= ROLE_LEVEL[requiredRole]);
}

export default function ChatView() {
	const {
		batchmateRoom,
		activeRoom,
		setActiveRoom,
		currentRoom,
		currentUserId,
		chatRole,
		messages,
		pinnedMessages,
		hasMore,
		loadingMessages,
		loadOlderMessages,
		sendText,
		editMsg,
		deleteMsg,
		retryMessage,
		react,
		unreact,
		report,
		createPoll,
		votePoll,
		closePoll,
		sendAnnouncement,
		togglePin,
		moderationDelete,
		warnUser,
		suspendUser,
		banUser,
		onlineUsers,
		error,
		dismissError,
	} = useChat();

	const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
	const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null);
	const [reportingId, setReportingId] = useState<string | null>(null);
	const [pollComposerOpen, setPollComposerOpen] = useState(false);
	const [moderationMessage, setModerationMessage] = useState<ChatMessage | null>(null);
	const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
	const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Cache online counts to prevent UI flashing when switching tabs
	const [lastKnownCounts, setLastKnownCounts] = useState<Record<string, number>>({});

	useEffect(() => {
		if (onlineUsers.length > 0) {
			// Debounce updates by 400ms to ignore the initial "1" user flash during reconnects
			const timeoutId = setTimeout(() => {
				setLastKnownCounts((prev) => {
					if (prev[activeRoom] === onlineUsers.length) return prev;
					return {
						...prev,
						[activeRoom]: onlineUsers.length,
					};
				});
			}, 400);

			return () => clearTimeout(timeoutId);
		}
	}, [onlineUsers.length, activeRoom]);

	const uniCount = lastKnownCounts["university"] || 0;
	const batchCount = lastKnownCounts["batchmate"] || 0;
	const pinnedMessageIds = React.useMemo(() => new Set(pinnedMessages.map(pin => pin.messageId)), [pinnedMessages]);
	const canCreatePoll = canPerform(chatRole, currentRoom?.policy.createPollRole);
	const canAnnounce = canPerform(chatRole, currentRoom?.policy.createAnnouncementRole);
	const canPin = canPerform(chatRole, currentRoom?.policy.pinMessageRole);
	const canModerate = chatRole === "MODERATOR" || chatRole === "ADMIN";
	const canClosePoll = canCreatePoll;

	const handleReport = useCallback(
		async (reason: ReportReason, description?: string) => {
			if (!reportingId) return;
			await report(reportingId, reason, description);
			setReportingId(null);
		},
		[reportingId, report]
	);

	const handleConfirmEdit = useCallback(
		async (content: string) => {
			if (!editingMsg) return;
			await editMsg(editingMsg.id, content);
		},
		[editingMsg, editMsg]
	);

	const handleCloseEdit = useCallback(() => setEditingMsg(null), []);
	const handleCloseReport = useCallback(() => setReportingId(null), []);
	const handleCancelReply = useCallback(() => setReplyTo(null), []);
	const handleSelectRoom = useCallback((room: ActiveRoom) => {
		setReplyTo(null);
		setActiveRoom(room);
	}, [setActiveRoom]);
	const handleModeration = useCallback(async (action: ModerationAction, reason: string, expiresAt?: string) => {
		if (!moderationMessage) return;
		if (action === "delete") await moderationDelete(moderationMessage.id, reason);
		if (action === "warn") await warnUser(moderationMessage.authorUid, reason, moderationMessage.id);
		if (action === "suspend" && expiresAt) await suspendUser(moderationMessage.authorUid, expiresAt, reason);
		if (action === "ban") await banUser(moderationMessage.authorUid, reason);
	}, [banUser, moderationDelete, moderationMessage, suspendUser, warnUser]);

	const handleJumpToMessage = useCallback((messageId: string) => {
		const target = document.getElementById(`msg-${messageId}`);
		if (!target) return;
		target.scrollIntoView({ behavior: "smooth", block: "center" });
		setHighlightedMessageId(messageId);
		if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
		highlightTimerRef.current = setTimeout(() => setHighlightedMessageId(null), 1600);
	}, []);

	useEffect(() => () => {
		if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
	}, []);

	useEffect(() => {
		if (error) {
			const timer = setTimeout(() => {
				dismissError();
			}, 3000);
			return () => clearTimeout(timer);
		}
	}, [error, dismissError]);

	return (
		<>
			<div className="flex h-[calc(100vh-4rem)] overflow-hidden">
				{/* Main chat panel */}
				<div className="relative flex min-w-0 flex-1 flex-col bg-background">
					{/* Top Tab Bar (Replaces Sidebar) */}
					<div className="sticky top-0 z-20 flex shrink-0 items-end border-b border-white/5 bg-[#0a0f10] pt-0 px-2 gap-1 mt-2">
						{/* University Tab */}
						<button
							onClick={() => handleSelectRoom("university")}
							className={`relative flex items-center justify-start gap-1.5 rounded-t-xl px-4 h-[46px] min-w-[130px] transition-all -mb-[1px] border-b-[2px] ${
								activeRoom === "university"
									? "bg-[#1c2122] border-primary"
									: "bg-[#111516] border-transparent hover:bg-[#161a1b]"
							}`}
						>
							<span className={`text-[11px] font-bold tracking-[0.1em] uppercase ${activeRoom === "university" ? "text-white" : "text-white/60"}`}>
								University
							</span>
							{uniCount > 0 && (
								<span className={`flex items-center gap-1 text-[10px] font-bold ml-1 ${activeRoom === "university" ? "text-success/90" : "text-success/50"}`}>
									<span className={`size-1.5 rounded-full ${activeRoom === "university" ? "bg-success" : "bg-success/50"}`}></span>
									{uniCount}
								</span>
							)}
						</button>

						{/* Batchmate Tab */}
						{batchmateRoom ? (
							<button
								onClick={() => handleSelectRoom("batchmate")}
								className={`relative flex flex-col items-start justify-center rounded-t-xl px-4 h-[46px] min-w-[130px] transition-all -mb-[1px] border-b-[2px] ${
									activeRoom === "batchmate"
										? "bg-[#1c2122] border-primary"
										: "bg-[#111516] border-transparent hover:bg-[#161a1b]"
								}`}
							>
								<span className={`text-[11px] font-bold tracking-[0.1em] uppercase ${activeRoom === "batchmate" ? "text-white" : "text-white/60"}`}>
									Batchmate
								</span>
								<div className="flex items-center gap-2 mt-0.5">
									<span className="text-[9px] font-bold text-white/40 tracking-[0.05em]">
										{batchmateRoom.name}
									</span>
									{batchCount > 0 && (
										<span className={`flex items-center gap-1 text-[10px] font-bold ${activeRoom === "batchmate" ? "text-success/90" : "text-success/50"}`}>
											<span className={`size-1.5 rounded-full ${activeRoom === "batchmate" ? "bg-success" : "bg-success/50"}`}></span>
											{batchCount}
										</span>
									)}
								</div>
							</button>
						) : (
							<div className="relative flex flex-col items-start justify-center rounded-t-xl px-4 h-[46px] min-w-[130px] transition-all -mb-[1px] border-b-[2px] border-transparent bg-[#111516] opacity-60">
								<span className="text-[11px] font-bold tracking-[0.1em] uppercase text-white/40">
									Batchmate
								</span>
								<span className="text-[9px] font-bold text-white/30 tracking-[0.05em]">
									Sync UMS
								</span>
							</div>
						)}
					</div>

					{/* Error banner */}
					{error && (
						<div className="flex items-center justify-between gap-2 px-4 py-2 bg-destructive/10 border-b border-destructive/20 text-xs text-destructive">
							<div className="flex items-center gap-2">
								<AlertCircle className="w-3.5 h-3.5 shrink-0" />
								{error}
							</div>
							<button
								onClick={dismissError}
								className="p-0.5 hover:bg-destructive/20 rounded-md transition-colors"
							>
								<X className="w-3.5 h-3.5" />
							</button>
						</div>
					)}

					{/* Messages */}
					<PinnedMessagesBar
						pins={pinnedMessages}
						messages={messages}
						onSelect={handleJumpToMessage}
						onUnpin={togglePin}
						canManage={canPin}
					/>
					<MessageList
						messages={messages}
						currentUserId={currentUserId}
						hasMore={hasMore}
						loadingMessages={loadingMessages}
						onLoadOlder={loadOlderMessages}
						onReply={setReplyTo}
						onEdit={setEditingMsg}
						onDelete={deleteMsg}
						onRetry={retryMessage}
						onReact={react}
						onUnreact={unreact}
						onReport={setReportingId}
						pinnedMessageIds={pinnedMessageIds}
						canPin={canPin}
						canModerate={canModerate}
						canClosePoll={canClosePoll}
						onTogglePin={togglePin}
						onModerationDelete={moderationDelete}
						onModerate={setModerationMessage}
						onVotePoll={votePoll}
						onClosePoll={closePoll}
						highlightedMessageId={highlightedMessageId}
					/>

					{/* Input — allow typing while connecting; disable only if no room */}
					<MessageInput
						onSend={sendText}
						replyTo={replyTo}
						onCancelReply={handleCancelReply}
						disabled={!currentRoom}
						canCreatePoll={canCreatePoll}
						canAnnounce={canAnnounce}
						onCreatePoll={() => setPollComposerOpen(true)}
						onSendAnnouncement={sendAnnouncement}
					/>
				</div>
			</div>

			{/* Modals */}
			<EditMessageModal
				isOpen={!!editingMsg}
				initialContent={editingMsg?.content ?? ""}
				onConfirm={handleConfirmEdit}
				onClose={handleCloseEdit}
			/>
			<ReportModal isOpen={!!reportingId} onConfirm={handleReport} onClose={handleCloseReport} />
			<PollComposer isOpen={pollComposerOpen} onClose={() => setPollComposerOpen(false)} onSubmit={createPoll} />
			<ModerationModal message={moderationMessage} role={chatRole} onClose={() => setModerationMessage(null)} onConfirm={handleModeration} />
		</>
	);
}
