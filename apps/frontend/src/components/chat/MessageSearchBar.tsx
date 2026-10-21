"use client";

import { Loader2, Search, X } from "lucide-react";

interface Props {
	query: string;
	resultCount: number;
	activeIndex: number;
	loading: boolean;
	onChange: (query: string) => void;
	onClose: () => void;
	onPrevious: () => void;
	onNext: () => void;
}

export default function MessageSearchBar({ query, resultCount, activeIndex, loading, onChange, onClose, onPrevious, onNext }: Props) {
	const resultLabel = loading ? "Searching…" : resultCount > 0 ? `${activeIndex + 1} of ${resultCount}` : query.trim() ? "No matches" : "Search messages";

	return (
		<div className="border-b border-white/10 bg-[#0b0d0f] px-3 py-2 sm:px-5">
			<div className="mx-auto flex max-w-4xl items-center gap-2">
				<div className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-white/10 bg-[#15171a] px-3 transition-colors focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20">
					<Search className="size-4 shrink-0 text-muted-foreground" />
					<input
						autoFocus
						value={query}
						onChange={(event) => onChange(event.target.value)}
						placeholder="Search messages"
						className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
					/>
					{loading ? <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-label="Searching" /> : null}
				</div>
				<button type="button" onClick={onPrevious} disabled={resultCount < 2} aria-label="Previous search result" className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">↑</button>
				<button type="button" onClick={onNext} disabled={resultCount < 2} aria-label="Next search result" className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">↓</button>
				<button type="button" onClick={onClose} aria-label="Close message search" className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
					<X className="size-4" />
				</button>
			</div>
			<div className="mx-auto flex max-w-4xl justify-between px-2 pt-1 text-[11px] text-muted-foreground">
				<span>{resultLabel}</span>
				{resultCount > 0 ? <span>Use ↑/↓ to navigate</span> : null}
			</div>
		</div>
	);
}
