// ============================================================
// bCampus Chat Worker — Room Routes
//
// GET /api/v1/rooms           — list all rooms
// GET /api/v1/rooms/me        — resolve caller's batchmate room by groupKey
// GET /api/v1/rooms/:roomId   — get single room
// GET /api/v1/rooms/:roomId/pins
// ============================================================

import { Hono } from "hono";
import type { Env } from "../../types";
import { authMiddleware } from "../middleware/auth.middleware";
import { RoomService } from "../../chat/services/room.service";
import { ModerationService } from "../../chat/services/moderation.service";
import { createDb } from "../../db/drizzle";
import { ok, errorResponse } from "../../lib/response";
import { Errors } from "../../lib/errors";

const router = new Hono<{ Bindings: Env }>();

router.use("*", authMiddleware);

// GET /api/v1/rooms
router.get("/", async (c) => {
	try {
		const db = createDb(c.env.DATABASE_URL);
		const rooms = await new RoomService(db).listRooms();
		return ok(c, { rooms });
	} catch (err) {
		return errorResponse(c, err);
	}
});

/**
 * GET /api/v1/rooms/university
 * Returns (or auto-creates) the single UNIVERSITY room.
 * Every authenticated user can access this.
 */
router.get("/university", async (c) => {
	try {
		const db = createDb(c.env.DATABASE_URL);
		const room = await new RoomService(db).getUniversityRoom();
		return ok(c, { room });
	} catch (err) {
		return errorResponse(c, err);
	}
});

/**
 * GET /api/v1/rooms/me?groupKey=2024_P132
 *
 * Returns (or auto-creates) the caller's batchmate room.
 * groupKey = "{batchYear}_{programCode}" from the user's active profile in Firestore.
 */
router.get("/me", async (c) => {
	try {
		const groupKey = c.req.query("groupKey");
		if (!groupKey) {
			return errorResponse(c, Errors.validationError("groupKey query param is required"));
		}
		const db = createDb(c.env.DATABASE_URL);
		const room = await new RoomService(db).getBatchmateRoom(groupKey);
		return ok(c, { room });
	} catch (err) {
		return errorResponse(c, err);
	}
});

// GET /api/v1/rooms/:roomId
router.get("/:roomId", async (c) => {
	try {
		const db = createDb(c.env.DATABASE_URL);
		const room = await new RoomService(db).getRoom(c.req.param("roomId"));
		return ok(c, { room });
	} catch (err) {
		return errorResponse(c, err);
	}
});

// GET /api/v1/rooms/:roomId/pins
router.get("/:roomId/pins", async (c) => {
	try {
		const db = createDb(c.env.DATABASE_URL);
		const pins = await new ModerationService(db).getPins(c.req.param("roomId"));
		return ok(c, { pins });
	} catch (err) {
		return errorResponse(c, err);
	}
});

export { router as roomRoutes };
