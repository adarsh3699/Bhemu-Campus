// ============================================================
// bCampus Chat Worker — Room event replay repository
// ============================================================

import { and, asc, desc, eq, gt } from "drizzle-orm";
import type { Database } from "../../db/drizzle";
import { roomEvents } from "../../db/schema";

export interface RoomEventReplayResult {
	events: Array<typeof roomEvents.$inferSelect>;
	highWater: number;
	hasMore: boolean;
	resyncRequired: boolean;
}

export class RoomEventRepository {
	constructor(private readonly db: Database) {}

	async listAfter(
		roomId: string,
		after: number,
		limit: number,
	): Promise<RoomEventReplayResult> {
		const [rows, highWaterRow] = await Promise.all([
			this.db
				.select()
				.from(roomEvents)
				.where(and(eq(roomEvents.roomId, roomId), gt(roomEvents.roomSeq, after)))
				.orderBy(asc(roomEvents.roomSeq))
				.limit(limit + 1),
			this.db
				.select({ roomSeq: roomEvents.roomSeq })
				.from(roomEvents)
				.where(eq(roomEvents.roomId, roomId))
				.orderBy(desc(roomEvents.roomSeq))
				.limit(1),
		]);

		const events = rows.slice(0, limit);
		const highWater = highWaterRow[0]?.roomSeq ?? 0;
		const firstSequence = events[0]?.roomSeq;
		return {
			events,
			highWater,
			hasMore: rows.length > limit,
			// A non-zero cursor with no contiguous persisted event means the
			// requested replay window has expired or contains an unrecoverable
			// gap. A snapshot is the safe convergence path.
			resyncRequired: after > 0 && highWater > after
				&& (firstSequence === undefined || firstSequence > after + 1),
		};
	}
}
