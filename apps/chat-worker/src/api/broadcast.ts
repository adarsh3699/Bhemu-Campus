// ============================================================
// bCampus Chat Worker — DO Communication Helpers
// ============================================================
// All communication with the ChatRoomDO is centralized here.
// Mutation operations use this helper only after their database commit.

import type { Env } from "../types";
import type { BroadcastPayload } from "../chat/services/message.service";
import { metric } from "../lib/metrics";

function getStub(env: Env, roomId: string) {
	return env.CHAT_ROOM.get(env.CHAT_ROOM.idFromName(roomId));
}

/** Sends a realtime event. Must be called AFTER successful DB commit. */
export async function broadcastToRoom(
	env: Env,
	roomId: string,
	payload: BroadcastPayload,
): Promise<void> {
	const startedAt = Date.now();
	try {
		const res = await getStub(env, roomId).fetch(
			new Request("https://internal/broadcast", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ roomId, event: payload.event, data: payload.data }),
			}),
		);
		await res.text(); // ALWAYS consume response body to prevent hanging in CF Workers
		if (!res.ok) {
			metric("chat.ws.broadcast_failed", {
				roomId,
				event: payload.event,
				statusCode: res.status,
				durationMs: Date.now() - startedAt,
			});
			return;
		}
		metric("chat.ws.broadcast", {
			roomId,
			event: payload.event,
			statusCode: res.status,
			durationMs: Date.now() - startedAt,
		});
	} catch {
		// Non-fatal — DB committed, client will recover via pagination on reconnect
		metric("chat.ws.broadcast_failed", {
			roomId,
			event: payload.event,
			durationMs: Date.now() - startedAt,
		});
	}
}
