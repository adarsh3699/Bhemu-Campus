"use client";

import React, { memo, useRef, useState } from "react";
import { X } from "lucide-react";
import type { ReportReason } from "@bhemu/shared";

const REASONS: { value: ReportReason; label: string }[] = [
	{ value: "SPAM", label: "Spam" },
	{ value: "HARASSMENT", label: "Harassment" },
	{ value: "ABUSE", label: "Abuse" },
	{ value: "INAPPROPRIATE", label: "Inappropriate" },
	{ value: "MISINFORMATION", label: "Misinformation" },
	{ value: "OTHER", label: "Other" },
];

interface ReportModalProps {
	isOpen: boolean;
	onConfirm: (reason: ReportReason, description?: string) => Promise<void>;
	onClose: () => void;
}

const ReportModal = memo(function ReportModal({ isOpen, onConfirm, onClose }: ReportModalProps) {
	const [reason, setReason] = useState<ReportReason>("SPAM");
	const [description, setDescription] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const mountedRef = useRef(true);

	// Reset state when closed
	const handleClose = () => {
		setReason("SPAM");
		setDescription("");
		onClose();
	};

	if (!isOpen) return null;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		try {
			await onConfirm(reason, description.trim() || undefined);
			if (mountedRef.current) handleClose();
		} finally {
			if (mountedRef.current) setSubmitting(false);
		}
	};

	return (
		<div
			className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
			onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
		>
			<div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-sm mx-4 shadow-2xl">
				<div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
					<h3 className="text-sm font-semibold text-white">Report Message</h3>
					<button
						onClick={handleClose}
						className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
						aria-label="Close"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
				<form onSubmit={handleSubmit} className="p-5 space-y-4">
					<div className="grid grid-cols-2 gap-2">
						{REASONS.map(r => (
							<button
								key={r.value}
								type="button"
								onClick={() => setReason(r.value)}
								className={`px-3 py-2 rounded-lg text-sm text-left transition-all border ${
									reason === r.value
										? "bg-primary/10 border-primary/30 text-white"
										: "bg-white/3 border-white/10 text-muted-foreground hover:bg-white/5"
								}`}
							>
								{r.label}
							</button>
						))}
					</div>
					<textarea
						rows={2}
						value={description}
						onChange={e => setDescription(e.target.value)}
						placeholder="Additional details (optional)"
						className="w-full resize-none bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
					/>
					<div className="flex gap-2 justify-end">
						<button
							type="button"
							onClick={handleClose}
							className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={submitting}
							className="px-4 py-2 rounded-lg text-sm bg-destructive text-white hover:bg-destructive/90 disabled:opacity-40 transition-all"
						>
							{submitting ? "Reporting…" : "Report"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
});

export default ReportModal;
