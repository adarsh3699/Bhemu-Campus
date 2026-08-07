// ============================================================
// bCampus Chat Worker — Main Entry Point
// ============================================================

import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types";
import { globalErrorHandler } from "./api/middleware/error.middleware";
import {
	roomRoutes,
	messageRoutes,
	reactionRoutes,
	pollRoutes,
	reportRoutes,
	attachmentRoutes,
	moderationRoutes,
	websocketRoutes,
	sessionRoutes,
	eventRoutes,
} from "./api/routes";
import { createDb } from "./db/drizzle";
import { logger, createTimer } from "./lib/logger";
import { generateRequestId } from "./lib/utils";
import { validateEnv } from "./lib/env";
import {
	runMessageIdempotencyCleanup,
	runRetentionCleanup,
	runRoomEventCleanup,
} from "./jobs/cleanup";
import { runPollAutoClose } from "./jobs/polls";
import { runSuspensionExpiry } from "./jobs/moderation";

export { ChatRoomDO } from "./durable-objects/ChatRoomDO";

// ---- App ----

const app = new Hono<{ Bindings: Env }>();

// ---- CORS ----
app.use(
	"*",
	cors({
		origin: ["http://localhost:3000", "https://campus.bhemu.in"],
		allowHeaders: ["Authorization", "Content-Type", "X-Idempotency-Key"],
		allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
	}),
);

// ---- Env validation (FRD §8.19) + Request logging (FRD §3.11, §8.14) ----
app.use("*", async (c, next) => {
	// Fail fast on misconfiguration
	validateEnv(c.env);

	const requestId = generateRequestId();
	const totalTimer = createTimer();
	c.res.headers.set("X-Request-Id", requestId);

	// Attach timing context for downstream use
	c.set("requestId" as never, requestId);

	await next();

	// FRD §8.14 required fields: requestId, userUid, roomId, route,
	// method, statusCode, dbDurationMs, doDurationMs, totalDuration
	logger.info("request", {
		requestId,
		method: c.req.method,
		endpoint: c.req.path,
		statusCode: c.res.status,
		durationMs: totalTimer(),
		// dbDurationMs and doDurationMs are set per-operation in the
		// repository and broadcast helpers; they appear in child log entries.
	});
});

// ---- Health ----

app.get("/health", (c) =>
	c.json({ status: "ok", service: "chat-worker", ts: new Date().toISOString() }),
);

/**
 * /ready — deep readiness probe (FRD §8.18).
 * Returns 200 only when DB + Firestore + R2 are all reachable.
 */
app.get("/ready", async (c) => {
	const checks: Record<string, "ok" | "unreachable"> = {};

	// ---- Neon PostgreSQL ----
	try {
		const db = createDb(c.env.DATABASE_URL);
		await db.execute("SELECT 1" as unknown as Parameters<typeof db.execute>[0]);
		checks.db = "ok";
	} catch {
		checks.db = "unreachable";
	}

	// ---- Firestore (401/403 = reachable, 5xx / timeout = not) ----
	try {
		const res = await fetch(
			`https://firestore.googleapis.com/v1/projects/${c.env.FIREBASE_PROJECT_ID}/databases/(default)/documents`,
			{ method: "GET", signal: AbortSignal.timeout(3000) },
		);
		checks.firestore = res.status < 500 ? "ok" : "unreachable";
	} catch {
		checks.firestore = "unreachable";
	}

	// ---- Cloudflare R2 ----
	if (c.env.MEDIA_BUCKET) {
		try {
			// head() on a known-nonexistent key is a cheap connectivity probe
			await c.env.MEDIA_BUCKET.head("__healthcheck__");
			checks.r2 = "ok";
		} catch {
			checks.r2 = "unreachable";
		}
	} else {
		checks.r2 = "unreachable"; // bucket not yet bound
	}

	const allOk = Object.values(checks).every((v) => v === "ok");
	return c.json({ status: allOk ? "ready" : "degraded", checks }, allOk ? 200 : 503);
});

// ---- API v1 Routes ----
app.route("/api/v1/rooms", roomRoutes);
app.route("/api/v1/session", sessionRoutes);
app.route("/api/v1/messages", messageRoutes);
app.route("/api/v1/reactions", reactionRoutes);
app.route("/api/v1/polls", pollRoutes);
app.route("/api/v1/reports", reportRoutes);
app.route("/api/v1/attachments", attachmentRoutes);
app.route("/api/v1/moderation", moderationRoutes);
app.route("/api/v1/rooms", eventRoutes);
app.route("/ws", websocketRoutes);

app.onError(globalErrorHandler);
app.notFound((c) =>
	c.json({ success: false, error: { code: "NOT_FOUND", message: "Route not found." } }, 404),
);

// ---- Scheduled Cron handlers (FRD §8.8) ----

async function scheduled(
	event: ScheduledEvent,
	env: Env,
	ctx: ExecutionContext,
): Promise<void> {
	logger.info("cron.fired", { cron: event.cron });

	switch (event.cron) {
		// Every hour — all maintenance jobs
		case "0 * * * *":
			ctx.waitUntil(
				Promise.allSettled([
					runRetentionCleanup(env),
					runMessageIdempotencyCleanup(env),
					runRoomEventCleanup(env),
					runPollAutoClose(env),
					runSuspensionExpiry(env),
				]).then((results) => {
					results.forEach((r, i) => {
						if (r.status === "rejected") {
							logger.error("cron.job_failed", {
								jobIndex: i,
								error: String(r.reason),
							});
						}
					});
				}),
			);
			break;

		default:
			logger.warn("cron.unknown", { cron: event.cron });
	}
}

export default { fetch: app.fetch, scheduled };
