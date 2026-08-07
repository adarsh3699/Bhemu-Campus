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
		<div className="border-t border-white/5 bg-[#0a0f10]/80 backdrop-blur-xl px-4 py-3 sticky bottom-0 z-20">
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
					className="flex-1 resize-none bg-[#121718] border border-white/10 rounded-2xl px-4 py-3 text-[14px] leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 focus:bg-[#161b1c] transition-all max-h-[140px] disabled:opacity-50 shadow-inner"
				/>
				<button
					onClick={() => void submit()}
					disabled={!value.trim() || disabled}
					className="p-3 rounded-xl bg-primary text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/25 active:scale-95 transition-all shrink-0 group"
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
