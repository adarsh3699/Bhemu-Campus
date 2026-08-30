"use client";

import { memo, type MouseEvent as ReactMouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Megaphone, Pin, PinOff, ShieldAlert } from "lucide-react";
import {
	CHAT_OPTIMISTIC_PREFIX,
	formatChatDate,
	formatChatTime,
	messageTimestamp,
	normalizeChatDisplayName,
	summarizeChatReactions,
	type ChatDisplayMessage,
	type ChatMessage,
} from "@bhemu/shared";
import PollCard from "./PollCard";
import MessageContextMenu, { type MenuPosition } from "./MessageContextMenu";
import {
	DeletedMessage,
	MessageActions,
	MessageMeta,
	MessageRow,
	MessageText,
	ReactionSummary,
} from "./MessageBubbleParts";

interface MessageBubbleProps {
	message: ChatDisplayMessage;
	repliedMessage?: ChatDisplayMessage;
	currentUserId: string | null;
	showIdentity: boolean;
	onReply: (msg: ChatMessage) => void;
	onEdit: (msg: ChatMessage) => void;
	onDelete: (messageId: string) => void;
	onRetry: (messageId: string) => void;
	onReact: (messageId: string, emoji: string) => void;
	onUnreact: (messageId: string) => void;
	onReport: (messageId: string) => void;
	isPinned: boolean;
	isHighlighted: boolean;
	canPin: boolean;
	canModerate: boolean;
	canClosePoll: boolean;
	onTogglePin: (messageId: string) => Promise<void>;
	onModerationDelete: (messageId: string) => Promise<void>;
	onModerate: (message: ChatMessage) => void;
	onVotePoll: (pollId: string, optionIds: string[]) => Promise<void>;
	onClosePoll: (pollId: string) => Promise<void>;
}

export function DateSeparator({ iso }: { iso: string }) {
	return (
		<div className="my-4 flex justify-center">
			<span className="rounded-full border border-white/10 bg-[#17151b]/90 px-3 py-1 text-[11px] font-semibold text-white/80 shadow-sm backdrop-blur-sm">
				{formatChatDate(iso)}
			</span>
		</div>
	);
}

