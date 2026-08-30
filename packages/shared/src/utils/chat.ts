import type { AppRole, ChatDisplayMessage, ChatMessage, ChatReaction, PinDuration, PollOption, RoomPin } from "../types/chat";
import { CHAT_OPTIMISTIC_PREFIX, CHAT_POLL_VALIDATION_MESSAGES, MAX_CHAT_POLL_OPTIONS, MAX_CHAT_POLL_OPTION_LENGTH, MAX_CHAT_POLL_QUESTION_LENGTH, MIN_CHAT_POLL_OPTIONS } from "../constants/chat";
import { PIN_DURATION_MS } from "../types/chat";

export type ChatTimestampLike = string | number | Date | Record<string, unknown> | null | undefined;

export interface ChatReactionSummary {
	count: number;
	hasReacted: boolean;
}

export const CHAT_ROLE_LEVEL: Readonly<Record<AppRole, number>> = { STUDENT: 0, MODERATOR: 1, ADMIN: 2 };

export function canPerformChatAction(role: AppRole | null, requiredRole: AppRole | undefined): boolean {
	return Boolean(role && requiredRole && CHAT_ROLE_LEVEL[role] >= CHAT_ROLE_LEVEL[requiredRole]);
}

export function getChatPinExpiry(duration: PinDuration, now = Date.now()): string | null {
	return duration === "forever" ? null : new Date(now + PIN_DURATION_MS[duration]).toISOString();
}

export interface ChatPollDraftValidation {
	question: string;
	options: string[];
	error: string | null;
}

export function normalizeChatPollOptions(options: readonly string[]): string[] {
	return options.map((option) => option.trim()).filter(Boolean);
}

export function validateChatPollDraft(question: string, options: readonly string[]): ChatPollDraftValidation {
	const normalizedQuestion = question.trim();
	const normalizedOptions = normalizeChatPollOptions(options);
	let error: string | null = null;

	if (!normalizedQuestion) error = CHAT_POLL_VALIDATION_MESSAGES.questionRequired;
	else if (normalizedQuestion.length > MAX_CHAT_POLL_QUESTION_LENGTH) error = CHAT_POLL_VALIDATION_MESSAGES.questionTooLong;
	else if (normalizedOptions.length < MIN_CHAT_POLL_OPTIONS || normalizedOptions.length > MAX_CHAT_POLL_OPTIONS) error = CHAT_POLL_VALIDATION_MESSAGES.optionCount;
	else if (normalizedOptions.some((option) => option.length > MAX_CHAT_POLL_OPTION_LENGTH)) error = CHAT_POLL_VALIDATION_MESSAGES.optionTooLong;
	else if (new Set(normalizedOptions.map((option) => option.toLocaleLowerCase())).size !== normalizedOptions.length) error = CHAT_POLL_VALIDATION_MESSAGES.duplicateOptions;

	return { question: normalizedQuestion, options: normalizedOptions, error };
}

export function getChatPollTotalVotes(options: ReadonlyArray<Pick<PollOption, "voteCount">>): number {
	return options.reduce((total, option) => total + option.voteCount, 0);
}

export function getChatPollOptionPercentage(option: Pick<PollOption, "voteCount">, totalVotes: number): number {
	return totalVotes > 0 ? Math.round((option.voteCount / totalVotes) * 100) : 0;
}

export function toggleChatPollOption(selectedOptionIds: readonly string[], optionId: string, multipleChoice: boolean): string[] {
	if (!multipleChoice) return [optionId];
	return selectedOptionIds.includes(optionId)
		? selectedOptionIds.filter((id) => id !== optionId)
		: [...selectedOptionIds, optionId];
}

export function isDeletedChatAnnouncement(message: Pick<ChatMessage, "type" | "visibility">): boolean {
	return message.type === "ANNOUNCEMENT" && message.visibility === "DELETED";
}

export function removeChatPinForMessage(pins: readonly RoomPin[], messageId: string): RoomPin[] {
	return pins.filter((pin) => pin.messageId !== messageId);
}

function epochToDate(value: number): Date | null {
	const milliseconds = Math.abs(value) < 1_000_000_000_000 ? value * 1_000 : value;
	const date = new Date(milliseconds);
	return Number.isNaN(date.getTime()) ? null : date;
}

