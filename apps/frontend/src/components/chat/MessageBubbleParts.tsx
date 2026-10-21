"use client";

import { memo, useMemo, type MouseEventHandler, type ReactNode, type RefObject } from "react";
import { AlertCircle, Check, Clock, SmilePlus, Trash2 } from "lucide-react";
import {
	formatChatTime,
	getChatAuthorInitials,
	getChatAvatarIndex,
	messageTimestamp,
	extractWhatsAppLinks,
	parseWhatsAppText,
	QUICK_CHAT_REACTIONS,
	type ChatDisplayMessage,
	type ChatReactionSummary,
	type WhatsAppInlinePart,
	type WhatsAppTextBlock,
} from "@bhemu/shared";

export const AVATAR_COLORS = [
	"from-cyan-500 to-blue-600",
	"from-violet-500 to-fuchsia-600",
	"from-amber-500 to-orange-600",
	"from-emerald-500 to-teal-600",
	"from-rose-500 to-pink-600",
] as const;

interface MessageIdentityProps {
	authorName: string;
	authorUid: string;
	showIdentity: boolean;
}

export const MessageIdentity = memo(function MessageIdentity({
	authorName,
	authorUid,
	showIdentity,
}: MessageIdentityProps) {
	return (
		<div className="w-9 shrink-0 self-end">
			{showIdentity && (
				<div
					className={`flex size-9 select-none items-center justify-center rounded-full bg-gradient-to-br ${AVATAR_COLORS[getChatAvatarIndex(authorUid, AVATAR_COLORS.length)]} text-[11px] font-bold text-white ring-2 ring-[#09070b] shadow-lg shadow-black/30`}
					role="img"
					aria-label={`${authorName}'s avatar`}
				>
					{getChatAuthorInitials(authorName)}
				</div>
			)}
		</div>
	);
});

interface MessageRowProps {
	authorName: string;
	authorUid: string;
	showIdentity: boolean;
	isOwn: boolean;
	onContextMenu?: MouseEventHandler<HTMLElement>;
	onDoubleClick?: MouseEventHandler<HTMLElement>;
	children: ReactNode;
}

export const MessageRow = memo(function MessageRow({
	authorName,
	authorUid,
	showIdentity,
	isOwn,
	onContextMenu,
	onDoubleClick,
	children,
}: MessageRowProps) {
	return (
		<div
			onContextMenu={onContextMenu}
			onDoubleClick={onDoubleClick}
			className={`group flex w-full items-end gap-2.5 ${showIdentity ? "mt-3" : "mt-0.5"} ${isOwn ? "flex-row-reverse" : "flex-row"}`}
		>
			{!isOwn && (
				<MessageIdentity
					authorName={authorName}
					authorUid={authorUid}
					showIdentity={showIdentity}
				/>
			)}
			<div className={`relative flex max-w-[84%] flex-col sm:max-w-[72%] ${isOwn ? "items-end" : "items-start"}`}>
				{!isOwn && showIdentity && (
					<p className="mb-1 px-1 text-xs font-semibold tracking-tight text-sky-400">{authorName}</p>
				)}
				{children}
			</div>
		</div>
	);
});

export const DeletedMessage = memo(function DeletedMessage() {
	return (
		<div className="flex w-fit items-center gap-1.5 rounded-lg border border-white/10 bg-[#171717]/80 px-2.5 py-1.5 text-[12px] leading-4 text-white/55 shadow-sm">
			<Trash2 className="size-3.5 shrink-0 text-white/35" aria-hidden="true" />
			<span className="italic">Message deleted</span>
		</div>
	);
});

interface MessageMetaProps {
	message: ChatDisplayMessage;
	isOwn: boolean;
	isOptimistic: boolean;
	onRetry: (messageId: string) => void;
	className?: string;
}

export const MessageMeta = memo(function MessageMeta({
	message,
	isOwn,
	isOptimistic,
	onRetry,
	className = "",
}: MessageMetaProps) {
	return (
		<div className={`flex shrink-0 items-center justify-end gap-1 ${isOwn ? "text-white/80" : "text-white/45"} ${className}`}>
			{message.editedAt && <span className="text-[10px] opacity-70">edited</span>}
			{message.failed ? (
				<>
					<span className="text-[10px] font-medium text-red-300">Failed to send</span>
					<button
						onClick={() => onRetry(message.idempotencyKey || message.id)}
						className="ml-1 flex items-center gap-1 text-[10px] font-semibold text-red-400 transition-colors hover:text-red-300"
					>
						<AlertCircle className="size-3" />
						Retry
					</button>
				</>
			) : (
				<>
					<span className="text-[10px] font-medium tabular-nums">
						{formatChatTime(messageTimestamp(message))}
					</span>
					{isOptimistic ? (
						isOwn && <Clock className="size-[11px] opacity-70" aria-label="Sending" />
					) : (
						isOwn && <Check className="size-3" strokeWidth={3} aria-label="Sent" />
					)}
				</>
			)}
		</div>
	);
});

