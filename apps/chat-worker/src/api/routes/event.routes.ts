// ============================================================
// bCampus Chat Worker — Room event replay route
// GET /api/v1/rooms/:roomId/events?after=123&limit=100
// ============================================================

import { Hono } from "hono";
import type { Env } from "../../types";
import { authMiddleware } from "../middleware/auth.middleware";
import { validateQuery } from "../middleware/validate";
import { ListRoomEventsSchema } from "../validators/message.validator";
import { RoomEventRepository } from "../../chat/repositories/room-event.repository";
import { RoomService } from "../../chat/services/room.service";
import { createDb } from "../../db/drizzle";
import { Errors } from "../../lib/errors";
import { errorResponse, ok } from "../../lib/response";
import { metric } from "../../lib/metrics";

const router = new Hono<{ Bindings: Env }>();
router.use("*", authMiddleware);

router.get("/:roomId/events", async (c) => {
	const startedAt = Date.now();
	try {
		const roomId = c.req.param("roomId");
		if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(roomId)) {
			throw Errors.validationError("roomId must be a valid UUID.");
		}
		const query = validateQuery(ListRoomEventsSchema, c.req.query());
		const user = c.get("user");
		const db = createDb(c.env.DATABASE_URL);
		await new RoomService(db).requireMembership(roomId, user.uid);
		const result = await new RoomEventRepository(db).listAfter(
			roomId,
			query.after,
			query.limit,
		);
		metric("chat.room.events_replayed", {
			roomId,
			after: query.after,
			eventCount: result.events.length,
			highWater: result.highWater,
			durationMs: Date.now() - startedAt,
		});
		return ok(c, result);
	} catch (err) {
		metric("chat.room.event_replay_failed", {
			roomId: c.req.param("roomId"),
			durationMs: Date.now() - startedAt,
		});
		return errorResponse(c, err);
	}
});

export { router as eventRoutes };
