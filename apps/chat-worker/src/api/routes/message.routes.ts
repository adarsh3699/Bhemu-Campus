// ============================================================
// bCampus Chat Worker — Message Routes
// GET    /api/v1/messages
// PATCH  /api/v1/messages/:messageId
// DELETE /api/v1/messages/:messageId
// ============================================================

import { Hono } from "hono";
import type { Env } from "../../types";
import { authMiddleware } from "../middleware/auth.middleware";
import { validateBody, validateQuery } from "../middleware/validate";
import {
	EditMessageSchema,
	ListMessagesSchema,
} from "../validators/message.validator";
import { MessageService } from "../../chat/services/message.service";
import { createDb } from "../../db/drizzle";
import { broadcastToRoom } from "../broadcast";
import { ok, noContent, errorResponse } from "../../lib/response";

const router = new Hono<{ Bindings: Env }>();
router.use("*", authMiddleware);

// GET /api/v1/messages?roomId=...&cursor=...&limit=...
router.get("/", async (c) => {
	try {
		const query = validateQuery(ListMessagesSchema, c.req.query());
		const user = c.get("user");
		const db = createDb(c.env.DATABASE_URL);
		const result = await new MessageService(db).listMessages(
			query.roomId,
			user.uid,
			query.limit,
			query.cursor,
		);
		return ok(c, result);
	} catch (err) {
		return errorResponse(c, err);
	}
});

// PATCH /api/v1/messages/:messageId
router.patch("/:messageId", async (c) => {
	try {
		const body = validateBody(EditMessageSchema, await c.req.json());
		const user = c.get("user");
		const db = createDb(c.env.DATABASE_URL);
		const broadcast = (roomId: string, payload: { event: string; data: unknown }) =>
			broadcastToRoom(c.env, roomId, payload);
		const message = await new MessageService(db).editMessage(
			user,
			c.req.param("messageId"),
			body.content,
			broadcast,
		);
		return ok(c, { message });
	} catch (err) {
		return errorResponse(c, err);
	}
});

// DELETE /api/v1/messages/:messageId
router.delete("/:messageId", async (c) => {
	try {
		const user = c.get("user");
		const db = createDb(c.env.DATABASE_URL);
		const broadcast = (roomId: string, payload: { event: string; data: unknown }) =>
			broadcastToRoom(c.env, roomId, payload);
		await new MessageService(db).deleteMessage(user, c.req.param("messageId"), broadcast);
		return noContent(c);
	} catch (err) {
		return errorResponse(c, err);
	}
});

export { router as messageRoutes };
