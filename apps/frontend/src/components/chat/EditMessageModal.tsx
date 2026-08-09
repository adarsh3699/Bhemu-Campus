"use client";

import React, { memo, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

interface EditMessageModalProps {
	isOpen: boolean;
	initialContent: string;
	onConfirm: (newContent: string) => Promise<void>;
	onClose: () => void;
}

const EditMessageModal = memo(function EditMessageModal({
	isOpen, initialContent, onConfirm, onClose,
}: EditMessageModalProps) {
	const [value, setValue] = useState(initialContent);
	const [saving, setSaving] = useState(false);
	const mountedRef = useRef(true);

	useEffect(() => {
		mountedRef.current = true;
		return () => { mountedRef.current = false; };
	}, []);

	useEffect(() => {
		if (isOpen) setValue(initialContent);
	}, [isOpen, initialContent]);

	if (!isOpen) return null;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const trimmed = value.trim();
		if (!trimmed || trimmed === initialContent) { onClose(); return; }
		setSaving(true);
		try {
			await onConfirm(trimmed);
			if (mountedRef.current) onClose();
		} finally {
			if (mountedRef.current) setSaving(false);
		}
	};

	return (
		<div
			className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
			onClick={e => { if (e.target === e.currentTarget) onClose(); }}
		>
			<div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-md mx-4 shadow-2xl">
				<div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
					<h3 className="text-sm font-semibold text-white">Edit Message</h3>
					<button
						onClick={onClose}
						className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
						aria-label="Close"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
				<form onSubmit={handleSubmit} className="p-5 space-y-4">
					<textarea
						rows={4}
						value={value}
						onChange={e => setValue(e.target.value)}
						onKeyDown={e => {
							if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSubmit(e as unknown as React.FormEvent); }
							if (e.key === "Escape") onClose();
						}}
						className="w-full resize-none bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
						autoFocus
					/>
					<div className="flex gap-2 justify-end">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={saving || !value.trim() || value.trim() === initialContent}
							className="px-4 py-2 rounded-lg text-sm bg-primary text-white hover:bg-primary-dark disabled:opacity-40 transition-all"
						>
							{saving ? "Saving…" : "Save"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
});

export default EditMessageModal;
