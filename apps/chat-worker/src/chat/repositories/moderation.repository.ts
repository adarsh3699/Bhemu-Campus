// ============================================================
// bCampus Chat Worker — Moderation Repository
// ============================================================

import { eq } from "drizzle-orm";
import type { Database } from "../../db/drizzle";
import { moderationActions } from "../../db/schema";
import type { ModerationAction } from "../../db/schema";

export interface CreateModerationActionInput {
	userUid: string;
	moderatorUid: string;
	action: ModerationAction["action"];
	actionReason: string | null;
	messageId: string | null;
	expiresAt: string | null;
}

export class ModerationRepository {
	constructor(private readonly db: Database) {}

	async create(input: CreateModerationActionInput): Promise<ModerationAction> {
		const rows = await this.db
			.insert(moderationActions)
			.values(input)
			.returning();
		return rows[0]!;
	}

	async listByUser(userUid: string): Promise<ModerationAction[]> {
		return this.db
			.select()
			.from(moderationActions)
			.where(eq(moderationActions.userUid, userUid))
			.orderBy(moderationActions.createdAt);
	}
}
