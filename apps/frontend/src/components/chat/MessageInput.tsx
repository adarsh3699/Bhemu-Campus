"use client";

import React, { memo, useCallback, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import { MAX_CHAT_MESSAGE_LENGTH } from "@bhemu/shared";
import type { ChatMessage } from "@bhemu/shared";

interface MessageInputProps {
	onSend: (content: string, replyToId?: string) => Promise<void>;
	replyTo: ChatMessage | null;
	onCancelReply: () => void;
	disabled?: boolean;
	placeholder?: string;
}

const MessageInput = memo(function MessageInput({
	onSend, replyTo, onCancelReply, disabled = false, placeholder = "Message…",
}: MessageInputProps) {
	const [value, setValue] = useState("");
	const taRef = useRef<HTMLTextAreaElement>(null);
	// Track in-flight sends to prevent double-submit but allow instant clear
	const sendingRef = useRef(false);

	const autoResize = useCallback(() => {
		const ta = taRef.current;
		if (!ta) return;
		ta.style.height = "auto";
		ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
	}, []);

	const submit = useCallback(async () => {
		const trimmed = value.trim();
		if (!trimmed || sendingRef.current || disabled) return;
		sendingRef.current = true;

		// Clear input immediately — don't wait for server
		setValue("");
		onCancelReply();
		if (taRef.current) taRef.current.style.height = "auto";

		try {
			await onSend(trimmed, replyTo?.id);
		} finally {
			sendingRef.current = false;
		}
	}, [value, disabled, onSend, replyTo, onCancelReply]);

	const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			void submit();
		}
	}, [submit]);

	return (
		<div className="sticky bottom-0 z-20 border-t border-white/10 bg-[#0b0d0f]/95 px-3 py-3 backdrop-blur-xl sm:px-5">
			{replyTo && (
				<div className="flex items-center gap-3 mb-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 shadow-sm backdrop-blur-md animate-in slide-in-from-bottom-2 duration-200">
					<div className="flex-1 min-w-0 border-l-2 border-primary pl-3">
						<p className="text-[11px] font-semibold text-primary uppercase tracking-wide mb-0.5">Replying to</p>
						<p className="text-sm text-foreground/90 truncate">{replyTo.content}</p>
					</div>
					<button
						onClick={onCancelReply}
						className="p-1 rounded text-muted-foreground hover:text-white transition-colors"
					>
						<X className="w-3.5 h-3.5" />
					</button>
				</div>
			)}
			<div className="flex items-end gap-2">
				<textarea
					ref={taRef}
					rows={1}
					value={value}
					maxLength={MAX_CHAT_MESSAGE_LENGTH}
					onChange={e => { setValue(e.target.value); autoResize(); }}
					onKeyDown={onKeyDown}
					placeholder={disabled ? "Connecting…" : placeholder}
					disabled={disabled}
					className="min-h-11 max-h-[140px] flex-1 resize-none rounded-2xl border border-white/10 bg-[#15171a] px-4 py-3 text-[16px] leading-relaxed text-foreground placeholder:text-muted-foreground shadow-inner transition-[border-color,background-color,box-shadow] focus:border-primary/60 focus:bg-[#191c1f] focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 sm:text-[14px]"
				/>
				<button
					onClick={() => void submit()}
					disabled={!value.trim() || disabled}
					className="group flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-white transition-all hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/25 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0d0f]"
					aria-label="Send"
				>
					<Send className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
				</button>
			</div>
			<p className="text-[10px] text-muted-foreground mt-1.5">
				Enter to send · Shift+Enter for new line
			</p>
		</div>
	);
});

export default MessageInput;
