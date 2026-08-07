"use client";

import React, { memo, useCallback, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import type { ChatMessage } from "@bhemu/shared";
import MessageBubble, { DateSeparator, shouldShowDateSeparator } from "./MessageBubble";

interface MessageListProps {
	messages: ChatMessage[];
	currentUserId: string | null;
	hasMore: boolean;
	loadingMessages: boolean;
	onLoadOlder: () => void;
	onReply: (msg: ChatMessage) => void;
	onEdit: (msg: ChatMessage) => void;
	onDelete: (messageId: string) => void;
	onReport: (messageId: string) => void;
}

const MessageList = memo(function MessageList({
	messages, currentUserId, hasMore, loadingMessages,
	onLoadOlder, onReply, onEdit, onDelete, onReport,
}: MessageListProps) {
	const bottomRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const isAtBottomRef = useRef(true);
	const prevLenRef = useRef(0);
	const scrollRafRef = useRef<number | null>(null);

	// Scroll to bottom when messages change length
	// Keeps messages out of deps — only scroll position logic needs length
	const lastMsgIdRef = useRef<string | undefined>(undefined);
	useEffect(() => {
		const newCount = messages.length;
		const prevCount = prevLenRef.current;
		const lastMsg = messages[newCount - 1];

		if (newCount > prevCount && isAtBottomRef.current) {
			const isOptimistic = lastMsg?.id.startsWith("optimistic_") ?? false;
			bottomRef.current?.scrollIntoView({ behavior: isOptimistic ? "instant" : "smooth" });
		}

		// Initial load — always jump instantly
		if (prevCount === 0 && newCount > 0) {
			bottomRef.current?.scrollIntoView({ behavior: "instant" });
		}

		prevLenRef.current = newCount;
		lastMsgIdRef.current = lastMsg?.id;
	// messages.length is the only stable dep we need here — avoids re-running on edits/deletes
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [messages.length]);

	// rAF-throttled scroll handler
	const handleScroll = useCallback(() => {
		if (scrollRafRef.current) return;
		scrollRafRef.current = requestAnimationFrame(() => {
			scrollRafRef.current = null;
			const el = containerRef.current;
			if (!el) return;
			isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
			// Trigger load-older when near the top
			if (el.scrollTop < 80 && hasMore && !loadingMessages) {
				onLoadOlder();
			}
		});
	}, [hasMore, loadingMessages, onLoadOlder]);

	if (!loadingMessages && messages.length === 0) {
		return (
			<div className="flex-1 flex items-center justify-center">
				<div className="text-center space-y-1">
					<p className="text-muted-foreground text-sm">No messages yet</p>
					<p className="text-muted-foreground text-xs">Be the first to say something!</p>
				</div>
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			onScroll={handleScroll}
			className="flex-1 overflow-y-auto px-4 py-2"
		>
			{/* Loading older — top spinner */}
			{loadingMessages && messages.length > 0 && (
				<div className="flex justify-center py-2">
					<Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
				</div>
			)}

			{/* Load older button */}
			{hasMore && !loadingMessages && (
				<div className="flex justify-center py-2">
					<button
						onClick={onLoadOlder}
						className="text-xs text-muted-foreground hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
					>
						Load older messages
					</button>
				</div>
			)}

			{/* Initial loading spinner */}
			{loadingMessages && messages.length === 0 && (
				<div className="flex-1 flex items-center justify-center min-h-[200px]">
					<Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
				</div>
			)}

			{messages.map((msg, i) => (
				<React.Fragment key={(msg as any).idempotencyKey || msg.id}>
					{shouldShowDateSeparator(msg, messages[i - 1]) && <DateSeparator iso={msg.createdAt} />}
					<MessageBubble
						message={msg}
						currentUserId={currentUserId}
						onReply={onReply}
						onEdit={onEdit}
						onDelete={onDelete}
						onReport={onReport}
					/>
				</React.Fragment>
			))}
			<div ref={bottomRef} />
		</div>
	);
});

export default MessageList;
