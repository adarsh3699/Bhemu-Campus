"use client";

import { memo, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { BarChart3, Check, Plus, X } from "lucide-react";
import { MAX_CHAT_POLL_OPTIONS, MAX_CHAT_POLL_OPTION_LENGTH, MAX_CHAT_POLL_QUESTION_LENGTH, MIN_CHAT_POLL_OPTIONS, validateChatPollDraft } from "@bhemu/shared";

interface PollComposerProps {
	isOpen: boolean;
	onClose: () => void;
	onSubmit: (question: string, options: string[], multipleChoice: boolean) => Promise<void>;
}

const PollComposer = memo(function PollComposer({ isOpen, onClose, onSubmit }: PollComposerProps) {
	const [question, setQuestion] = useState("");
	const [options, setOptions] = useState(["", ""]);
	const [multipleChoice, setMultipleChoice] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const optionRefs = useRef<Array<HTMLInputElement | null>>([]);

	useEffect(() => {
		if (!isOpen) return;
		setQuestion("");
		setOptions(["", ""]);
		setMultipleChoice(false);
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

	const updateOption = (index: number, value: string) => {
		setOptions(current => current.map((option, optionIndex) => optionIndex === index ? value : option));
	};

	const addOption = () => {
		const nextIndex = options.length;
		if (nextIndex >= MAX_CHAT_POLL_OPTIONS) return;

		setOptions(current => current.length >= MAX_CHAT_POLL_OPTIONS ? current : [...current, ""]);
		requestAnimationFrame(() => optionRefs.current[nextIndex]?.focus());
	};

	const handleOptionKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>, index: number) => {
		if (event.key !== "Enter") return;

		event.preventDefault();
		const nextIndex = index + 1;
		if (nextIndex < options.length) {
			optionRefs.current[nextIndex]?.focus();
			return;
		}

		addOption();
	};
	const pollDraft = validateChatPollDraft(question, options);

	const submit = async () => {
		if (pollDraft.error) {
			setError(pollDraft.error);
			return;
		}

		setSubmitting(true);
		setError(null);
		try {
			await onSubmit(pollDraft.question, pollDraft.options, multipleChoice);
			onClose();
		} catch (submitError) {
			setError(submitError instanceof Error ? submitError.message : "Poll could not be created.");
		} finally {
			setSubmitting(false);
		}
	};
	const canSubmit = !pollDraft.error && !submitting;

	return (
		<div
			className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
			onPointerDown={(event) => {
				if (event.target === event.currentTarget) onClose();
			}}
			role="dialog"
			aria-modal="true"
			aria-labelledby="poll-composer-title"
		>
		<div className="w-full max-w-md rounded-t-2xl border border-white/10 bg-[#121416] p-5 shadow-2xl shadow-black/60 sm:rounded-2xl">
			<div className="mb-5 flex items-start justify-between gap-4">
				<div>
					<div className="mb-2 flex items-center gap-2 text-primary">
						<BarChart3 className="size-4" />
						<span className="text-[11px] font-semibold uppercase tracking-[0.16em]">New poll</span>
					</div>
					<h2 id="poll-composer-title" className="text-lg font-semibold text-white">Ask your campus</h2>
					<p className="mt-1 text-xs text-white/45">Share a question and let everyone vote.</p>
				</div>
				<button type="button" onClick={onClose} className="flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label="Close poll composer">
					<X className="size-4" />
				</button>
			</div>

			<label className="mb-4 block">
				<span className="mb-1.5 block text-xs font-medium text-white/70">Question</span>
				<textarea
					value={question}
					onChange={event => setQuestion(event.target.value)}
					maxLength={MAX_CHAT_POLL_QUESTION_LENGTH}
					rows={3}
					placeholder="What should the campus community decide?"
					className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-primary/70 focus:ring-2 focus:ring-primary/20"
				/>
				<p className="mt-1 text-right text-[10px] text-white/30">{question.length}/500</p>
			</label>

			<div className="mb-4">
				<div className="mb-1.5 flex items-center justify-between">
					<span className="text-xs font-medium text-white/70">Options</span>
							<span className="text-[11px] text-white/35">{options.length}/{MAX_CHAT_POLL_OPTIONS}</span>
				</div>
				<div className="space-y-2">
					{options.map((option, index) => (
						<div key={index} className="flex items-center gap-2">
							<span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-xs font-semibold text-white/40">{index + 1}</span>
							<input
								ref={element => { optionRefs.current[index] = element; }}
								value={option}
								onChange={event => updateOption(index, event.target.value)}
								onKeyDown={event => handleOptionKeyDown(event, index)}
								maxLength={MAX_CHAT_POLL_OPTION_LENGTH}
								placeholder={`Option ${index + 1}`}
								className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-primary/70 focus:ring-2 focus:ring-primary/20"
							/>
							{options.length > MIN_CHAT_POLL_OPTIONS && (
								<button type="button" onClick={() => setOptions(current => current.filter((_, optionIndex) => optionIndex !== index))} className="flex size-10 items-center justify-center rounded-lg text-white/35 transition-colors hover:bg-red-500/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={`Remove option ${index + 1}`}>
									<X className="size-4" />
								</button>
							)}
						</div>
					))}
				</div>
				{options.length < MAX_CHAT_POLL_OPTIONS && (
					<button type="button" onClick={addOption} className="mt-2 inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
						<Plus className="size-3.5" /> Add option
					</button>
				)}
			</div>

			<label className="mb-5 flex min-h-10 cursor-pointer items-center gap-2 text-xs text-white/65">
				<input type="checkbox" checked={multipleChoice} onChange={event => setMultipleChoice(event.target.checked)} className="size-4 accent-primary" />
				Allow multiple answers
			</label>

			{error && <p className="mb-3 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}

			<div className="flex justify-end gap-2 border-t border-white/5 pt-4">
				<button type="button" onClick={onClose} className="min-h-11 rounded-xl px-4 text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Cancel</button>
				<button type="button" onClick={() => void submit()} disabled={!canSubmit} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
					{!submitting && <Check className="size-4" />}
					{submitting ? "Creating…" : "Create poll"}
				</button>
			</div>
		</div>
		</div>
	);
});

export default PollComposer;
