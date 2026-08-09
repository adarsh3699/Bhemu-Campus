"use client";

import React, { memo, useRef, useState, useCallback, useEffect } from "react";
import { Pencil, Trash2, Flag, Reply, MoreHorizontal, Check, Clock, AlertCircle, SmilePlus } from "lucide-react";
import type { ChatMessage } from "@bhemu/shared";

interface MessageBubbleProps {
	message: ChatMessage & { failed?: boolean; idempotencyKey?: string | null };
	repliedMessage?: ChatMessage;
	currentUserId: string | null; // passed from MessageList — avoids useAuth() per bubble
	showIdentity: boolean;
	onReply: (msg: ChatMessage) => void;
	onEdit: (msg: ChatMessage) => void;
	onDelete: (messageId: string) => void;
	onRetry: (messageId: string) => void;
	onReact: (messageId: string, emoji: string) => void;
	onUnreact: (messageId: string) => void;
	onReport: (messageId: string) => void;
}

// Memoized formatters — only compute on first call per unique iso string
const timeCache = new Map<string, string>();
function formatTime(iso: string): string {
	let cached = timeCache.get(iso);
	if (!cached) {
		cached = new Date(iso).toLocaleTimeString("en-IN", {
			hour: "2-digit",
			minute: "2-digit",
			hour12: true,
		});
		timeCache.set(iso, cached);
		// Keep cache bounded
		if (timeCache.size > 500) timeCache.clear();
	}
	return cached;
}

const dateCache = new Map<string, string>();
function formatDate(iso: string): string {
	const key = new Date(iso).toDateString();
	let cached = dateCache.get(key);
	if (!cached) {
		cached = new Date(iso).toLocaleDateString("en-IN", {
			weekday: "long",
			day: "numeric",
			month: "long",
		});
		dateCache.set(key, cached);
	}
	return cached;
}

const toDateStringCache = new Map<string, string>();
export function getToDateString(iso: string): string {
	let cached = toDateStringCache.get(iso);
	if (!cached) {
		cached = new Date(iso).toDateString();
		toDateStringCache.set(iso, cached);
		if (toDateStringCache.size > 1000) toDateStringCache.clear();
	}
	return cached;
}

const getTimeCache = new Map<string, number>();
export function getMessageTime(iso: string): number {
	let cached = getTimeCache.get(iso);
	if (!cached) {
		cached = new Date(iso).getTime();
		getTimeCache.set(iso, cached);
		if (getTimeCache.size > 1000) getTimeCache.clear();
	}
	return cached;
}

export function shouldShowDateSeparator(curr: ChatMessage, prev?: ChatMessage): boolean {
	if (!prev) return true;
	return getToDateString(prev.createdAt) !== getToDateString(curr.createdAt);
}

export function DateSeparator({ iso }: { iso: string }) {
	return (
		<div className="my-6 flex justify-center">
			<span className="rounded-full border border-white/10 bg-[#17151b]/90 px-3 py-1 text-[11px] font-semibold text-white/80 shadow-sm backdrop-blur-sm">
				{formatDate(iso)}
			</span>
		</div>
	);
}

const AVATAR_COLORS = [
	"from-cyan-500 to-blue-600",
	"from-violet-500 to-fuchsia-600",
	"from-amber-500 to-orange-600",
	"from-emerald-500 to-teal-600",
	"from-rose-500 to-pink-600",
] as const;

function authorDisplayName(message: ChatMessage): string {
	return message.authorName?.trim() || "Student";
}

function authorInitials(name: string): string {
	const initials = name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0])
		.join("");
	return initials.toLocaleUpperCase() || "S";
}

