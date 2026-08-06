// ============================================================
// bCampus Chat Worker — DO Communication Helpers
// ============================================================
// All communication with the ChatRoomDO is centralized here.
// Three operations:
//   broadcastToRoom   — send event after DB commit
//   checkRateLimit    — check per-user message rate limit
//   checkIdempotency  — look up existing messageId by key
//   recordIdempotency — store new messageId against key

import type { Env } from "../types";
import type { BroadcastPayload } from "../chat/services/message.service";
import { Errors } from "../lib/errors";

function getStub(env: Env, roomId: string) {
	return env.CHAT_ROOM.get(env.CHAT_ROOM.idFromName(roomId));
}

/** Sends a realtime event. Must be called AFTER successful DB commit. */
export async function broadcastToRoom(
	env: Env,
	roomId: string,
	payload: BroadcastPayload,
): Promise<void> {
	try {
		await getStub(env, roomId).fetch(
			new Request("https://internal/broadcast", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ roomId, event: payload.event, data: payload.data }),
			}),
		);
	} catch {
		// Non-fatal — DB committed, client will recover via pagination on reconnect
	}
}

/**
 * Checks per-user rate limit in the DO.
 * Throws AppError(RATE_LIMITED) if the bucket is exhausted.
 */
export async function checkRateLimit(env: Env, roomId: string, uid: string): Promise<void> {
	try {
		const res = await getStub(env, roomId).fetch(
			new Request("https://internal/ratelimit/check", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ uid }),
			}),
		);
		if (res.status === 429) throw Errors.rateLimited();
	} catch (err) {
		if (err instanceof Error && err.message === "RATE_LIMITED") throw err;
		// DO unreachable — fail open (don't block the user)
	}
}

/**
 * Looks up an idempotency key in the DO.
 * Returns the existing messageId if already processed, else null.
 */
export async function checkIdempotency(
	env: Env,
	roomId: string,
	key: string,
): Promise<string | null> {
	try {
		const res = await getStub(env, roomId).fetch(
			new Request("https://internal/idempotency/check", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ roomId, key }),
			}),
		);
		const body = await res.json<{ messageId: string | null }>();
		return body.messageId;
	} catch {
		return null; // fail open
	}
}

/** Records a new messageId against an idempotency key. */
export async function recordIdempotency(
	env: Env,
	roomId: string,
	key: string,
	messageId: string,
): Promise<void> {
	try {
		await getStub(env, roomId).fetch(
			new Request("https://internal/idempotency/set", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ roomId, key, messageId }),
			}),
		);
	} catch {
		// Non-fatal
	}
}
