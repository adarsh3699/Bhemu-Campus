"use client";

import React, { memo, useCallback, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import type { ChatMessage } from "@bhemu/shared";
import MessageBubble, { DateSeparator, shouldShowDateSeparator, getMessageTime } from "./MessageBubble";

type MessageListMessage = ChatMessage & { idempotencyKey?: string | null };

const MESSAGE_GROUP_GAP_MS = 5 * 60 * 1_000;

function startsAuthorGroup(message: MessageListMessage, previous?: MessageListMessage): boolean {
	if (!previous || previous.authorUid !== message.authorUid) return true;
	return getMessageTime(message.createdAt) - getMessageTime(previous.createdAt) > MESSAGE_GROUP_GAP_MS;
}

interface MessageListProps {
	messages: MessageListMessage[];
	currentUserId: string | null;
	hasMore: boolean;
	loadingMessages: boolean;
	onLoadOlder: () => void;
	onReply: (msg: ChatMessage) => void;
	onEdit: (msg: ChatMessage) => void;
	onDelete: (messageId: string) => void;
	onRetry: (messageId: string) => void;
	onReact: (messageId: string, emoji: string) => void;
	onUnreact: (messageId: string) => void;
	onReport: (messageId: string) => void;
}

const MessageList = memo(function MessageList({
	messages, currentUserId, hasMore, loadingMessages,
	onLoadOlder, onReply, onEdit, onDelete, onRetry, onReact, onUnreact, onReport,
}: MessageListProps) {
	const bottomRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const isAtBottomRef = useRef(true);
	const prevLenRef = useRef(0);
	const scrollRafRef = useRef<number | null>(null);

	const messageMap = React.useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);

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

	useEffect(() => {
		return () => {
			if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
		};
	}, []);

	const oldFirstMsgRef = useRef<{ id: string; offsetTop: number } | null>(null);

	const handleLoadOlder = useCallback(() => {
		if (loadingMessages || !hasMore) return;
		
		if (messages.length > 0) {
			const firstId = messages[0].idempotencyKey || messages[0].id;
			const node = document.getElementById(`msg-${firstId}`);
			if (node) {
				oldFirstMsgRef.current = { id: firstId, offsetTop: node.offsetTop };
			}
		}
		
		onLoadOlder();
	}, [loadingMessages, hasMore, messages, onLoadOlder]);

	const handleScroll = useCallback(() => {
		if (scrollRafRef.current) return;
		scrollRafRef.current = requestAnimationFrame(() => {
			scrollRafRef.current = null;
			const el = containerRef.current;
			if (!el) return;
			
			isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
			// Trigger load-older when near the top
			if (el.scrollTop < 80 && hasMore && !loadingMessages) {
				handleLoadOlder();
			}
		});
	}, [hasMore, loadingMessages, handleLoadOlder]);

	// Auto-trigger load if user is stuck at the top after a background sync finishes
	useEffect(() => {
		if (!loadingMessages && hasMore) {
			const el = containerRef.current;
			if (el && el.scrollTop < 80) {
				handleLoadOlder();
			}
		}
	}, [loadingMessages, hasMore, handleLoadOlder]);

	// Maintain scroll position exactly when older messages are prepended
	React.useLayoutEffect(() => {
		if (!loadingMessages && oldFirstMsgRef.current) {
			const node = document.getElementById(`msg-${oldFirstMsgRef.current.id}`);
			const el = containerRef.current;
			if (node && el) {
				const heightDiff = node.offsetTop - oldFirstMsgRef.current.offsetTop;
				if (heightDiff > 0) {
					el.scrollTop += heightDiff;
				}
			}
			oldFirstMsgRef.current = null;
		}
	}, [loadingMessages, messages.length]);

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
			className="chat-conversation-canvas flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6 relative"
		>
			<div className="mx-auto w-full max-w-4xl">
				{/* Loading older — top spinner */}
				{loadingMessages && messages.length > 0 && (
					<div className="flex justify-center py-2" style={{ overflowAnchor: "none" }}>
						<Loader2 className="w-4 h-4 text-muted-foreground animate-spin" aria-label="Loading older messages" />
					</div>
				)}

				{/* Load older button */}
				{hasMore && !loadingMessages && (
					<div className="flex justify-center py-2">
						<button
							onClick={handleLoadOlder}
							className="min-h-11 rounded-full border border-white/10 bg-black/20 px-4 text-xs font-medium text-muted-foreground transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
						>
							Load older messages
						</button>
					</div>
				)}

				{/* Initial loading spinner */}
				{loadingMessages && messages.length === 0 && (
					<div className="flex min-h-[200px] flex-1 items-center justify-center">
						<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading messages" />
					</div>
				)}

				{messages.map((msg, i) => {
					const msgId = msg.idempotencyKey || msg.id;
					return (
						<div key={msgId} id={`msg-${msgId}`}>
							{shouldShowDateSeparator(msg, messages[i - 1]) && <DateSeparator iso={msg.createdAt} />}
							<MessageBubble
								message={msg}
								repliedMessage={msg.replyToMessageId ? messageMap.get(msg.replyToMessageId) : undefined}
								currentUserId={currentUserId}
								showIdentity={startsAuthorGroup(msg, messages[i - 1])}
								onReply={onReply}
								onEdit={onEdit}
								onDelete={onDelete}
								onRetry={onRetry}
								onReact={onReact}
								onUnreact={onUnreact}
								onReport={onReport}
							/>
						</div>
					);
				})}
				<div ref={bottomRef} />
			</div>
		</div>
	);
});

export default MessageList;
