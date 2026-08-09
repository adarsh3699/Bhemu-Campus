// ============================================================
// bCampus Chat Worker — WebSocket Upgrade Route
// GET /api/v1/ws/:roomId  (Upgrade: websocket)
// ============================================================
// Authentication happens here in the Worker BEFORE handing off
// to the Durable Object. The DO trusts the X-User-Id header.

import { Hono } from "hono";
import type { Env } from "../../types";
import { resolveRequestSession, extractBearerToken } from "../../auth/session";
import { RoomService } from "../../chat/services/room.service";
import { createDb } from "../../db/drizzle";
import { Errors } from "../../lib/errors";
import { errorResponse } from "../../lib/response";

const router = new Hono<{ Bindings: Env }>();

router.get("/:roomId", async (c) => {
	if (c.req.header("Upgrade") !== "websocket") {
		return c.text("Expected Upgrade: websocket", 426);
	}

	// Token can come from query param (WS clients can't send headers) or Authorization header
	const token =
		c.req.query("token") ?? extractBearerToken(c.req.header("Authorization") ?? null);

	if (!token) {
		return errorResponse(c, Errors.missingToken());
	}

	let user;
	let room;
	try {
		user = await resolveRequestSession(token, c.env);
	} catch (err) {
		return errorResponse(c, err);
	}

	const roomId = c.req.param("roomId");

	// Validate room membership before opening socket
	try {
		const db = createDb(c.env.DATABASE_URL);
		const roomService = new RoomService(db);
		room = await roomService.requireMembership(roomId, user.uid);
	} catch (err) {
		return errorResponse(c, err);
	}

	// Forward to the correct Durable Object
	const doId = c.env.CHAT_ROOM.idFromName(roomId);
	const stub = c.env.CHAT_ROOM.get(doId);

	return stub.fetch(
		new Request(c.req.url, {
			headers: {
				Upgrade: "websocket",
				"X-User-Id": user.uid,
				"X-User-Role": user.role,
				// Header values must remain ASCII-safe while preserving Unicode names.
				"X-User-Display-Name": encodeURIComponent(user.displayName),
				"X-User-Moderation-Status": user.moderation.status,
				"X-User-Moderation-Expires-At": user.moderation.expiresAt ?? "",
				// Chat sessions are five minutes; command sockets must refresh by
				// reconnecting before the same expiry window.
				"X-Chat-Auth-Expires-At": String(Date.now() + 5 * 60 * 1000),
				"X-Room-Id": roomId,
				// The Worker has already performed membership + policy loading for
				// this socket lease. Public-room sends can reuse this snapshot.
				"X-Room-Visibility": room.visibility,
				"X-Room-Policy": JSON.stringify(room.policy),
			},
		}),
	);
});

export { router as websocketRoutes };
