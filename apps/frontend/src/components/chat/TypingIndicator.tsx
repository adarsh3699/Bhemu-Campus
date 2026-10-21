"use client";

import { memo } from "react";
import type { ChatTypingUser } from "@/contexts/ChatContext";

interface Props {
	users: ChatTypingUser[];
}

const TypingIndicator = memo(function TypingIndicator({ users }: Props) {
	if (users.length === 0) return null;
	const visibleNames = users.slice(0, 2).map((user) => user.displayName).join(", ");
	const remaining = users.length - 2;
	const label = remaining > 0 ? `${visibleNames} and ${remaining} other${remaining === 1 ? "" : "s"} are typing…` : `${visibleNames} ${users.length === 1 ? "is" : "are"} typing…`;

	return (
		<div className="flex min-h-7 items-center gap-2 px-4 py-1 text-xs text-muted-foreground" aria-live="polite">
			<span className="inline-flex items-center gap-0.5" aria-hidden="true">
				<span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.2s]" />
				<span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.1s]" />
				<span className="size-1.5 animate-bounce rounded-full bg-primary" />
			</span>
			<span className="truncate">{label}</span>
		</div>
	);
});

export default TypingIndicator;
