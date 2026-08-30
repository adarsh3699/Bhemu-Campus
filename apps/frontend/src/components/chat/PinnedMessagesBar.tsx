"use client";

import { memo, useState } from "react";
import { ChevronLeft, ChevronRight, Pin, X } from "lucide-react";
import type { ChatDisplayMessage, RoomPin } from "@bhemu/shared";

interface PinnedMessagesBarProps {
	pins: RoomPin[];
	messages: ChatDisplayMessage[];
	onSelect: (messageId: string) => void;
	onUnpin: (messageId: string) => Promise<void>;
	canManage: boolean;
}

const PinnedMessagesBar = memo(function PinnedMessagesBar({
	pins,
	messages,
	onSelect,
	onUnpin,
	canManage,
}: PinnedMessagesBarProps) {
	const [activeIndex, setActiveIndex] = useState(0);

	const messageMap = new Map(messages.map((message) => [message.id, message]));
	const visiblePins = pins.filter((pin) => {
		const message = messageMap.get(pin.messageId);
		return !(message?.type === "ANNOUNCEMENT" && message.visibility === "DELETED");
	});

	if (visiblePins.length === 0) return null;

	const safeIndex = Math.min(activeIndex, visiblePins.length - 1);
	const pin = visiblePins[safeIndex]!;
	const message = messageMap.get(pin.messageId);
	const preview = message?.visibility === "DELETED" ? "Message deleted" : message?.content || "Pinned message";

	return (
		<div className="shrink-0 border-b border-white/10 bg-[#101617]" role="region" aria-label="Pinned message">
			<div className="flex min-h-12 w-full items-center px-3 py-1.5 sm:px-5">
				<button
					type="button"
					onClick={() => onSelect(pin.messageId)}
					className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
					aria-label={`Open pinned message: ${preview}`}
				>
					<span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
						<Pin className="size-3.5" aria-hidden="true" />
					</span>
					<span className="min-w-0 flex-1">
						<span className="block text-[9px] font-semibold uppercase tracking-[0.14em] text-primary">
							Pinned message
						</span>
						<span className="block truncate text-[13px] leading-4 text-white/80">{preview}</span>
					</span>
				</button>

				<div className="ml-3 flex shrink-0 items-center gap-1">
					{visiblePins.length > 1 && (
						<>
							<span className="mr-1 hidden text-[10px] tabular-nums text-white/35 sm:inline">
								{safeIndex + 1}/{visiblePins.length}
							</span>
							<button
								type="button"
								onClick={() =>
									setActiveIndex((index) => Math.max(0, Math.min(index, visiblePins.length - 1) - 1))
								}
								disabled={safeIndex === 0}
								className="flex size-7 items-center justify-center rounded-full text-white/45 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
								aria-label="Previous pinned message"
							>
								<ChevronLeft className="size-4" />
							</button>
							<button
								type="button"
								onClick={() => setActiveIndex((index) => Math.min(visiblePins.length - 1, index + 1))}
								disabled={safeIndex === visiblePins.length - 1}
								className="flex size-7 items-center justify-center rounded-full text-white/45 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
								aria-label="Next pinned message"
							>
								<ChevronRight className="size-4" />
							</button>
						</>
					)}
					{canManage && (
						<button
							type="button"
							onClick={() => void onUnpin(pin.messageId)}
							className="flex size-7 items-center justify-center rounded-full text-white/35 transition-colors hover:bg-red-500/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
							aria-label="Unpin message"
						>
							<X className="size-4" />
						</button>
					)}
				</div>
			</div>
		</div>
	);
});

export default PinnedMessagesBar;
