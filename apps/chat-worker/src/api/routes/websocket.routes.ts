// ============================================================
// bCampus Chat Worker — WebSocket Upgrade Route
// GET /api/v1/ws/:roomId  (Upgrade: websocket)
// ============================================================
// Authentication happens here in the Worker BEFORE handing off
// to the Durable Object. The DO trusts the X-User-Id header.

import { Hono } from "hono";
import type { Env } from "../../types";
import { resolveSession, extractBearerToken } from "../../auth/session";
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
	try {
		user = await resolveSession(token, c.env);
	} catch (err) {
		return errorResponse(c, err);
	}

	const roomId = c.req.param("roomId");

	// Validate room membership before opening socket
	try {
		const db = createDb(c.env.DATABASE_URL);
		const roomService = new RoomService(db);
		await roomService.requireMembership(roomId, user.uid);
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
				"X-Room-Id": roomId,
			},
		}),
	);
});

export { router as websocketRoutes };
