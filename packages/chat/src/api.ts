// ============================================================
// @bhemu/chat — REST API Client
// ============================================================
// Platform-neutral — uses only the global `fetch` API.
// Works in browser (web), React Native, and Cloudflare Workers.

import type {
	ChatRoom,
	ChatMessage,
	ChatReaction,
	ChatPoll,
	RoomPin,
	PaginatedResult,
	ApiResponse,
	AppRole,
	ModerationStatus,
	ReportReason,
	PinDuration,
} from "@bhemu/shared";
import { ChatApiError } from "./errors";
import { CHAT_API_BASE } from "./constants";

export interface ChatSession {
	token: string;
	expiresAt: string;
	role: AppRole;
	moderation: {
		status: ModerationStatus;
		expiresAt: string | null;
	};
}

// ---- Core fetch helper ----

async function chatFetch<T>(
	token: string,
	path: string,
	options?: RequestInit,
	baseUrl = CHAT_API_BASE,
): Promise<T> {
	const res = await fetch(`${baseUrl}${path}`, {
		...options,
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
			...(options?.headers ?? {}),
		},
	});

	// 204 No Content — return null
	if (res.status === 204) {
		return null as T;
	}

	const body = (await res.json()) as ApiResponse<T>;

	if (!body.success) {
		throw new ChatApiError(body.error.code, body.error.message, res.status);
	}

	return body.data;
}

// ---- Authentication ----

/** Exchanges a Firebase token for a short-lived local chat session. */
export async function apiCreateChatSession(
	firebaseToken: string,
	baseUrl?: string,
): Promise<ChatSession> {
	return chatFetch<ChatSession>(
		firebaseToken,
		"/api/v1/session",
		{ method: "POST" },
		baseUrl,
	);
}

// ---- Rooms ----

export async function apiGetUniversityRoom(
	token: string,
	baseUrl?: string,
): Promise<ChatRoom> {
	const data = await chatFetch<{ room: ChatRoom }>(token, "/api/v1/rooms/university", undefined, baseUrl);
	return data.room;
}

export async function apiGetBatchmateRoom(
	token: string,
	groupKey: string,
	baseUrl?: string,
): Promise<ChatRoom> {
	const data = await chatFetch<{ room: ChatRoom }>(
		token,
		`/api/v1/rooms/me?groupKey=${encodeURIComponent(groupKey)}`,
		undefined,
		baseUrl,
	);
	return data.room;
}

export async function apiGetAllRooms(
	token: string,
	baseUrl?: string,
): Promise<ChatRoom[]> {
	const data = await chatFetch<{ rooms: ChatRoom[] }>(token, "/api/v1/rooms", undefined, baseUrl);
	return data.rooms;
}

export async function apiGetRoomPins(
	token: string,
	roomId: string,
	baseUrl?: string,
): Promise<RoomPin[]> {
	const data = await chatFetch<{ pins: RoomPin[] }>(
		token,
		`/api/v1/rooms/${roomId}/pins`,
		undefined,
		baseUrl,
	);
	return data.pins;
}

// ---- Messages ----

export async function apiGetMessages(
	token: string,
	roomId: string,
	cursor?: string,
	limit = 50,
	baseUrl?: string,
): Promise<PaginatedResult<ChatMessage>> {
	const params = new URLSearchParams({ roomId, limit: String(limit) });
	if (cursor) params.set("cursor", cursor);
	return chatFetch<PaginatedResult<ChatMessage>>(
		token,
		`/api/v1/messages?${params.toString()}`,
		undefined,
		baseUrl,
	);
}

export interface ChatRoomEvent {
	roomId: string;
	roomSeq: number;
	eventId: string;
	eventType: string;
	aggregateId: string | null;
	version: number;
	payload: { version?: number; message?: ChatMessage };
	createdAt: string;
}

export interface ChatRoomEventPage {
	events: ChatRoomEvent[];
	highWater: number;
	hasMore: boolean;
	resyncRequired?: boolean;
}

export async function apiGetRoomEvents(
	token: string,
	roomId: string,
	after = 0,
	limit = 100,
	baseUrl?: string,
): Promise<ChatRoomEventPage> {
	const params = new URLSearchParams({ after: String(after), limit: String(limit) });
	return chatFetch<ChatRoomEventPage>(
		token,
		`/api/v1/rooms/${roomId}/events?${params.toString()}`,
		undefined,
		baseUrl,
	);
}

export async function apiEditMessage(
	token: string,
	messageId: string,
	content: string,
	baseUrl?: string,
): Promise<ChatMessage> {
	const data = await chatFetch<{ message: ChatMessage }>(
		token,
		`/api/v1/messages/${messageId}`,
		{ method: "PATCH", body: JSON.stringify({ content }) },
		baseUrl,
	);
	return data.message;
}

