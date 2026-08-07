"use client";

import React, { useCallback, useState } from "react";
import { AlertCircle } from "lucide-react";
import { useChat } from "@/contexts/ChatContext";
import RoomList from "./RoomList";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import EditMessageModal from "./EditMessageModal";
import ReportModal from "./ReportModal";
import type { ChatMessage, ReportReason } from "@bhemu/shared";

export default function ChatView() {
	const {
		universityRoom,
		batchmateRoom,
		activeRoom,
		setActiveRoom,
		currentRoom,
		currentUserId,
		messages,
		hasMore,
		loadingMessages,
		loadOlderMessages,
		sendText,
		editMsg,
		deleteMsg,
		report,
		onlineUsers,
		connected,
		error,
	} = useChat();

	const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
	const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null);
	const [reportingId, setReportingId] = useState<string | null>(null);

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

	return (
		<>
			<div className="flex h-[calc(100vh-4rem)] overflow-hidden">
				{/* Room sidebar */}
				<aside className="hidden md:flex w-[220px] lg:w-[260px] shrink-0 flex-col border-r border-white/5 bg-[#0a0f10]/95 backdrop-blur-md shadow-[4px_0_24px_rgba(0,0,0,0.2)] z-10">
					<RoomList
						universityRoom={universityRoom}
						batchmateRoom={batchmateRoom}
						activeRoom={activeRoom}
						onSelect={setActiveRoom}
						connected={connected}
						onlineCount={onlineUsers.length}
					/>
				</aside>

				{/* Main chat panel */}
				<div className="flex-1 flex flex-col min-w-0 bg-background relative">
					{/* Header */}
					<div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 bg-[#0a0f10]/80 backdrop-blur-xl shrink-0 sticky top-0 z-20 shadow-sm">
						<div className="flex flex-col">
							<h1 className="text-[15px] font-semibold text-white tracking-tight flex items-center gap-2">
								{currentRoom?.name ?? "Chat"}
							</h1>
							{currentRoom?.description && (
								<p className="text-[11px] text-muted-foreground">{currentRoom.description}</p>
							)}
						</div>
						{/* Mobile room switcher */}
						<div className="flex md:hidden gap-1.5">
							<button
								onClick={() => setActiveRoom("university")}
								className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
									activeRoom === "university"
										? "bg-primary/10 text-primary"
										: "text-muted-foreground hover:text-white"
								}`}
							>
								University
							</button>
							{batchmateRoom && (
								<button
									onClick={() => setActiveRoom("batchmate")}
									className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
										activeRoom === "batchmate"
											? "bg-primary/10 text-primary"
											: "text-muted-foreground hover:text-white"
									}`}
								>
									Batch
								</button>
							)}
						</div>
					</div>

					{/* Error banner */}
					{error && (
						<div className="flex items-center gap-2 px-4 py-2 bg-destructive/10 border-b border-destructive/20 text-xs text-destructive">
							<AlertCircle className="w-3.5 h-3.5 shrink-0" />
							{error}
						</div>
					)}

					{/* Messages */}
					<MessageList
						messages={messages}
						currentUserId={currentUserId}
						hasMore={hasMore}
						loadingMessages={loadingMessages}
						onLoadOlder={loadOlderMessages}
						onReply={setReplyTo}
						onEdit={setEditingMsg}
						onDelete={deleteMsg}
						onReport={setReportingId}
					/>

					{/* Input — allow typing while connecting; disable only if no room */}
					<MessageInput
						onSend={sendText}
						replyTo={replyTo}
						onCancelReply={handleCancelReply}
						disabled={!currentRoom}
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
		</>
	);
}