interface MessageTextProps {
	content: string;
	isPoll: boolean;
	isOwn: boolean;
	searchQuery?: string;
}

function renderHighlightedText(value: string, searchQuery: string | undefined, keyPrefix: string): ReactNode[] | string {
	const query = searchQuery?.trim();
	if (!query) return value;

	const normalizedValue = value.toLocaleLowerCase();
	const normalizedQuery = query.toLocaleLowerCase();
	const result: ReactNode[] = [];
	let cursor = 0;
	let matchIndex = normalizedValue.indexOf(normalizedQuery, cursor);
	let matchNumber = 0;

	while (matchIndex >= 0) {
		if (matchIndex > cursor) result.push(value.slice(cursor, matchIndex));
		result.push(
			<mark key={`${keyPrefix}-match-${matchNumber}`} className="rounded bg-amber-300 px-0.5 text-black">
				{value.slice(matchIndex, matchIndex + query.length)}
			</mark>,
		);
		cursor = matchIndex + query.length;
		matchNumber += 1;
		matchIndex = normalizedValue.indexOf(normalizedQuery, cursor);
	}

	if (cursor === 0) return value;
	if (cursor < value.length) result.push(value.slice(cursor));
	return result;
}

function renderWhatsAppInline(parts: WhatsAppInlinePart[], isOwn: boolean, keyPrefix: string, searchQuery?: string): ReactNode[] {
	return parts.map((part, index) => {
		const key = `${keyPrefix}-${index}`;
		switch (part.type) {
			case "bold":
				return <strong key={key}>{renderWhatsAppInline(part.children, isOwn, key, searchQuery)}</strong>;
			case "italic":
				return <em key={key}>{renderWhatsAppInline(part.children, isOwn, key, searchQuery)}</em>;
			case "strikethrough":
				return <del key={key}>{renderWhatsAppInline(part.children, isOwn, key, searchQuery)}</del>;
			case "monospace":
				return <code key={key} className="rounded bg-black/15 px-1 font-mono text-[0.92em]">{renderWhatsAppInline(part.children, isOwn, key, searchQuery)}</code>;
			case "link":
				return (
					<a
						key={key}
						href={part.url}
						target="_blank"
						rel="noreferrer"
						className={`underline transition-colors ${isOwn ? "text-white" : "text-sky-400 hover:text-sky-300"}`}
					>
						{renderHighlightedText(part.url, searchQuery, key)}
					</a>
				);
			default:
				return renderHighlightedText(part.text, searchQuery, key);
		}
	});
}

function renderWhatsAppBlock(block: WhatsAppTextBlock, isOwn: boolean, index: number, searchQuery?: string): ReactNode {
	const key = `whatsapp-block-${index}`;
	if (block.type === "code") {
		return <span key={key} className="block font-mono text-[0.92em] leading-5">{block.text || "\u00a0"}</span>;
	}

	const children = renderWhatsAppInline(block.children, isOwn, key, searchQuery);
	if (block.type === "bullet") {
		return (
			<span key={key} className="flex w-full gap-2">
				<span className="shrink-0" aria-hidden="true">•</span>
				<span className="min-w-0">{children}</span>
			</span>
		);
	}
	if (block.type === "numbered") {
		return (
			<span key={key} className="flex w-full gap-2">
				<span className="shrink-0 tabular-nums" aria-hidden="true">{block.number}.</span>
				<span className="min-w-0">{children}</span>
			</span>
		);
	}
	if (block.type === "quote") {
		return <span key={key} className="block border-l-2 border-current/40 pl-2 italic opacity-90">{children.length > 0 ? children : "\u00a0"}</span>;
	}
	return <span key={key} className="block min-h-[1.25em]">{children.length > 0 ? children : "\u00a0"}</span>;
}

export const MessageText = memo(function MessageText({ content, isPoll, isOwn, searchQuery }: MessageTextProps) {
	const blocks = parseWhatsAppText(content);
	const previewLink = extractWhatsAppLinks(content)[0] ?? null;
	return (
		<span className={isPoll ? "mb-1 block whitespace-pre-wrap text-[15px] font-semibold leading-5 tracking-[-0.01em]" : "whitespace-pre-wrap"}>
			{blocks.map((block, index) => renderWhatsAppBlock(block, isOwn, index, searchQuery))}
			{previewLink ? <LinkPreviewCard url={previewLink} isOwn={isOwn} /> : null}
		</span>
	);
});