function avatarColor(uid: string): (typeof AVATAR_COLORS)[number] {
	let hash = 0;
	for (let index = 0; index < uid.length; index += 1) {
		hash = (hash * 31 + uid.charCodeAt(index)) | 0;
	}
	return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length] ?? AVATAR_COLORS[0];
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
}: MessageBubbleProps) {
	const [menuOpen, setMenuOpen] = useState(false);
	const [reactionTrayOpen, setReactionTrayOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);
	const reactionRef = useRef<HTMLDivElement>(null);

	const isOwn = currentUserId === message.authorUid;
	const isDeleted = message.visibility === "DELETED";
	const isAnnouncement = message.type === "ANNOUNCEMENT";
	const isOptimistic = message.id.startsWith("optimistic_");
	const authorName = authorDisplayName(message);

	const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

	// Aggregate reactions
	const reactionCounts = React.useMemo(() => {
		if (!message.reactions || message.reactions.length === 0) return null;
		const counts = new Map<string, { count: number; hasReacted: boolean }>();
		for (const r of message.reactions) {
			const existing = counts.get(r.emoji) || { count: 0, hasReacted: false };
			existing.count += 1;
			if (r.userUid === currentUserId) existing.hasReacted = true;
			counts.set(r.emoji, existing);
		}
		// Sort by count descending so most popular is first
		return Array.from(counts.entries()).sort((a, b) => b[1].count - a[1].count);
	}, [message.reactions, currentUserId]);

	// Close menu on outside click
	useEffect(() => {
		if (!menuOpen && !reactionTrayOpen) return;
		const handleOutsideClick = (e: MouseEvent) => {
			if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
			if (reactionRef.current && reactionRef.current.contains(e.target as Node)) return;
			setMenuOpen(false);
			setReactionTrayOpen(false);
		};
		document.addEventListener("mousedown", handleOutsideClick);
		return () => document.removeEventListener("mousedown", handleOutsideClick);
	}, [menuOpen, reactionTrayOpen]);

	const toggleMenu = useCallback(() => {
		setMenuOpen((v) => !v);
		setReactionTrayOpen(false);
	}, []);
	const closeMenu = useCallback(() => {
		setMenuOpen(false);
		setReactionTrayOpen(false);
	}, []);

	if (isAnnouncement) {
		return (
			<div className="my-4 flex justify-center">
				<div className="max-w-[85%] rounded-2xl border border-primary/30 bg-primary/10 px-5 py-3 text-center shadow-lg shadow-black/20">
					<p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Announcement</p>
					<p className="text-sm leading-relaxed text-white">{message.content}</p>
					<p className="mt-1 text-[10px] text-white/50">{formatTime(message.createdAt)}</p>
				</div>
			</div>
		);
	}

	if (isDeleted) {
		return (
			<div className={`flex ${isOwn ? "justify-end" : "justify-start"} my-0.5`}>
				<p className="text-xs text-muted-foreground italic px-3 py-1.5 rounded-xl bg-white/3 border border-white/5">
					Message deleted
				</p>
			</div>
		);
	}

	return (
		<div
			className={`group flex items-end gap-3 ${showIdentity ? "mt-5" : "mt-1"} ${isOwn ? "flex-row-reverse" : "flex-row"}`}
		>
			{/* Room messages retain a stable identity without a remote image lookup. */}
			{!isOwn && (
				<div className="w-10 shrink-0 self-end">
					{showIdentity && (
						<div
							className={`flex size-10 select-none items-center justify-center rounded-full bg-gradient-to-br ${avatarColor(message.authorUid)} text-xs font-bold text-white ring-2 ring-[#09070b] shadow-lg shadow-black/30`}
							role="img"
							aria-label={`${authorName}'s avatar`}
						>
							{authorInitials(authorName)}
						</div>
					)}
				</div>
			)}

			<div className={`relative flex max-w-[86%] flex-col sm:max-w-[74%] ${isOwn ? "items-end" : "items-start"}`}>
				{!isOwn && showIdentity && (
					<p className="mb-1.5 px-1 text-sm font-semibold tracking-tight text-sky-400">{authorName}</p>
				)}

				<div
					className={`relative flow-root min-w-[80px] rounded-2xl border px-2 py-1 text-[15px] font-normal leading-relaxed break-words select-text shadow-[0_8px_20px_rgba(0,0,0,0.16)] transition-[border-color,background-color,box-shadow] ${
						isOwn
							? `rounded-br-md border-primary/50 bg-primary text-white ${isOptimistic ? "opacity-80" : "hover:border-primary/70 hover:shadow-primary/20"}`
							: "rounded-bl-md border-white/10 bg-[#202020]/95 text-foreground hover:border-white/20"
					}`}
				>
					{message.replyToMessageId && (
						<div
							className={`relative mb-1.5 mt-0.5 flex flex-col overflow-hidden rounded-[4px] border-l-[3px] pl-2 pr-2 py-0.5 text-[13px] leading-tight cursor-pointer ${
								isOwn ? "border-l-white/40 bg-black/10" : "border-l-sky-500 bg-white/5"
							}`}
						>
							<span className={`font-semibold ${isOwn ? "text-white" : "text-sky-400"}`}>
								{repliedMessage
									? repliedMessage.authorUid === currentUserId
										? "You"
										: authorDisplayName(repliedMessage)
									: "Replied message"}
							</span>
							<span className={`truncate text-[12px] ${isOwn ? "text-white/80" : "text-white/60"}`}>
								{repliedMessage ? repliedMessage.content : "Message content not loaded"}
							</span>
						</div>
					)}
					<span className="whitespace-pre-wrap">
						{message.content.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
							part.match(/^https?:\/\//) ? (
								<a
									key={i}
									href={part}
									target="_blank"
									className={`underline transition-colors ${
										isOwn ? "text-white" : "text-sky-400 hover:text-sky-300"
									}`}
								>
									{part}
								</a>
							) : (
								part
							)
						)}
					</span>

					{reactionCounts && reactionCounts.length > 0 ? (
						<div className="mt-2 flex flex-wrap items-end justify-between gap-3">
							<div className="flex flex-wrap gap-1.5">
								{reactionCounts.map(([emoji, { count, hasReacted }]) => (
									<button
										key={emoji}
										onClick={() =>
											hasReacted ? onUnreact(message.id) : onReact(message.id, emoji)
										}
										className={`flex items-center gap-1.5 rounded-full pl-1.5 pr-2.5 py-0.5 text-[12px] font-medium border transition-colors ${
											hasReacted
												? isOwn
													? "bg-white/30 border-white/20 text-white"
													: "bg-sky-500/20 border-sky-500/30 text-sky-400"
												: isOwn
													? "bg-black/20 border-black/10 text-white/90 hover:bg-black/30"
													: "bg-white/10 border-white/5 text-white/80 hover:bg-white/20"
										}`}
										title={hasReacted ? "Remove reaction" : "React"}
									>
										<span className="text-[16px] leading-none">{emoji}</span>
										<span className="pt-[1px]">{count}</span>
									</button>
								))}
							</div>
							<div
								className={`flex shrink-0 items-center justify-end gap-1 mb-0.5 ${isOwn ? "text-white/80" : "text-white/45"}`}
							>
								{message.editedAt && <span className="text-[10px] opacity-70">edited</span>}
								{message.failed ? (
									<>
										<span className="text-[10px] font-medium text-red-300">Failed to send</span>
										<button
											onClick={() => onRetry(message.idempotencyKey || message.id)}
											className="ml-1 flex items-center gap-1 text-[10px] font-semibold text-red-400 hover:text-red-300 transition-colors"
										>
											<AlertCircle className="size-3" />
											Retry
										</button>
									</>
								) : isOptimistic ? (
									<>
										<span className="text-[10px] font-medium tabular-nums">
											{formatTime(message.createdAt)}
										</span>
										{isOwn && <Clock className="size-[11px] opacity-70" aria-label="Sending" />}
									</>
								) : (
									<>
										<span className="text-[10px] font-medium tabular-nums">
											{formatTime(message.createdAt)}
										</span>
										{isOwn && <Check className="size-3" strokeWidth={3} aria-label="Sent" />}
									</>
								)}
							</div>
						</div>
					) : (
						<span
							className={`float-right ml-4 mt-2 flex items-center justify-end gap-1 ${isOwn ? "text-white/80" : "text-white/45"}`}
						>
							{message.editedAt && <span className="text-[10px] opacity-70">edited</span>}
							{message.failed ? (
								<>
									<span className="text-[10px] font-medium text-red-300">Failed to send</span>
									<button
										onClick={() => onRetry(message.idempotencyKey || message.id)}
										className="ml-1 flex items-center gap-1 text-[10px] font-semibold text-red-400 hover:text-red-300 transition-colors"
									>
										<AlertCircle className="size-3" />
										Retry
									</button>
								</>
							) : isOptimistic ? (
								<>
									<span className="text-[10px] font-medium tabular-nums">
										{formatTime(message.createdAt)}
									</span>
									{isOwn && <Clock className="size-[11px] opacity-70" aria-label="Sending" />}
								</>
							) : (
								<>
									<span className="text-[10px] font-medium tabular-nums">
										{formatTime(message.createdAt)}
									</span>
									{isOwn && <Check className="size-3" strokeWidth={3} aria-label="Sent" />}
								</>
							)}
						</span>
					)}
				</div>

				{/* Hover actions — don't show on optimistic or failed messages */}
				{!isOptimistic && !message.failed && (
					<div
						className={`absolute bottom-0 ${
							isOwn ? "left-0 -translate-x-full pr-1.5" : "right-0 translate-x-full pl-1.5"
						} flex items-center gap-1 transition-opacity duration-200 ${
							menuOpen || reactionTrayOpen
								? "opacity-100"
								: "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
						}`}
					>
						<div ref={reactionRef} className="relative">
							<button
								onClick={() => {
									setReactionTrayOpen((v) => !v);
									setMenuOpen(false);
								}}
								className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-[#1a1f20] text-muted-foreground shadow-sm transition-all hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
								title="React"
								aria-label="React to message"
							>
								<SmilePlus className="size-4" />
							</button>
							{reactionTrayOpen && (
								<div
									className={`absolute bottom-full mb-2 z-50 flex items-center gap-1 rounded-full border border-white/10 bg-[#121212]/95 backdrop-blur-md shadow-xl shadow-black/50 px-2 py-1.5 animate-in fade-in zoom-in-95 duration-150 ${
										isOwn ? "right-0" : "left-0"
									}`}
								>
									{QUICK_EMOJIS.map((emoji) => (
										<button
											key={emoji}
											onClick={() => {
												setReactionTrayOpen(false);
												const alreadyReactedWithThis = message.reactions?.some(
													(r) => r.userUid === currentUserId && r.emoji === emoji
												);
												if (alreadyReactedWithThis) {
													onUnreact(message.id);
												} else {
													onReact(message.id, emoji);
												}
											}}
											className="flex size-8 items-center justify-center rounded-full text-[17px] hover:bg-white/15 transition-all hover:scale-110 active:scale-95"
											title={emoji}
										>
											{emoji}
										</button>
									))}
								</div>
							)}
						</div>
						<button
							onClick={() => onReply(message)}
							className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-[#1a1f20] text-muted-foreground shadow-sm transition-all hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
							title="Reply"
							aria-label="Reply to message"
						>
							<Reply className="size-4" />
						</button>
						<div ref={menuRef} className="relative">
							<button
								onClick={toggleMenu}
								className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-[#1a1f20] text-muted-foreground shadow-sm transition-all hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
								title="More"
								aria-label="More message actions"
							>
								<MoreHorizontal className="size-4" />
							</button>
							{menuOpen && (
								<div
									className={`absolute top-8 z-50 w-36 rounded-xl border border-white/10 bg-[#121212]/95 backdrop-blur-md shadow-xl shadow-black/50 py-1.5 text-sm animate-in fade-in zoom-in-95 duration-150 ${
										isOwn ? "right-0" : "left-0"
									}`}
								>
									{isOwn && (
										<button
											className="flex w-full items-center gap-2 px-3 py-2 text-foreground hover:bg-white/5 transition-colors"
											onClick={() => {
												closeMenu();
												onEdit(message);
											}}
										>
											<Pencil className="w-3.5 h-3.5 text-muted-foreground" /> Edit
										</button>
									)}
									{isOwn && (
										<button
											className="flex w-full items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-950/20 transition-colors"
											onClick={() => {
												closeMenu();
												onDelete(message.id);
											}}
										>
											<Trash2 className="w-3.5 h-3.5" /> Delete
										</button>
									)}
									{!isOwn && (
										<button
											className="flex w-full items-center gap-2 px-3 py-2 text-foreground hover:bg-white/5 transition-colors"
											onClick={() => {
												closeMenu();
												onReport(message.id);
											}}
										>
											<Flag className="w-3.5 h-3.5 text-muted-foreground" /> Report
										</button>
									)}
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
});

export default MessageBubble;
