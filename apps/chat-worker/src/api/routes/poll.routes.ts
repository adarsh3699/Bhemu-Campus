// ============================================================
// bCampus Chat Worker — Poll Routes
// POST  /api/v1/polls
// POST  /api/v1/polls/:pollId/vote
// PATCH /api/v1/polls/:pollId/close
// ============================================================

import { Hono } from "hono";
import type { Env } from "../../types";
import { authMiddleware } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate";
import { CreatePollSchema, VotePollSchema } from "../validators/poll.validator";
import { PollService } from "../../chat/services/poll.service";
import { createDb } from "../../db/drizzle";
import { broadcastToRoom } from "../broadcast";
import { ok, errorResponse } from "../../lib/response";

const router = new Hono<{ Bindings: Env }>();

router.use("*", authMiddleware);

// POST /api/v1/polls
router.post("/", async (c) => {
	try {
		const body = validateBody(CreatePollSchema, await c.req.json());
		const user = c.get("user");
		const db = createDb(c.env.DATABASE_URL);
		const service = new PollService(db);

		const broadcast = (roomId: string, payload: { event: string; data: unknown }) =>
			broadcastToRoom(c.env, roomId, payload);

		const poll = await service.createPoll(user, body, broadcast);
		return ok(c, { poll }, 201);
	} catch (err) {
		return errorResponse(c, err);
	}
});

// POST /api/v1/polls/:pollId/vote
router.post("/:pollId/vote", async (c) => {
	try {
		const body = validateBody(VotePollSchema, await c.req.json());
		const user = c.get("user");
		const db = createDb(c.env.DATABASE_URL);
		const service = new PollService(db);

		const broadcast = (roomId: string, payload: { event: string; data: unknown }) =>
			broadcastToRoom(c.env, roomId, payload);

		const poll = await service.vote(
			user,
			{ pollId: c.req.param("pollId"), optionIds: body.optionIds },
			broadcast,
		);
		return ok(c, { poll });
	} catch (err) {
		return errorResponse(c, err);
	}
});

// PATCH /api/v1/polls/:pollId/close
router.patch("/:pollId/close", async (c) => {
	try {
		const user = c.get("user");
		const db = createDb(c.env.DATABASE_URL);
		const service = new PollService(db);

		const broadcast = (roomId: string, payload: { event: string; data: unknown }) =>
			broadcastToRoom(c.env, roomId, payload);

		const poll = await service.closePoll(user, c.req.param("pollId"), broadcast);
		return ok(c, { poll });
	} catch (err) {
		return errorResponse(c, err);
	}
});

export { router as pollRoutes };
