// ============================================================
// bCampus Chat Worker — Report Routes
// POST /api/v1/reports
// ============================================================

import { Hono } from "hono";
import type { Env } from "../../types";
import { authMiddleware } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate";
import { CreateReportSchema } from "../validators/report.validator";
import { ReportService } from "../../chat/services/report.service";
import { createDb } from "../../db/drizzle";
import { ok, errorResponse } from "../../lib/response";
import { extractBearerToken } from "../../auth/session";

const router = new Hono<{ Bindings: Env }>();
router.use("*", authMiddleware);

router.post("/", async (c) => {
	try {
		const body = validateBody(CreateReportSchema, await c.req.json());
		const user = c.get("user");

		// Raw token needed for Firestore flag write (FRD §7.10)
		const idToken = extractBearerToken(c.req.header("Authorization") ?? null) ?? "";

		const db = createDb(c.env.DATABASE_URL);
		const report = await new ReportService(db).reportMessage(
			user,
			{
				messageId: body.messageId,
				reason: body.reason,
				description: body.description ?? null,
			},
			c.env,
			idToken,
		);
		return ok(c, { report }, 201);
	} catch (err) {
		return errorResponse(c, err);
	}
});

export { router as reportRoutes };
