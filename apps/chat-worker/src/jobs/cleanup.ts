// ============================================================
// bCampus Chat Worker — Retention Cleanup Job
// ============================================================
// FRD §4.21, §8.8, §8.9, §8.10
//
// Runs every hour via Cloudflare Cron.
// For each room, deletes messages that:
//   - Exceed retention_days, OR
//   - Cause the total count to exceed max_messages
//
// Per FRD §8.10: R2 objects are deleted BEFORE DB metadata.
// Per FRD §8.9:  Deletes in configurable batches — never one transaction.
// Per FRD §4.21: Pinned messages are exempt.
// Per FRD §8.23: rooms.message_count is updated after each batch.

import { and, eq, lt, notInArray, sql, inArray } from "drizzle-orm";
import { createDb } from "../db/drizzle";
import {
	messages,
	messageAttachments,
	messageIdempotency,
	roomEvents,
	roomPins,
	rooms,
	roomPolicies,
} from "../db/schema";
import { logger } from "../lib/logger";
import { CLEANUP_BATCH_SIZE } from "../constants";
import type { Env } from "../types";

// ---- R2 deletion helper ----

async function deleteR2Objects(env: Env, storageKeys: string[]): Promise<void> {
	if (!env.MEDIA_BUCKET || storageKeys.length === 0) return;

	const results = await Promise.allSettled(
		storageKeys.map((key) => env.MEDIA_BUCKET!.delete(key)),
	);

	const failed = results.filter((r) => r.status === "rejected");
	if (failed.length > 0) {
		logger.warn("cleanup.r2.partial_failure", {
			job: "retention",
			failed: failed.length,
			total: storageKeys.length,
		});
	}
}

/**
 * Entry point — called from the `scheduled` export in index.ts.
 */
export async function runRetentionCleanup(env: Env): Promise<void> {
	const db = createDb(env.DATABASE_URL);
	const startedAt = Date.now();
	let totalDeleted = 0;

	logger.info("cleanup.start", { job: "retention" });

	// Load all rooms with their policies
	const roomRows = await db
		.select({
			roomId: rooms.id,
			retentionDays: roomPolicies.retentionDays,
			maxMessages: roomPolicies.maxMessages,
			messageCount: rooms.messageCount,
		})
		.from(rooms)
		.innerJoin(roomPolicies, eq(rooms.policyId, roomPolicies.id));

	for (const room of roomRows) {
		const cutoff = new Date(Date.now() - room.retentionDays * 86_400_000).toISOString();

		// Load pinned IDs so we never delete them
		const pinnedRows = await db
			.select({ messageId: roomPins.messageId })
			.from(roomPins)
			.where(eq(roomPins.roomId, room.roomId));
		const pinnedIds = pinnedRows.map((p) => p.messageId);

		let roomDeleted = 0;
		let hasMore = true;

		while (hasMore) {
			// ---- Determine deletion candidates ----
			// Eligible: older than cutoff OR room is over max_messages limit
			const overLimit = room.messageCount - roomDeleted > room.maxMessages;

			const expired = await db
				.select({ id: messages.id })
				.from(messages)
				.where(
					and(
						eq(messages.roomId, room.roomId),
						// Either past retention cutoff, or room over capacity
						overLimit ? sql`TRUE` : lt(messages.createdAt, cutoff),
						// But never if past cutoff AND we're under limit — keep them
						overLimit ? lt(messages.createdAt, cutoff) : sql`TRUE`,
						pinnedIds.length > 0
							? notInArray(messages.id, pinnedIds)
							: sql`TRUE`,
					),
				)
				.orderBy(messages.createdAt) // oldest first
				.limit(CLEANUP_BATCH_SIZE);

			if (expired.length === 0) {
				break;
			}

			const ids = expired.map((r) => r.id);

			// ---- FRD §8.10: delete R2 objects BEFORE metadata ----
			const attachmentRows = await db
				.select({ storageKey: messageAttachments.storageKey })
				.from(messageAttachments)
				.where(inArray(messageAttachments.messageId, ids));

			await deleteR2Objects(env, attachmentRows.map((a) => a.storageKey));

			// ---- Hard-delete the message batch ----
			await db
				.delete(messages)
				.where(
					and(
						eq(messages.roomId, room.roomId),
						inArray(messages.id, ids),
					),
				);

			roomDeleted += ids.length;
			totalDeleted += ids.length;

			// ---- FRD §8.23: update rooms.message_count per batch ----
			await db
				.update(rooms)
				.set({
					messageCount: sql`GREATEST(${rooms.messageCount} - ${ids.length}, 0)`,
					updatedAt: new Date().toISOString(),
				})
				.where(eq(rooms.id, room.roomId));

			logger.info("cleanup.batch", {
				job: "retention",
				roomId: room.roomId,
				deleted: ids.length,
				cutoff,
			});

			hasMore = ids.length >= CLEANUP_BATCH_SIZE;
		}
	}

	logger.info("cleanup.done", {
		job: "retention",
		totalDeleted,
		durationMs: Date.now() - startedAt,
	});
}

/**
 * Removes database idempotency keys after the same 24-hour window used by the
 * Durable Object cache.
 */
export async function runMessageIdempotencyCleanup(env: Env): Promise<void> {
	const db = createDb(env.DATABASE_URL);
	const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
	const deleted = await db
		.delete(messageIdempotency)
		.where(lt(messageIdempotency.createdAt, cutoff))
		.returning({ messageId: messageIdempotency.messageId });

	if (deleted.length > 0) {
		logger.info("cleanup.idempotency", {
			job: "message_idempotency",
			deleted: deleted.length,
		});
	}
}

/**
 * Keeps the replay window bounded. A client whose cursor predates this window
 * falls back to the normal message snapshot; event replay is not archival
 * storage.
 */
export async function runRoomEventCleanup(env: Env): Promise<void> {
	const db = createDb(env.DATABASE_URL);
	const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
	const deleted = await db
		.delete(roomEvents)
		.where(lt(roomEvents.createdAt, cutoff))
		.returning({ eventId: roomEvents.eventId });

	if (deleted.length > 0) {
		logger.info("cleanup.room_events", {
			job: "room_events",
			deleted: deleted.length,
		});
	}
}
