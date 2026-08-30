"use client";

import { memo, useEffect, useState } from "react";
import { Ban, Clock3, MessageSquareWarning, ShieldAlert, Trash2, UserRoundX, X } from "lucide-react";
import type { AppRole, ChatMessage } from "@bhemu/shared";

type ModerationAction = "warn" | "suspend" | "ban" | "delete";

interface ModerationModalProps {
	message: ChatMessage | null;
	role: AppRole | null;
	onClose: () => void;
	onConfirm: (action: ModerationAction, reason: string, expiresAt?: string) => Promise<void>;
}

const ModerationModal = memo(function ModerationModal({ message, role, onClose, onConfirm }: ModerationModalProps) {
	const [action, setAction] = useState<ModerationAction>("warn");
	const [reason, setReason] = useState("");
	const [expiresAt, setExpiresAt] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	useEffect(() => {
		if (!message) return;
		setAction("warn");
		setReason("");
		setExpiresAt("");
		setSubmitting(false);
		setSubmitError(null);
	}, [message]);

	if (!message || !role) return null;

	const submit = async () => {
		if (!reason.trim() && action !== "delete") return;
		if (action === "suspend" && !expiresAt) return;
		setSubmitting(true);
		setSubmitError(null);
		try {
			await onConfirm(action, reason.trim(), action === "suspend" ? new Date(expiresAt).toISOString() : undefined);
			onClose();
		} catch (error) {
			setSubmitError(error instanceof Error ? error.message : "The action could not be applied.");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="moderation-title">
		<div className="w-full max-w-md rounded-t-2xl border border-red-400/20 bg-[#121416] p-5 shadow-2xl shadow-black/60 sm:rounded-2xl">
			<div className="mb-5 flex items-start justify-between gap-4">
				<div>
					<div className="mb-2 flex items-center gap-2 text-red-300">
						<ShieldAlert className="size-4" />
						<span className="text-[11px] font-semibold uppercase tracking-[0.16em]">Moderator tools</span>
					</div>
					<h2 id="moderation-title" className="text-lg font-semibold text-white">Review {message.authorName}</h2>
					<p className="mt-1 max-w-sm truncate text-xs text-white/45">{message.content || "Message deleted"}</p>
				</div>
				<button type="button" onClick={onClose} className="flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label="Close moderation tools"><X className="size-4" /></button>
			</div>

			<div className="mb-5">
				<p className="mb-2 text-xs font-medium text-white/70">Choose an action</p>
				<div className="grid grid-cols-2 gap-2">
					{[
						{ value: "warn" as const, label: "Warn", hint: "Notify user", icon: MessageSquareWarning },
						{ value: "suspend" as const, label: "Suspend", hint: "Block temporarily", icon: Clock3 },
						...(role === "ADMIN" ? [{ value: "ban" as const, label: "Ban", hint: "Block permanently", icon: Ban }] : []),
						{ value: "delete" as const, label: "Delete", hint: "Remove message", icon: Trash2 },
					].map(({ value, label, hint, icon: Icon }) => (
						<button key={value} type="button" onClick={() => setAction(value)} aria-pressed={action === value} className={`flex min-h-14 items-center gap-2.5 rounded-xl border px-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${action === value ? "border-red-400/50 bg-red-500/10 text-red-200" : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:bg-white/[0.06]"}`}>
							<Icon className="size-4 shrink-0" />
							<span className="min-w-0"><span className="block text-xs font-semibold">{label}</span><span className="block truncate text-[10px] text-white/35">{hint}</span></span>
						</button>
					))}
				</div>
			</div>

			{action === "suspend" && (
				<label className="mb-4 block">
					<span className="mb-1.5 block text-xs font-medium text-white/70">Suspension ends</span>
					<input type="datetime-local" value={expiresAt} onChange={event => setExpiresAt(event.target.value)} className="min-h-11 w-full rounded-xl border border-white/10 bg-[#1a1d20] px-3 py-2.5 text-sm text-white outline-none focus:border-primary/70 focus:ring-2 focus:ring-primary/20" />
				</label>
			)}

			<label className="mb-4 block">
				<span className="mb-1.5 block text-xs font-medium text-white/70">Reason {action !== "delete" && <span className="text-red-300">*</span>}</span>
			<textarea value={reason} onChange={event => setReason(event.target.value)} maxLength={500} rows={3} placeholder={action === "delete" ? "Optional moderation note" : "Explain this action"} className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-primary/70 focus:ring-2 focus:ring-primary/20" />
			</label>

			{submitError && <p className="mb-3 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200" role="alert">{submitError}</p>}
			<p className="mb-5 flex items-start gap-2 text-[11px] leading-relaxed text-white/40"><UserRoundX className="mt-0.5 size-3.5 shrink-0" /> Actions are recorded in the moderation history. Destructive actions should be used carefully.</p>
			<div className="flex justify-end gap-2 border-t border-white/5 pt-4">
				<button type="button" onClick={onClose} className="min-h-11 rounded-xl px-4 text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Cancel</button>
				<button type="button" onClick={() => void submit()} disabled={submitting || (action !== "delete" && !reason.trim()) || (action === "suspend" && !expiresAt)} className="min-h-11 rounded-xl bg-red-500/90 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">{submitting ? "Applying…" : "Apply action"}</button>
			</div>
		</div>
		</div>
	);
});

export type { ModerationAction };
export default ModerationModal;
