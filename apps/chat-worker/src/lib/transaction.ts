// ============================================================
// bCampus Chat Worker — Transaction Helper
// ============================================================
// FRD §3.2, §3.8
//
// Thin wrapper around Drizzle's .transaction() that adds
// structured logging for every multi-step write operation.
// Keeps transaction boilerplate out of service classes.

import type { Database } from "../db/drizzle";
import { logger } from "./logger";

/**
 * Runs `fn` inside a Neon HTTP transaction.
 * Any thrown error automatically rolls back all statements in the batch.
 *
 * Usage:
 *   const result = await withTransaction(db, "create_message", async (tx) => {
 *     const msg  = await tx.insert(messages).values(...).returning();
 *     const atts = await tx.insert(messageAttachments).values(...).returning();
 *     return { msg, atts };
 *   });
 */
export async function withTransaction<T>(
	db: Database,
	label: string,
	fn: (tx: Parameters<Parameters<Database["transaction"]>[0]>[0]) => Promise<T>,
): Promise<T> {
	const start = Date.now();
	try {
		const result = await db.transaction(fn);
		logger.debug(`tx.ok:${label}`, { dbDurationMs: Date.now() - start });
		return result;
	} catch (err) {
		logger.error(`tx.fail:${label}`, {
			dbDurationMs: Date.now() - start,
			error: String(err),
		});
		throw err;
	}
}
