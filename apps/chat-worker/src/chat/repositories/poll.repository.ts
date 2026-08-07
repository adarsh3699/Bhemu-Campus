// ============================================================
// bCampus Chat Worker — Poll Repository
// ============================================================

import { and, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "../../db/drizzle";
import { polls, pollOptions, pollVotes } from "../../db/schema";
import type { Poll, PollOption, PollVote } from "../../db/schema";

export interface PollWithOptions extends Poll {
	options: PollOptionWithVoteCount[];
}

export interface PollOptionWithVoteCount extends PollOption {
	voteCount: number;
}

export interface CreatePollInput {
	messageId: string;
	multipleChoice: boolean;
	closesAt: string | null;
	options: string[]; // option texts in order
}

export class PollRepository {
	constructor(private readonly db: Database) {}

	/**
	 * Creates poll + options.
	 * The parent message must already exist before calling this.
	 * Inserts are sequential so the generated poll ID can be used by options.
	 */
	async create(input: CreatePollInput): Promise<PollWithOptions> {
		const [poll] = await this.db
			.insert(polls)
			.values({
				messageId: input.messageId,
				multipleChoice: input.multipleChoice,
				closesAt: input.closesAt,
			})
			.returning();

		const optionRows = await this.db
			.insert(pollOptions)
			.values(
				input.options.map((text, i) => ({
					pollId: poll!.id,
					optionText: text,
					displayOrder: i,
				})),
			)
			.returning();

		return {
			...poll!,
			options: optionRows.map((o) => ({ ...o, voteCount: 0 })),
		};
	}

	async findById(id: string): Promise<PollWithOptions | null> {
		const pollRows = await this.db.select().from(polls).where(eq(polls.id, id)).limit(1);
		if (pollRows.length === 0) return null;
		return this.loadWithOptions(pollRows[0]!);
	}

	/** Returns all vote option IDs the user has cast for this poll. */
	async getUserVotes(pollId: string, userUid: string): Promise<string[]> {
		const options = await this.db
			.select({ id: pollOptions.id })
			.from(pollOptions)
			.where(eq(pollOptions.pollId, pollId));

		if (options.length === 0) return [];

		const votes = await this.db
			.select()
			.from(pollVotes)
			.where(
				and(
					inArray(pollVotes.optionId, options.map((o) => o.id)),
					eq(pollVotes.userUid, userUid),
				),
			);

		return votes.map((v) => v.optionId);
	}

	async upsertVote(optionId: string, userUid: string): Promise<PollVote> {
		const rows = await this.db
			.insert(pollVotes)
			.values({ optionId, userUid })
			.onConflictDoNothing()
			.returning();

		if (rows.length === 0) {
			const existing = await this.db
				.select()
				.from(pollVotes)
				.where(and(eq(pollVotes.optionId, optionId), eq(pollVotes.userUid, userUid)))
				.limit(1);
			return existing[0]!;
		}
		return rows[0]!;
	}

	async removeVote(optionId: string, userUid: string): Promise<boolean> {
		const rows = await this.db
			.delete(pollVotes)
			.where(and(eq(pollVotes.optionId, optionId), eq(pollVotes.userUid, userUid)))
			.returning();
		return rows.length > 0;
	}

	async close(pollId: string): Promise<Poll | null> {
		const rows = await this.db
			.update(polls)
			.set({ isClosed: true, updatedAt: new Date().toISOString() })
			.where(eq(polls.id, pollId))
			.returning();
		return rows[0] ?? null;
	}

	/** Loads a poll with all its options and their vote counts. */
	private async loadWithOptions(poll: Poll): Promise<PollWithOptions> {
		const optionRows = await this.db
			.select()
			.from(pollOptions)
			.where(eq(pollOptions.pollId, poll.id))
			.orderBy(pollOptions.displayOrder);

		if (optionRows.length === 0) {
			return { ...poll, options: [] };
		}

		// Aggregate vote counts in one query
		const voteCounts = await this.db
			.select({
				optionId: pollVotes.optionId,
				count: sql<number>`COUNT(*)`,
			})
			.from(pollVotes)
			.where(inArray(pollVotes.optionId, optionRows.map((o) => o.id)))
			.groupBy(pollVotes.optionId);

		const countMap = new Map<string, number>();
		for (const v of voteCounts) {
			countMap.set(v.optionId, Number(v.count));
		}

		return {
			...poll,
			options: optionRows.map((o) => ({ ...o, voteCount: countMap.get(o.id) ?? 0 })),
		};
	}
}
