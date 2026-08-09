// ============================================================
// bCampus Chat Worker — Report Repository
// ============================================================

import { and, eq, gte, sql } from "drizzle-orm";
import type { Database } from "../../db/drizzle";
import { messageReports } from "../../db/schema";
import type { MessageReport } from "../../db/schema";

export interface CreateReportInput {
	messageId: string;
	reporterUid: string;
	reason: MessageReport["reason"];
	description: string | null;
}

export class ReportRepository {
	constructor(private readonly db: Database) {}

	async create(input: CreateReportInput): Promise<MessageReport> {
		const rows = await this.db
			.insert(messageReports)
			.values(input)
			.returning();
		return rows[0]!;
	}

	async exists(messageId: string, reporterUid: string): Promise<boolean> {
		const rows = await this.db
			.select({ id: messageReports.id })
			.from(messageReports)
			.where(
				and(
					eq(messageReports.messageId, messageId),
					eq(messageReports.reporterUid, reporterUid),
				),
			)
			.limit(1);
		return rows.length > 0;
	}

	/**
	 * Count unique reporters for a given message within `windowHours`.
	 * Used to trigger automatic flagging.
	 */
	async countUniqueReporters(messageId: string, windowHours: number): Promise<number> {
		const since = new Date(Date.now() - windowHours * 3_600_000).toISOString();
		const result = await this.db
			.select({ count: sql<number>`count(distinct ${messageReports.reporterUid})` })
			.from(messageReports)
			.where(
				and(
					eq(messageReports.messageId, messageId),
					gte(messageReports.createdAt, since),
				),
			);
		return Number(result[0]?.count ?? 0);
	}
}