const MessageBubble = memo(function MessageBubble({
	message,
	repliedMessage,
	currentUserId,
	showIdentity,
	onReply,
	onEdit,
	onDelete,
	onRetry,
	onReact,
	onUnreact,
	onReport,
	isPinned,
	isHighlighted,
	canPin,
	canModerate,
	canClosePoll,
	onTogglePin,
	onModerationDelete,
	onModerate,
	onVotePoll,
	onClosePoll,
}: MessageBubbleProps) {
	const [menuOpen, setMenuOpen] = useState(false);
	const [reactionTrayOpen, setReactionTrayOpen] = useState(false);
	const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
	const [contextMenuPoint, setContextMenuPoint] = useState<{ x: number; y: number } | null>(null);
	const menuPanelRef = useRef<HTMLDivElement>(null);
	const reactionRef = useRef<HTMLDivElement>(null);

	const isOwn = currentUserId === message.authorUid;
	const isDeleted = message.visibility === "DELETED";
	const isAnnouncement = message.type === "ANNOUNCEMENT";
	const isOptimistic = message.id.startsWith(CHAT_OPTIMISTIC_PREFIX);
	const authorName = normalizeChatDisplayName(message.authorName);
	const reactionCounts = useMemo(
		() => summarizeChatReactions(message.reactions, currentUserId),
		[message.reactions, currentUserId],
	);

	const closeMenu = useCallback(() => {
		setMenuOpen(false);
		setReactionTrayOpen(false);
		setMenuPosition(null);
		setContextMenuPoint(null);
	}, []);

	const handleContextMenu = useCallback((event: ReactMouseEvent<HTMLElement>) => {
		if (isOptimistic || message.failed) return;
		event.preventDefault();
		setReactionTrayOpen(false);
		setMenuPosition(null);
		setContextMenuPoint({ x: event.clientX, y: event.clientY });
		setMenuOpen(true);
	}, [isOptimistic, message.failed]);

	const updateMenuPosition = useCallback(() => {
		const panel = menuPanelRef.current;
		if (!panel || !contextMenuPoint) return;

		const { height, width } = panel.getBoundingClientRect();
		const edgePadding = 8;
		const gap = 8;
		const topBelow = contextMenuPoint.y + gap;
		const top = topBelow + height <= window.innerHeight - edgePadding
			? topBelow
			: Math.max(edgePadding, contextMenuPoint.y - height - gap);
		const left = Math.max(
			edgePadding,
			Math.min(contextMenuPoint.x + gap, window.innerWidth - width - edgePadding),
		);

		setMenuPosition({ top, left });
	}, [contextMenuPoint]);

	useEffect(() => {
		if (!menuOpen && !reactionTrayOpen) return;

		const handleOutsideClick = (event: MouseEvent) => {
			const target = event.target as Node;
			if (menuPanelRef.current?.contains(target) || reactionRef.current?.contains(target)) return;
			closeMenu();
		};

		document.addEventListener("mousedown", handleOutsideClick);
		return () => document.removeEventListener("mousedown", handleOutsideClick);
	}, [closeMenu, menuOpen, reactionTrayOpen]);

	useEffect(() => {
		if (!menuOpen) return;

		const frame = requestAnimationFrame(updateMenuPosition);
		window.addEventListener("resize", updateMenuPosition);
		window.addEventListener("scroll", updateMenuPosition, true);
		return () => {
			cancelAnimationFrame(frame);
			window.removeEventListener("resize", updateMenuPosition);
			window.removeEventListener("scroll", updateMenuPosition, true);
		};
	}, [menuOpen, updateMenuPosition]);

	const toggleReactionTray = useCallback(() => {
		setReactionTrayOpen((open) => !open);
		setMenuOpen(false);
	}, []);

	// Deleted announcements remain in storage for audit/retention, but never
	// render an empty announcement card in the conversation.
	if (isAnnouncement && isDeleted) return null;

	const contextMenu = menuOpen ? (
		<MessageContextMenu
			message={message}
			menuPanelRef={menuPanelRef}
			position={menuPosition}
			isOwn={isOwn}
			isPinned={isPinned}
			canPin={canPin}
			canModerate={canModerate}
			onClose={closeMenu}
			onEdit={onEdit}
			onDelete={onDelete}
			onReport={onReport}
			onModerationDelete={(messageId) => void onModerationDelete(messageId)}
			onTogglePin={(messageId) => void onTogglePin(messageId)}
			onModerate={onModerate}
		/>
	) : null;

	if (isAnnouncement) {
		return (
			<div onContextMenu={handleContextMenu} className="group my-3 flex justify-center px-2">
				<div
					className={`relative w-full max-w-[min(100%,420px)] overflow-hidden rounded-xl border bg-[#11191b]/95 shadow-[0_8px_24px_rgba(0,0,0,0.22)] transition-[box-shadow,border-color] duration-200 sm:w-fit sm:min-w-[280px] ${
						isHighlighted
							? "border-primary/75 ring-2 ring-primary/60 ring-offset-2 ring-offset-[#09070b] shadow-[0_0_24px_rgba(0,190,210,0.16)]"
							: "border-primary/30"
					}`}
					role="article"
					aria-label={`Announcement from ${authorName}`}
				>
					<div className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden="true" />
					<div className="flex items-start gap-2.5 px-3 py-2.5 sm:px-3.5">
						<div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
							<Megaphone className="size-4" strokeWidth={1.8} aria-hidden="true" />
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex items-center justify-between gap-3">
								<div className="min-w-0">
									<p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
										<span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
										Announcement
									</p>
									<p className="mt-0.5 truncate text-[11px] text-white/50">{authorName}</p>
								</div>
								<time className="shrink-0 text-[10px] tabular-nums text-white/45">
									{formatChatTime(messageTimestamp(message))}
								</time>
							</div>
							<p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-5 text-white/95">{message.content}</p>
						</div>
					</div>
					{(canPin || canModerate) && !isOptimistic && (
						<div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1 border-t border-white/10 bg-[#11191b]/95 px-2 py-0.5 opacity-100 transition-opacity duration-150 sm:pointer-events-none sm:opacity-0 sm:group-hover:pointer-events-auto sm:group-hover:opacity-100 sm:group-focus-within:pointer-events-auto sm:group-focus-within:opacity-100">
							{canPin && (
								<button
									type="button"
									onClick={() => void onTogglePin(message.id)}
									className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-[11px] text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
									aria-label={isPinned ? "Unpin announcement" : "Pin announcement"}
								>
									{isPinned ? <PinOff className="size-3" /> : <Pin className="size-3" />}
									{isPinned ? "Unpin" : "Pin"}
								</button>
							)}
							{canModerate && (
								<button
									type="button"
									onClick={() => onModerate(message)}
									className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-[11px] text-white/60 transition-colors hover:bg-red-500/15 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
								>
									<ShieldAlert className="size-3" />
									Moderate
								</button>
							)}
						</div>
					)}
				</div>
				{contextMenu}
			</div>
		);
	}

	if (isDeleted) {
		return (
			<MessageRow
				authorName={authorName}
				authorUid={message.authorUid}
				showIdentity={showIdentity}
				isOwn={isOwn}
			>
				<DeletedMessage />
			</MessageRow>
		);
	}

	return (
		<MessageRow
			authorName={authorName}
			authorUid={message.authorUid}
			showIdentity={showIdentity}
			isOwn={isOwn}
			onContextMenu={handleContextMenu}
		>
			<div
				className={`relative flow-root min-w-[72px] rounded-xl border px-2 py-0.5 text-[14px] font-normal leading-5 break-words select-text shadow-[0_4px_12px_rgba(0,0,0,0.16)] transition-[border-color,background-color,box-shadow] ${
					isOwn
						? `rounded-br-md border-primary/50 bg-primary text-white ${isOptimistic ? "opacity-80" : "hover:border-primary/70 hover:shadow-primary/20"}`
						: "rounded-bl-md border-white/10 bg-[#202020]/95 text-foreground hover:border-white/20"
				} ${isHighlighted ? "ring-2 ring-primary/70 ring-offset-2 ring-offset-[#09070b]" : ""}`}
			>
				{message.replyToMessageId && (
					<div
						className={`relative mb-1.5 mt-0.5 flex cursor-pointer flex-col overflow-hidden rounded-[4px] border-l-[3px] py-0.5 pl-2 pr-2 text-[13px] leading-tight ${
							isOwn ? "border-l-white/40 bg-black/10" : "border-l-sky-500 bg-white/5"
						}`}
					>
						<span className={`font-semibold ${isOwn ? "text-white" : "text-sky-400"}`}>
							{repliedMessage
								? repliedMessage.authorUid === currentUserId
									? "You"
									: normalizeChatDisplayName(repliedMessage.authorName)
								: "Replied message"}
						</span>
						<span className={`truncate text-[12px] ${isOwn ? "text-white/80" : "text-white/60"}`}>
							{repliedMessage ? repliedMessage.content : "Message content not loaded"}
						</span>
					</div>
				)}

				<MessageText content={message.content} isPoll={message.type === "POLL"} isOwn={isOwn} />

				{message.type === "POLL" && message.poll && (
					<PollCard
						poll={message.poll}
						isOwn={isOwn}
						canClose={canClosePoll}
						onVote={onVotePoll}
						onClose={onClosePoll}
					/>
				)}

				{reactionCounts.length > 0 ? (
					<div className="mt-2 flex flex-wrap items-end justify-between gap-3">
						<ReactionSummary
							counts={reactionCounts}
							messageId={message.id}
							isOwn={isOwn}
							onReact={onReact}
							onUnreact={onUnreact}
						/>
						<MessageMeta
							message={message}
							isOwn={isOwn}
							isOptimistic={isOptimistic}
							onRetry={onRetry}
							className="mb-0.5"
						/>
					</div>
				) : (
					<MessageMeta
						message={message}
						isOwn={isOwn}
						isOptimistic={isOptimistic}
						onRetry={onRetry}
						className="float-right ml-4 mt-2"
					/>
				)}
			</div>

			<MessageActions
				message={message}
				currentUserId={currentUserId}
								isOwn={isOwn}
								isVisible={!isOptimistic && !message.failed}
								menuOpen={menuOpen}
								reactionTrayOpen={reactionTrayOpen}
				reactionRef={reactionRef}
				onToggleReactionTray={toggleReactionTray}
				onReply={onReply}
				onReact={onReact}
				onUnreact={onUnreact}
			/>
			{contextMenu}
		</MessageRow>
	);
});

export default MessageBubble;
