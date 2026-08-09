// ============================================================
// bCampus Chat Worker — Reaction Routes
// POST   /api/v1/reactions
// DELETE /api/v1/reactions/:messageId
// ============================================================

import { Hono } from "hono";
import type { Env } from "../../types";
import { authMiddleware } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate";
import { SetReactionSchema } from "../validators/reaction.validator";
import { ReactionService } from "../../chat/services/reaction.service";
import { createDb } from "../../db/drizzle";
import { broadcastToRoom } from "../broadcast";
import { ok, noContent, errorResponse } from "../../lib/response";

const router = new Hono<{ Bindings: Env }>();

router.use("*", authMiddleware);

// POST /api/v1/reactions
router.post("/", async (c) => {
	try {
		const body = validateBody(SetReactionSchema, await c.req.json());
		const user = c.get("user");
		const db = createDb(c.env.DATABASE_URL);
		const service = new ReactionService(db);

		const broadcast = (roomId: string, payload: { event: string; data: unknown }) =>
			broadcastToRoom(c.env, roomId, payload);

		const reaction = await service.setReaction(user, body.messageId, body.emoji, broadcast);
		return ok(c, { reaction });
	} catch (err) {
		return errorResponse(c, err);
	}
});

// DELETE /api/v1/reactions/:messageId
router.delete("/:messageId", async (c) => {
	try {
		const user = c.get("user");
		const db = createDb(c.env.DATABASE_URL);
		const service = new ReactionService(db);

		const broadcast = (roomId: string, payload: { event: string; data: unknown }) =>
			broadcastToRoom(c.env, roomId, payload);

		await service.removeReaction(user, c.req.param("messageId"), broadcast);
		return noContent(c);
	} catch (err) {
		return errorResponse(c, err);
	}
});

export { router as reactionRoutes };
