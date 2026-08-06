// ============================================================
// bCampus Chat Worker — Reaction Repository
// ============================================================

import { and, eq } from "drizzle-orm";
import type { Database } from "../../db/drizzle";
import { messageReactions } from "../../db/schema";
import type { MessageReaction } from "../../db/schema";

export class ReactionRepository {
	constructor(private readonly db: Database) {}

	async upsert(messageId: string, userUid: string, emoji: string): Promise<MessageReaction> {
		const rows = await this.db
			.insert(messageReactions)
			.values({ messageId, userUid, emoji })
			.onConflictDoUpdate({
				target: [messageReactions.messageId, messageReactions.userUid],
				set: { emoji, createdAt: new Date().toISOString() },
			})
			.returning();
		return rows[0]!;
	}

	async remove(messageId: string, userUid: string): Promise<boolean> {
		const rows = await this.db
			.delete(messageReactions)
			.where(
				and(
					eq(messageReactions.messageId, messageId),
					eq(messageReactions.userUid, userUid),
				),
			)
			.returning();
		return rows.length > 0;
	}

	async findByMessage(messageId: string): Promise<MessageReaction[]> {
		return this.db
			.select()
			.from(messageReactions)
			.where(eq(messageReactions.messageId, messageId));
	}
}
