// ============================================================
// bCampus Chat Worker — Moderation Routes
// POST  /api/v1/moderation/warn
// POST  /api/v1/moderation/suspend
// POST  /api/v1/moderation/ban
// POST  /api/v1/moderation/delete-message/:messageId
// POST  /api/v1/moderation/pin/:roomId/:messageId
// DELETE /api/v1/moderation/pin/:roomId/:messageId
// ============================================================

import { Hono } from "hono";
import type { Env } from "../../types";
import { authMiddleware } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate";
import {
	WarnUserSchema,
	SuspendUserSchema,
	BanUserSchema,
	DeleteMessageModerationSchema,
	PinMessageSchema,
} from "../validators/moderation.validator";
import { ModerationService } from "../../chat/services/moderation.service";
import { createDb } from "../../db/drizzle";
import { broadcastToRoom } from "../broadcast";
import { ok, noContent, errorResponse } from "../../lib/response";

const router = new Hono<{ Bindings: Env }>();

router.use("*", authMiddleware);

// POST /api/v1/moderation/warn
router.post("/warn", async (c) => {
	try {
		const body = validateBody(WarnUserSchema, await c.req.json());
		const db = createDb(c.env.DATABASE_URL);
		const service = new ModerationService(db);

		const action = await service.warnUser(c.get("user"), {
			targetUserUid: body.targetUserUid,
			reason: body.reason ?? null,
			messageId: body.messageId,
		});
		return ok(c, { action }, 201);
	} catch (err) {
		return errorResponse(c, err);
	}
});

// POST /api/v1/moderation/suspend
router.post("/suspend", async (c) => {
	try {
		const body = validateBody(SuspendUserSchema, await c.req.json());
		const db = createDb(c.env.DATABASE_URL);
		const service = new ModerationService(db);

		const action = await service.suspendUser(c.get("user"), {
			targetUserUid: body.targetUserUid,
			reason: body.reason ?? null,
			expiresAt: body.expiresAt,
		});
		return ok(c, { action }, 201);
	} catch (err) {
		return errorResponse(c, err);
	}
});

// POST /api/v1/moderation/ban
router.post("/ban", async (c) => {
	try {
		const body = validateBody(BanUserSchema, await c.req.json());
		const db = createDb(c.env.DATABASE_URL);
		const service = new ModerationService(db);

		const action = await service.banUser(c.get("user"), {
			targetUserUid: body.targetUserUid,
			reason: body.reason ?? null,
		});
		return ok(c, { action }, 201);
	} catch (err) {
		return errorResponse(c, err);
	}
});

// POST /api/v1/moderation/delete-message/:messageId
router.post("/delete-message/:messageId", async (c) => {
	try {
		const body = validateBody(DeleteMessageModerationSchema, await c.req.json().catch(() => ({})));
		const db = createDb(c.env.DATABASE_URL);
		const service = new ModerationService(db);

		const broadcast = (roomId: string, payload: { event: string; data: unknown }) =>
			broadcastToRoom(c.env, roomId, payload);

		const action = await service.deleteMessage(
			c.get("user"),
			c.req.param("messageId"),
			body.reason ?? null,
			broadcast,
		);
		return ok(c, { action }, 201);
	} catch (err) {
		return errorResponse(c, err);
	}
});

// POST /api/v1/moderation/pin/:roomId/:messageId
router.post("/pin/:roomId/:messageId", async (c) => {
	try {
		const body = validateBody(PinMessageSchema, await c.req.json().catch(() => ({})));
		const db = createDb(c.env.DATABASE_URL);
		const service = new ModerationService(db, c.env, c.executionCtx.waitUntil.bind(c.executionCtx));

		const broadcast = (roomId: string, payload: { event: string; data: unknown }) =>
			broadcastToRoom(c.env, roomId, payload);

		await service.pinMessage(
			c.get("user"),
			c.req.param("roomId"),
			c.req.param("messageId"),
			broadcast,
			body.duration,
		);
		return ok(c, { pinned: true });
	} catch (err) {
		return errorResponse(c, err);
	}
});

// DELETE /api/v1/moderation/pin/:roomId/:messageId
router.delete("/pin/:roomId/:messageId", async (c) => {
	try {
		const db = createDb(c.env.DATABASE_URL);
		const service = new ModerationService(db);

		const broadcast = (roomId: string, payload: { event: string; data: unknown }) =>
			broadcastToRoom(c.env, roomId, payload);

		await service.unpinMessage(
			c.get("user"),
			c.req.param("roomId"),
			c.req.param("messageId"),
			broadcast,
		);
		return noContent(c);
	} catch (err) {
		return errorResponse(c, err);
	}
});

export { router as moderationRoutes };
