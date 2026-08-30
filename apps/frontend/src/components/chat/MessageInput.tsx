"use client";

import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { BarChart3, Megaphone, Plus, Send, X } from "lucide-react";
import { MAX_CHAT_MESSAGE_LENGTH } from "@bhemu/shared";
import type { ChatMessage } from "@bhemu/shared";

interface MessageInputProps {
	onSend: (content: string, replyToId?: string) => Promise<void>;
	replyTo: ChatMessage | null;
	onCancelReply: () => void;
	disabled?: boolean;
	placeholder?: string;
	canCreatePoll?: boolean;
	canAnnounce?: boolean;
	onCreatePoll: () => void;
	onSendAnnouncement: (content: string) => Promise<void>;
}

const MessageInput = memo(function MessageInput({
	onSend, replyTo, onCancelReply, disabled = false, placeholder = "Message…", canCreatePoll = false, canAnnounce = false, onCreatePoll, onSendAnnouncement,
}: MessageInputProps) {
	const [value, setValue] = useState("");
	const [announcementMode, setAnnouncementMode] = useState(false);
	const [toolsOpen, setToolsOpen] = useState(false);
	const taRef = useRef<HTMLTextAreaElement>(null);
	const toolsRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!toolsOpen) return;

		const handleOutsidePointerDown = (event: PointerEvent) => {
			if (!toolsRef.current?.contains(event.target as Node)) {
				setToolsOpen(false);
			}
		};
		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") setToolsOpen(false);
		};

		document.addEventListener("pointerdown", handleOutsidePointerDown);
		document.addEventListener("keydown", handleEscape);
		return () => {
			document.removeEventListener("pointerdown", handleOutsidePointerDown);
			document.removeEventListener("keydown", handleEscape);
		};
	}, [toolsOpen]);

	useEffect(() => {
		if (announcementMode && !disabled) {
			taRef.current?.focus();
		}
	}, [announcementMode, disabled]);

	const autoResize = useCallback(() => {
		const ta = taRef.current;
		if (!ta) return;
		ta.style.height = "auto";
		ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
	}, []);

	const submit = useCallback(() => {
		const trimmed = value.trim();
		if (!trimmed || disabled) return;

		// Clear input immediately — don't wait for server
		setValue("");
		onCancelReply();
		if (taRef.current) taRef.current.style.height = "auto";
		// Keep the composer available while this message is being acknowledged.
		// Each send has its own optimistic message and delivery state.
		const send = announcementMode && canAnnounce ? onSendAnnouncement(trimmed) : onSend(trimmed, replyTo?.id);
		void send.catch(() => undefined);
	}, [value, disabled, onSend, replyTo, onCancelReply, announcementMode, canAnnounce, onSendAnnouncement]);

	const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			void submit();
		}
	}, [submit]);

	const handleCreatePoll = useCallback(() => {
		setToolsOpen(false);
		onCreatePoll();
	}, [onCreatePoll]);

	const toggleAnnouncementMode = useCallback(() => {
		setAnnouncementMode((current) => !current);
		setToolsOpen(false);
	}, []);

	return (
		<div className="sticky bottom-0 z-20 border-t border-white/10 bg-[#0b0d0f]/95 px-3 py-2 sm:px-5">
			{replyTo && (
				<div className="mb-2 flex items-center gap-2 border-l-2 border-primary bg-white/5 px-3 py-2 shadow-sm animate-in slide-in-from-bottom-2 duration-200">
					<div className="min-w-0 flex-1 pl-2">
						<p className="text-[11px] font-semibold text-primary uppercase tracking-wide mb-0.5">Replying to</p>
						<p className="text-sm text-foreground/90 truncate">{replyTo.content}</p>
					</div>
					<button
						type="button"
						onClick={onCancelReply}
						className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
						aria-label="Cancel reply"
					>
						<X className="w-3.5 h-3.5" />
					</button>
				</div>
			)}
			<div className="flex items-end gap-1.5">
				{(canCreatePoll || canAnnounce) && (
					<div ref={toolsRef} className="relative shrink-0">
						<button
							type="button"
							onClick={() => setToolsOpen((current) => !current)}
							disabled={disabled}
							aria-label="Open chat tools"
							aria-expanded={toolsOpen}
							className={`flex size-10 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
								announcementMode
									? "border-primary/50 bg-primary/15 text-primary"
									: "border-white/10 bg-[#15171a] text-muted-foreground hover:border-white/20 hover:bg-white/10 hover:text-white"
							}`}
						>
							<Plus className={`size-5 transition-transform duration-150 ${toolsOpen ? "rotate-45" : ""}`} />
						</button>
						{toolsOpen && (
							<div className="absolute bottom-full left-0 z-30 mb-2 w-44 rounded-xl border border-white/10 bg-[#17191b]/98 p-1.5 shadow-xl shadow-black/40 animate-in fade-in duration-150" role="menu">
								{canCreatePoll && (
									<button type="button" role="menuitem" onClick={handleCreatePoll} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-xs text-white/75 transition-colors hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:outline-none">
										<BarChart3 className="size-4 text-primary" /> Poll
									</button>
								)}
								{canAnnounce && (
									<button type="button" role="menuitem" onClick={toggleAnnouncementMode} className={`flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-xs transition-colors hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none ${announcementMode ? "text-primary" : "text-white/75 hover:text-white"}`}>
										<Megaphone className="size-4 text-primary" /> Announcement
									</button>
								)}
							</div>
						)}
					</div>
				)}
				<textarea
					ref={taRef}
					rows={1}
					value={value}
					maxLength={MAX_CHAT_MESSAGE_LENGTH}
					onChange={e => { setValue(e.target.value); autoResize(); }}
					onKeyDown={onKeyDown}
					placeholder={disabled ? "Connecting…" : announcementMode ? "Write an announcement…" : placeholder}
					disabled={disabled}
					className="min-h-10 max-h-[120px] flex-1 resize-none rounded-xl border border-white/10 bg-[#15171a] px-3 py-2 text-[14px] leading-5 text-foreground placeholder:text-muted-foreground shadow-inner transition-[border-color,background-color,box-shadow] focus:border-primary/60 focus:bg-[#191c1f] focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
				/>
				<button
					onClick={() => void submit()}
					disabled={!value.trim() || disabled}
					className="group flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-all hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/25 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0d0f]"
					aria-label="Send"
				>
					<Send className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
				</button>
			</div>
		</div>
	);
});

export default MessageInput;