/** Parses API, PostgreSQL, Unix, and Firestore-style timestamps consistently. */
export function parseChatTimestamp(value: ChatTimestampLike): Date | null {
	if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
	if (typeof value === "number") return Number.isFinite(value) ? epochToDate(value) : null;

	if (value && typeof value === "object") {
		const timestamp = value as {
			seconds?: unknown;
			nanoseconds?: unknown;
			_seconds?: unknown;
			_nanoseconds?: unknown;
			toDate?: unknown;
		};
		if (typeof timestamp.toDate === "function") return parseChatTimestamp(timestamp.toDate());
		const seconds = timestamp.seconds ?? timestamp._seconds;
		if (typeof seconds === "number" && Number.isFinite(seconds)) {
			const nanosValue = timestamp.nanoseconds ?? timestamp._nanoseconds;
			const nanos = typeof nanosValue === "number" ? nanosValue : 0;
			return epochToDate(seconds + nanos / 1_000_000_000);
		}
		return null;
	}

	if (typeof value !== "string") return null;
	const raw = value.trim();
	if (!raw) return null;
	if (/^-?\d+(?:\.\d+)?$/.test(raw)) return epochToDate(Number(raw));

	// Hermes does not consistently parse PostgreSQL's `YYYY-MM-DD HH:mm:ss+00`
	// form, while browsers do. Convert it to an ISO-compatible representation.
	const normalized = raw.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00");
	const iso = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized) ? normalized : `${normalized}Z`;
	const date = new Date(iso);
	if (!Number.isNaN(date.getTime())) return date;

	const fallback = new Date(raw);
	return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function messageTimestamp(message: Pick<ChatMessage, "createdAt" | "updatedAt">): ChatTimestampLike {
	return parseChatTimestamp(message.createdAt) ? message.createdAt : message.updatedAt;
}

export function formatChatTime(value: ChatTimestampLike): string {
	const date = parseChatTimestamp(value);
	if (!date) return "—";
	return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export function formatChatDate(value: ChatTimestampLike): string {
	const date = parseChatTimestamp(value);
	if (!date) return "";
	return date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
}

export function chatDateKey(value: ChatTimestampLike): string {
	const date = parseChatTimestamp(value);
	return date ? date.toDateString() : String(value ?? "");
}

export function getChatMessageTime(value: ChatTimestampLike): number {
	return parseChatTimestamp(value)?.getTime() ?? 0;
}

export function shouldShowChatDateSeparator(message: ChatMessage, olderMessage?: ChatMessage): boolean {
	return !olderMessage || chatDateKey(messageTimestamp(message)) !== chatDateKey(messageTimestamp(olderMessage));
}

export function startsChatAuthorGroup(message: ChatMessage, olderMessage?: ChatMessage): boolean {
	if (!olderMessage || olderMessage.authorUid !== message.authorUid) return true;
	return getChatMessageTime(messageTimestamp(message)) - getChatMessageTime(messageTimestamp(olderMessage)) > 5 * 60 * 1_000;
}

export function normalizeChatDisplayName(name: string | null | undefined): string {
	return name?.replace(/\s+/g, " ").trim() || "Student";
}

export function getChatAuthorInitials(name: string): string {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0])
		.join("")
		.toLocaleUpperCase() || "S";
}

export function getChatAvatarIndex(uid: string, paletteSize: number): number {
	if (paletteSize <= 0) return 0;
	let hash = 0;
	for (let index = 0; index < uid.length; index += 1) hash = (hash * 31 + uid.charCodeAt(index)) | 0;
	return Math.abs(hash) % paletteSize;
}

export function summarizeChatReactions(
	reactions: ChatReaction[] | undefined,
	currentUserId: string | null,
): Array<[string, ChatReactionSummary]> {
	if (!reactions?.length) return [];
	const counts = new Map<string, ChatReactionSummary>();
	for (const reaction of reactions) {
		const current = counts.get(reaction.emoji) ?? { count: 0, hasReacted: false };
		current.count += 1;
		current.hasReacted ||= reaction.userUid === currentUserId;
		counts.set(reaction.emoji, current);
	}
	return Array.from(counts.entries()).sort((a, b) => b[1].count - a[1].count);
}

export function createChatClientMessageId(): string {
	const randomId = typeof globalThis.crypto?.randomUUID === "function"
		? globalThis.crypto.randomUUID()
		: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
	return `${CHAT_OPTIMISTIC_PREFIX}${randomId}`;
}

export function sortChatMessages<T extends ChatDisplayMessage>(messages: T[]): T[] {
	return [...messages].sort((a, b) => {
		const aSequence = Number(a.roomSeq);
		const bSequence = Number(b.roomSeq);
		const hasSequences = Number.isSafeInteger(aSequence) && aSequence > 0 && Number.isSafeInteger(bSequence) && bSequence > 0;
		if (hasSequences && aSequence !== bSequence) return aSequence - bSequence;
		return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
	});
}

/** Merges a server snapshot without dropping optimistic or live messages. */
export function mergeChatMessages<T extends ChatDisplayMessage>(current: T[], incoming: T[]): T[] {
	const remaining = new Map(incoming.map((message) => [message.id, message]));
	const byOptimisticId = new Map(
		incoming
			.filter((message) => Boolean(message.idempotencyKey))
			.map((message) => [message.idempotencyKey as string, message]),
	);
	const merged: T[] = [];

	for (const existing of current) {
		const sameMessage = remaining.get(existing.id);
		if (sameMessage) {
			merged.push({ ...existing, ...sameMessage });
			remaining.delete(sameMessage.id);
			continue;
		}

		const confirmedOptimistic = byOptimisticId.get(existing.id);
		if (confirmedOptimistic) {
			merged.push({ ...existing, ...confirmedOptimistic, idempotencyKey: existing.id });
			remaining.delete(confirmedOptimistic.id);
			continue;
		}

		merged.push(existing);
	}

	return sortChatMessages([...merged, ...remaining.values()]);
}
