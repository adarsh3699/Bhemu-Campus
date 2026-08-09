// ============================================================
// bCampus Chat Worker — Poll Auto-Close Job
// ============================================================
// FRD §3.2, §4.15
//
// Runs on the same hourly cron as cleanup.
// Finds all open polls whose closes_at has elapsed and marks
// them as closed so the next vote attempt correctly returns
// POLL_CLOSED rather than silently accepting the vote.

import { and, eq, lte, isNotNull } from "drizzle-orm";
import { createDb } from "../db/drizzle";
import { polls } from "../db/schema";
import { logger } from "../lib/logger";
import type { Env } from "../types";

export async function runPollAutoClose(env: Env): Promise<void> {
	const db = createDb(env.DATABASE_URL);
	const now = new Date().toISOString();
	const start = Date.now();

	const expired = await db
		.select({ id: polls.id })
		.from(polls)
		.where(
			and(
				eq(polls.isClosed, false),
				isNotNull(polls.closesAt),
				lte(polls.closesAt, now),
			),
		);

	if (expired.length === 0) {
		logger.info("polls.auto_close.none", { durationMs: Date.now() - start });
		return;
	}

	const ids = expired.map((p) => p.id);

	// Close in one UPDATE — all are already past their closes_at
	for (const id of ids) {
		await db
			.update(polls)
			.set({ isClosed: true, updatedAt: now })
			.where(eq(polls.id, id));
	}

	logger.info("polls.auto_close.done", {
		closed: ids.length,
		durationMs: Date.now() - start,
	});
}