export async function apiDeleteMessage(
	token: string,
	messageId: string,
	baseUrl?: string,
): Promise<void> {
	await chatFetch<null>(
		token,
		`/api/v1/messages/${messageId}`,
		{ method: "DELETE" },
		baseUrl,
	);
}

// ---- Reactions ----

export async function apiSetReaction(
	token: string,
	messageId: string,
	emoji: string,
	baseUrl?: string,
): Promise<ChatReaction> {
	const data = await chatFetch<{ reaction: ChatReaction }>(
		token,
		"/api/v1/reactions",
		{ method: "POST", body: JSON.stringify({ messageId, emoji }) },
		baseUrl,
	);
	return data.reaction;
}

export async function apiRemoveReaction(
	token: string,
	messageId: string,
	baseUrl?: string,
): Promise<void> {
	await chatFetch<null>(
		token,
		`/api/v1/reactions/${messageId}`,
		{ method: "DELETE" },
		baseUrl,
	);
}

// ---- Reports ----

export async function apiReportMessage(
	token: string,
	messageId: string,
	reason: ReportReason,
	description?: string,
	baseUrl?: string,
): Promise<void> {
	await chatFetch<unknown>(
		token,
		"/api/v1/reports",
		{
			method: "POST",
			body: JSON.stringify({ messageId, reason, description: description ?? null }),
		},
		baseUrl,
	);
}

// ---- Polls ----

export async function apiCreatePoll(
	token: string,
	roomId: string,
	content: string,
	options: string[],
	multipleChoice = false,
	closesAt?: string | null,
	baseUrl?: string,
): Promise<ChatPoll> {
	const data = await chatFetch<{ poll: ChatPoll }>(
		token,
		"/api/v1/polls",
		{
			method: "POST",
			body: JSON.stringify({ roomId, content, options, multipleChoice, closesAt: closesAt ?? null }),
		},
		baseUrl,
	);
	return data.poll;
}

export async function apiVotePoll(
	token: string,
	pollId: string,
	optionIds: string[],
	baseUrl?: string,
): Promise<ChatPoll> {
	const data = await chatFetch<{ poll: ChatPoll }>(
		token,
		`/api/v1/polls/${pollId}/vote`,
		{ method: "POST", body: JSON.stringify({ optionIds }) },
		baseUrl,
	);
	return data.poll;
}

export async function apiClosePoll(
	token: string,
	pollId: string,
	baseUrl?: string,
): Promise<ChatPoll> {
	const data = await chatFetch<{ poll: ChatPoll }>(
		token,
		`/api/v1/polls/${pollId}/close`,
		{ method: "PATCH" },
		baseUrl,
	);
	return data.poll;
}

// ---- Pins ----

export async function apiPinMessage(
	token: string,
	roomId: string,
	messageId: string,
	duration: PinDuration = "forever",
	baseUrl?: string,
): Promise<void> {
	await chatFetch<unknown>(
		token,
		`/api/v1/moderation/pin/${roomId}/${messageId}`,
		{ method: "POST", body: JSON.stringify({ duration }) },
		baseUrl,
	);
}

export async function apiUnpinMessage(
	token: string,
	roomId: string,
	messageId: string,
	baseUrl?: string,
): Promise<void> {
	await chatFetch<null>(
		token,
		`/api/v1/moderation/pin/${roomId}/${messageId}`,
		{ method: "DELETE" },
		baseUrl,
	);
}

// ---- Moderation ----

export async function apiWarnUser(
	token: string,
	targetUserUid: string,
	reason?: string,
	messageId?: string,
	baseUrl?: string,
): Promise<void> {
	await chatFetch<unknown>(
		token,
		"/api/v1/moderation/warn",
		{ method: "POST", body: JSON.stringify({ targetUserUid, reason: reason ?? null, messageId }) },
		baseUrl,
	);
}

export async function apiSuspendUser(
	token: string,
	targetUserUid: string,
	expiresAt: string,
	reason?: string,
	baseUrl?: string,
): Promise<void> {
	await chatFetch<unknown>(
		token,
		"/api/v1/moderation/suspend",
		{ method: "POST", body: JSON.stringify({ targetUserUid, expiresAt, reason: reason ?? null }) },
		baseUrl,
	);
}

export async function apiBanUser(
	token: string,
	targetUserUid: string,
	reason?: string,
	baseUrl?: string,
): Promise<void> {
	await chatFetch<unknown>(
		token,
		"/api/v1/moderation/ban",
		{ method: "POST", body: JSON.stringify({ targetUserUid, reason: reason ?? null }) },
		baseUrl,
	);
}

export async function apiModerationDeleteMessage(
	token: string,
	messageId: string,
	reason?: string,
	baseUrl?: string,
): Promise<void> {
	await chatFetch<unknown>(
		token,
		`/api/v1/moderation/delete-message/${messageId}`,
		{ method: "POST", body: JSON.stringify({ reason: reason ?? null }) },
		baseUrl,
	);
}
