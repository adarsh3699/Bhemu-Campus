"use client";

import React, { useCallback, useState, useEffect } from "react";
import { AlertCircle, X } from "lucide-react";
import { useChat } from "@/contexts/ChatContext";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import EditMessageModal from "./EditMessageModal";
import ReportModal from "./ReportModal";
import type { ChatMessage, ReportReason } from "@bhemu/shared";

export default function ChatView() {
	const {
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
		retryMessage,
		report,
		onlineUsers,
		error,
		dismissError,
	} = useChat();

	const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
	const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null);
	const [reportingId, setReportingId] = useState<string | null>(null);

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
							onClick={() => setActiveRoom("university")}
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
								onClick={() => setActiveRoom("batchmate")}
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
