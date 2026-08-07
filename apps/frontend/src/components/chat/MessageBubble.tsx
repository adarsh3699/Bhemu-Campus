"use client";

import React, { memo, useRef, useState, useCallback } from "react";
import { Pencil, Trash2, Flag, Reply, MoreHorizontal, Check, Clock } from "lucide-react";
import type { ChatMessage } from "@bhemu/shared";

interface MessageBubbleProps {
	message: ChatMessage;
	currentUserId: string | null; // passed from MessageList — avoids useAuth() per bubble
	onReply: (msg: ChatMessage) => void;
	onEdit: (msg: ChatMessage) => void;
	onDelete: (messageId: string) => void;
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

export function shouldShowDateSeparator(curr: ChatMessage, prev?: ChatMessage): boolean {
	if (!prev) return true;
	return new Date(prev.createdAt).toDateString() !== new Date(curr.createdAt).toDateString();
}

export function DateSeparator({ iso }: { iso: string }) {
	return (
		<div className="flex items-center gap-3 my-4">
			<div className="flex-1 h-px bg-white/5" />
			<span className="text-[11px] text-muted-foreground font-medium px-2 shrink-0">{formatDate(iso)}</span>
			<div className="flex-1 h-px bg-white/5" />
		</div>
	);
}

const MessageBubble = memo(function MessageBubble({
	message,
	currentUserId,
	onReply,
	onEdit,
	onDelete,
	onReport,
}: MessageBubbleProps) {
	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	const isOwn = currentUserId === message.authorUid;
	const isDeleted = message.visibility === "DELETED";
	const isAnnouncement = message.type === "ANNOUNCEMENT";
	const isOptimistic = message.id.startsWith("optimistic_");

	// Close menu on outside click
	const handleMouseLeave = useCallback(() => setMenuOpen(false), []);
	const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);
	const closeMenu = useCallback(() => setMenuOpen(false), []);

	if (isAnnouncement) {
		return (
			<div className="flex justify-center my-3">
				<div className="bg-primary/10 border border-primary/20 rounded-2xl px-5 py-2.5 max-w-[85%] text-center">
					<p className="text-[10px] text-primary font-bold uppercase tracking-widest mb-1">Announcement</p>
					<p className="text-sm text-white leading-relaxed">{message.content}</p>
					<p className="text-[10px] text-muted-foreground mt-1">{formatTime(message.createdAt)}</p>
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
			className={`group flex items-end gap-2.5 my-1.5 animate-slide-up-fade ${isOwn ? "flex-row-reverse" : "flex-row"}`}
			onMouseLeave={handleMouseLeave}
		>
			{/* Avatar — only for others */}
			{!isOwn && (
				<div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/60 to-accent/60 flex items-center justify-center text-white text-xs font-bold shrink-0 mb-0.5 select-none">
					{message.authorUid.charAt(0).toUpperCase()}
				</div>
			)}

			<div className={`relative flex flex-col max-w-[72%] ${isOwn ? "items-end" : "items-start"}`}>
				{message.replyToMessageId && (
					<p
						className={`text-[11px] text-muted-foreground mb-0.5 pl-2 border-l-2 border-white/20 ${isOwn ? "text-right" : ""}`}
					>
						↩ Reply
					</p>
				)}

				<div
					className={`relative px-4 py-2 rounded-[20px] text-[16px] font-normal leading-relaxed break-words select-text shadow-sm transition-all min-w-[100px] ${
						isOwn
							? `bg-primary text-white rounded-br-[4px] ${isOptimistic ? "opacity-70" : "hover:shadow-md hover:shadow-primary/20"}`
							: "bg-[#161b1c] text-foreground border border-white/5 rounded-bl-[4px] hover:border-white/10"
					}`}
				>
					<span className="whitespace-pre-wrap">{message.content}</span>
					<span className="inline-block w-[78px]" />
					<div className={`absolute bottom-2 right-3 flex items-center gap-1 ${isOwn ? "text-white/80" : "text-muted-foreground/70"}`}>
						{message.editedAt && <span className="text-[10px] opacity-70">edited</span>}
						{isOptimistic ? (
							<>
								<span className="text-[11px] font-medium">
									{formatTime(message.createdAt)}
								</span>
								{isOwn && <Clock className="w-[12px] h-[12px] opacity-70" />}
							</>
						) : (
							<>
								<span className="text-[11px] font-medium">
									{formatTime(message.createdAt)}
								</span>
								{isOwn && <Check className="w-[14px] h-[14px]" strokeWidth={3} />}
							</>
						)}
					</div>
				</div>

				{/* Hover actions — don't show on optimistic messages */}
				{!isOptimistic && (
					<div
						className={`absolute top-0 ${
							isOwn ? "left-0 -translate-x-full pr-1.5" : "right-0 translate-x-full pl-1.5"
						} opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1`}
					>
						<button
							onClick={() => onReply(message)}
							className="p-1.5 rounded-full text-muted-foreground bg-[#1a1f20] border border-white/5 hover:text-white hover:bg-white/10 hover:border-white/10 transition-all shadow-sm hover:scale-105 active:scale-95"
							title="Reply"
						>
							<Reply className="w-3.5 h-3.5" />
						</button>
						<div ref={menuRef} className="relative">
							<button
								onClick={toggleMenu}
								className="p-1.5 rounded-full text-muted-foreground bg-[#1a1f20] border border-white/5 hover:text-white hover:bg-white/10 hover:border-white/10 transition-all shadow-sm hover:scale-105 active:scale-95"
								title="More"
							>
								<MoreHorizontal className="w-3.5 h-3.5" />
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