function LinkPreviewCard({ url, isOwn }: { url: string; isOwn: boolean }) {
		const hostname = useMemo(() => {
			try {
				return new URL(url).hostname.replace(/^www\./, "");
			} catch {
				return url;
			}
		}, [url]);

		return (
			<a
				href={url}
				target="_blank"
				rel="noreferrer"
				aria-label={`Open link preview for ${hostname}`}
				className={`mt-2 block rounded-lg border px-3 py-2 no-underline transition-colors ${
					isOwn
						? "border-white/25 bg-black/15 hover:bg-black/25"
						: "border-white/10 bg-black/15 hover:border-primary/50 hover:bg-white/5"
				}`}
			>
				<span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-primary">Link preview</span>
				<span className="mt-0.5 block truncate text-xs font-semibold text-white/90">{hostname}</span>
				<span className="mt-0.5 block truncate text-[11px] text-white/55">{url}</span>
			</a>
		);
	}

type ReactionCounts = Array<[string, ChatReactionSummary]>;

interface ReactionSummaryProps {
	counts: ReactionCounts;
	messageId: string;
	isOwn: boolean;
	onReact: (messageId: string, emoji: string) => void;
	onUnreact: (messageId: string) => void;
}

export const ReactionSummary = memo(function ReactionSummary({
	counts,
	messageId,
	isOwn,
	onReact,
	onUnreact,
}: ReactionSummaryProps) {
	return (
		<div className="flex flex-wrap gap-1.5">
			{counts.map(([emoji, { count, hasReacted }]) => (
				<button
					key={emoji}
					onClick={() => (hasReacted ? onUnreact(messageId) : onReact(messageId, emoji))}
					className={`flex items-center gap-1.5 rounded-full border pl-1.5 pr-2.5 py-0.5 text-[12px] font-medium transition-colors ${
						hasReacted
							? isOwn
								? "border-white/20 bg-white/30 text-white"
								: "border-sky-500/30 bg-sky-500/20 text-sky-400"
							: isOwn
								? "border-black/10 bg-black/20 text-white/90 hover:bg-black/30"
								: "border-white/5 bg-white/10 text-white/80 hover:bg-white/20"
					}`}
					title={hasReacted ? "Remove reaction" : "React"}
				>
					<span className="text-[16px] leading-none">{emoji}</span>
					<span className="pt-px">{count}</span>
				</button>
			))}
		</div>
	);
});

interface MessageActionsProps {
	message: ChatDisplayMessage;
	currentUserId: string | null;
	isOwn: boolean;
	isVisible: boolean;
	menuOpen: boolean;
	reactionTrayOpen: boolean;
	reactionRef: RefObject<HTMLDivElement | null>;
	onToggleReactionTray: () => void;
	onReact: (messageId: string, emoji: string) => void;
	onUnreact: (messageId: string) => void;
}

export const MessageActions = memo(function MessageActions({
	message,
	currentUserId,
	isOwn,
	isVisible,
	menuOpen,
	reactionTrayOpen,
	reactionRef,
	onToggleReactionTray,
	onReact,
	onUnreact,
}: MessageActionsProps) {
	if (!isVisible) return null;

	return (
		<div
			className={`absolute bottom-0 ${
				isOwn ? "left-0 -translate-x-full pr-1.5" : "right-0 translate-x-full pl-1.5"
			} flex items-center gap-1 transition-opacity duration-200 ${
				menuOpen || reactionTrayOpen
					? "opacity-100"
					: "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
			}`}
		>
			<div ref={reactionRef} className="relative">
				<button
					type="button"
					onClick={onToggleReactionTray}
					className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-[#1a1f20] text-muted-foreground shadow-sm transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
					title="React"
					aria-label="React to message"
				>
					<SmilePlus className="size-4" />
				</button>
				{reactionTrayOpen && (
					<div
						className={`absolute bottom-full z-50 mb-2 flex items-center gap-1 rounded-full border border-white/10 bg-[#121212]/95 px-2 py-1.5 shadow-xl shadow-black/50 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 ${isOwn ? "right-0" : "left-0"}`}
						role="menu"
					>
						{QUICK_CHAT_REACTIONS.map((emoji) => (
							<button
								key={emoji}
								type="button"
								onClick={() => {
									onToggleReactionTray();
									const alreadyReacted = message.reactions?.some(
										(reaction) => reaction.userUid === currentUserId && reaction.emoji === emoji,
									);
									if (alreadyReacted) onUnreact(message.id);
									else onReact(message.id, emoji);
								}}
								className="flex size-8 items-center justify-center rounded-full text-[17px] transition-transform hover:bg-white/15 hover:scale-110 active:scale-95"
								title={emoji}
								role="menuitem"
							>
								{emoji}
							</button>
						))}
					</div>
				)}
			</div>
		</div>
	);
});
