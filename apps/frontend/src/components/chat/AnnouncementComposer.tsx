"use client";

import { memo, useEffect, useState } from "react";
import { Megaphone, Send, X } from "lucide-react";
import { MAX_CHAT_MESSAGE_LENGTH } from "@bhemu/shared";

interface AnnouncementComposerProps {
	isOpen: boolean;
	onClose: () => void;
	onSubmit: (content: string) => Promise<void>;
}

const AnnouncementComposer = memo(function AnnouncementComposer({ isOpen, onClose, onSubmit }: AnnouncementComposerProps) {
	const [value, setValue] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!isOpen) return;
		setValue("");
		setSubmitting(false);
		setError(null);
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) return;
		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};
		document.addEventListener("keydown", handleEscape);
		return () => document.removeEventListener("keydown", handleEscape);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const submit = async () => {
		const content = value.trim();
		if (!content) {
			setError("Announcement cannot be empty.");
			return;
		}
		if (submitting) return;

		setSubmitting(true);
		setError(null);
		try {
			await onSubmit(content);
			onClose();
		} catch (submitError) {
			setError(submitError instanceof Error ? submitError.message : "Announcement could not be sent.");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div
			className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
			onPointerDown={(event) => {
				if (event.target === event.currentTarget) onClose();
			}}
			role="dialog"
			aria-modal="true"
			aria-labelledby="announcement-composer-title"
		>
			<div className="w-full max-w-md rounded-t-2xl border border-white/10 bg-[#121416] p-5 shadow-2xl shadow-black/60 sm:rounded-2xl">
				<div className="mb-5 flex items-start justify-between gap-4">
					<div>
						<div className="mb-2 flex items-center gap-2 text-primary">
							<Megaphone className="size-4" />
							<span className="text-[11px] font-semibold uppercase tracking-[0.16em]">New announcement</span>
						</div>
						<h2 id="announcement-composer-title" className="text-lg font-semibold text-white">Share with your campus</h2>
						<p className="mt-1 text-xs text-white/45">This message will be highlighted as an announcement.</p>
					</div>
					<button type="button" onClick={onClose} className="flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label="Close announcement composer">
						<X className="size-4" />
					</button>
				</div>

				<label className="block">
					<span className="mb-1.5 block text-xs font-medium text-white/70">Announcement</span>
					<textarea
						autoFocus
						value={value}
						onChange={(event) => setValue(event.target.value)}
						maxLength={MAX_CHAT_MESSAGE_LENGTH}
						rows={5}
						placeholder="Write your announcement…"
						className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-primary/70 focus:ring-2 focus:ring-primary/20"
					/>
					<div className="mt-1 flex items-start justify-between gap-2">
						<span className="text-[10px] text-white/30">{value.length}/{MAX_CHAT_MESSAGE_LENGTH}</span>
						{error && <span className="text-right text-xs text-red-300">{error}</span>}
					</div>
				</label>

				<div className="mt-5 flex justify-end gap-2 border-t border-white/5 pt-4">
					<button type="button" onClick={onClose} className="min-h-11 rounded-xl px-4 text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Cancel</button>
					<button type="button" onClick={() => void submit()} disabled={submitting || !value.trim()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
						<Send className="size-4" />
						{submitting ? "Sending…" : "Send announcement"}
					</button>
				</div>
			</div>
		</div>
	);
});

export default AnnouncementComposer;
