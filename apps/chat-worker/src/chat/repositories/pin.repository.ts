// ============================================================
// bCampus Chat Worker — Pin Repository
// ============================================================

import { and, eq, gt, isNull, ne, or, sql } from "drizzle-orm";
import type { Database } from "../../db/drizzle";
import { messages, roomPins } from "../../db/schema";
import type { RoomPin } from "../../db/schema";

export class PinRepository {
	constructor(private readonly db: Database) {}

	async findByRoom(roomId: string): Promise<RoomPin[]> {
		return this.db
			.select({
				roomId: roomPins.roomId,
				messageId: roomPins.messageId,
				pinnedBy: roomPins.pinnedBy,
				pinnedAt: roomPins.pinnedAt,
				expiresAt: roomPins.expiresAt,
			})
			.from(roomPins)
			.innerJoin(messages, eq(roomPins.messageId, messages.id))
			.where(and(
				eq(roomPins.roomId, roomId),
				ne(messages.visibility, "DELETED"),
				or(isNull(roomPins.expiresAt), gt(roomPins.expiresAt, sql`NOW()`)),
			))
			.orderBy(roomPins.pinnedAt);
	}

	async countByRoom(roomId: string): Promise<number> {
		const result = await this.db
			.select({ count: sql<number>`count(*)` })
			.from(roomPins)
			.innerJoin(messages, eq(roomPins.messageId, messages.id))
			.where(and(
				eq(roomPins.roomId, roomId),
				ne(messages.visibility, "DELETED"),
				or(isNull(roomPins.expiresAt), gt(roomPins.expiresAt, sql`NOW()`)),
			));
		return Number(result[0]?.count ?? 0);
	}

	async exists(roomId: string, messageId: string): Promise<boolean> {
		const rows = await this.db
			.select({ roomId: roomPins.roomId })
			.from(roomPins)
			.where(and(
				eq(roomPins.roomId, roomId),
				eq(roomPins.messageId, messageId),
				or(isNull(roomPins.expiresAt), gt(roomPins.expiresAt, sql`NOW()`)),
			))
			.limit(1);
		return rows.length > 0;
	}

	async pin(roomId: string, messageId: string, pinnedBy: string, expiresAt: string | null): Promise<RoomPin> {
		const rows = await this.db
			.insert(roomPins)
			.values({ roomId, messageId, pinnedBy, expiresAt })
			.onConflictDoUpdate({
				target: [roomPins.roomId, roomPins.messageId],
				set: { pinnedBy, pinnedAt: sql`NOW()`, expiresAt },
			})
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
