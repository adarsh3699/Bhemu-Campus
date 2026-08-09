// ============================================================
// bCampus Chat Worker — Chat session bootstrap
// POST /api/v1/session
// ============================================================
// This endpoint deliberately accepts a Firebase ID token only. It performs
// the one expensive profile lookup and exchanges it for a short-lived local
// token used by the chat hot path.

import { Hono } from "hono";
import type { Env } from "../../types";
import { resolveSession, extractBearerToken } from "../../auth/session";
import { issueChatSession } from "../../auth/chat-session";
import { Errors } from "../../lib/errors";
import { ok, errorResponse } from "../../lib/response";

const router = new Hono<{ Bindings: Env }>();

router.post("/", async (c) => {
	try {
		const firebaseToken = extractBearerToken(c.req.header("Authorization") ?? null);
		if (!firebaseToken) throw Errors.missingToken();

		// resolveSession intentionally bypasses resolveRequestSession here. A
		// chat token must not be able to renew itself forever without Firebase
		// re-authentication and a fresh moderation profile read.
		const user = await resolveSession(firebaseToken, c.env);
		const session = await issueChatSession(user, c.env);
		c.header("Cache-Control", "no-store");
		return ok(c, session);
	} catch (err) {
		return errorResponse(c, err);
	}
});

export { router as sessionRoutes };
