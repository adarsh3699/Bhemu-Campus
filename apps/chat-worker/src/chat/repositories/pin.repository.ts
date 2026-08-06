// ============================================================
// bCampus Chat Worker — Pin Repository
// ============================================================

import { and, eq, sql } from "drizzle-orm";
import type { Database } from "../../db/drizzle";
import { roomPins } from "../../db/schema";
import type { RoomPin } from "../../db/schema";

export class PinRepository {
	constructor(private readonly db: Database) {}

	async findByRoom(roomId: string): Promise<RoomPin[]> {
		return this.db
			.select()
			.from(roomPins)
			.where(eq(roomPins.roomId, roomId))
			.orderBy(roomPins.pinnedAt);
	}

	async countByRoom(roomId: string): Promise<number> {
		const result = await this.db
			.select({ count: sql<number>`count(*)` })
			.from(roomPins)
			.where(eq(roomPins.roomId, roomId));
		return Number(result[0]?.count ?? 0);
	}

	async exists(roomId: string, messageId: string): Promise<boolean> {
		const rows = await this.db
			.select({ roomId: roomPins.roomId })
			.from(roomPins)
			.where(and(eq(roomPins.roomId, roomId), eq(roomPins.messageId, messageId)))
			.limit(1);
		return rows.length > 0;
	}

	async pin(roomId: string, messageId: string, pinnedBy: string): Promise<RoomPin> {
		const rows = await this.db
			.insert(roomPins)
			.values({ roomId, messageId, pinnedBy })
			.returning();
		return rows[0]!;
	}

	async unpin(roomId: string, messageId: string): Promise<boolean> {
		const rows = await this.db
			.delete(roomPins)
			.where(and(eq(roomPins.roomId, roomId), eq(roomPins.messageId, messageId)))
			.returning();
		return rows.length > 0;
	}
}
