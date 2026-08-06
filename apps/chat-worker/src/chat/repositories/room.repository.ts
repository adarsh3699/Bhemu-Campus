// ============================================================
// bCampus Chat Worker — Room Repository
// ============================================================
// DB access only. No business logic, no auth.

import { and, eq, sql } from "drizzle-orm";
import type { Database } from "../../db/drizzle";
import { rooms, roomMembers, roomPolicies } from "../../db/schema";
import type { Room, RoomPolicy } from "../../db/schema";

export interface RoomWithPolicy extends Room {
	policy: RoomPolicy;
}

export class RoomRepository {
	constructor(private readonly db: Database) {}

	// ----------------------------------------------------------------
	// Reads
	// ----------------------------------------------------------------

	async findAll(): Promise<RoomWithPolicy[]> {
		const rows = await this.db
			.select()
			.from(rooms)
			.innerJoin(roomPolicies, eq(rooms.policyId, roomPolicies.id));

		return rows.map((r) => ({ ...r.rooms, policy: r.room_policies }));
	}

	async findById(id: string): Promise<RoomWithPolicy | null> {
		const rows = await this.db
			.select()
			.from(rooms)
			.innerJoin(roomPolicies, eq(rooms.policyId, roomPolicies.id))
			.where(eq(rooms.id, id))
			.limit(1);

		if (rows.length === 0) return null;
		return { ...rows[0]!.rooms, policy: rows[0]!.room_policies };
	}

	/** Returns the UNIVERSITY room, or null if it doesn't exist yet. */
	private async findUniversityRoom(): Promise<RoomWithPolicy | null> {
		const rows = await this.db
			.select()
			.from(rooms)
			.innerJoin(roomPolicies, eq(rooms.policyId, roomPolicies.id))
			.where(eq(rooms.type, "UNIVERSITY"))
			.limit(1);

		if (rows.length === 0) return null;
		return { ...rows[0]!.rooms, policy: rows[0]!.room_policies };
	}

	// ----------------------------------------------------------------
	// Auto-provision rooms (on-demand creation)
	// ----------------------------------------------------------------

	/**
	 * Finds the UNIVERSITY room or creates it on first access.
	 * Idempotent — concurrent requests hit UNIQUE(type, group_key) and the first wins.
	 */
	async findOrCreateUniversityRoom(): Promise<RoomWithPolicy> {
		const existing = await this.findUniversityRoom();
		if (existing) return existing;

		const policyRows = await this.db
			.select()
			.from(roomPolicies)
			.where(eq(roomPolicies.name, "University"))
			.limit(1);

		if (!policyRows[0]) {
			throw new Error("University room policy not found — run db:seed first.");
		}

		await this.db
			.insert(rooms)
			.values({
				policyId: policyRows[0].id,
				type: "UNIVERSITY",
				visibility: "PUBLIC",
				name: "University",
				description: "Official university chat.",
				groupKey: "UNIVERSITY",
			})
			.onConflictDoNothing();

		const created = await this.findUniversityRoom();
		if (!created) throw new Error("Failed to create university room.");
		return created;
	}

	/**
	 * Finds the batchmate room for a given groupKey, or creates it on first access.
	 * groupKey format: "{batchYear}_{programCode}" — e.g. "2024_P132"
	 * Idempotent — UNIQUE(type, group_key) prevents duplicates under races.
	 */
	async findOrCreateBatchmateRoom(groupKey: string): Promise<RoomWithPolicy> {
		// 1. Try to find existing room
		const existing = await this.db
			.select()
			.from(rooms)
			.innerJoin(roomPolicies, eq(rooms.policyId, roomPolicies.id))
			.where(and(eq(rooms.type, "BATCHMATE"), eq(rooms.groupKey, groupKey)))
			.limit(1);

		if (existing.length > 0) {
			return { ...existing[0]!.rooms, policy: existing[0]!.room_policies };
		}

		// 2. Look up the Batchmate policy
		const policyRows = await this.db
			.select()
			.from(roomPolicies)
			.where(eq(roomPolicies.name, "Batchmate"))
			.limit(1);

		if (!policyRows[0]) {
			throw new Error("Batchmate room policy not found — run db:seed first.");
		}

		// 3. Create room — ON CONFLICT DO NOTHING handles concurrent requests
		const [year, ...programParts] = groupKey.split("_");
		const programCode = programParts.join("_");

		await this.db
			.insert(rooms)
			.values({
				policyId: policyRows[0].id,
				type: "BATCHMATE",
				visibility: "PUBLIC",
				name: `Batchmate ${year} · ${programCode}`,
				description: `Chat room for ${programCode} batch of ${year}.`,
				groupKey,
			})
			.onConflictDoNothing();

		// 4. Re-fetch (handles race where another request created it first)
		const created = await this.db
			.select()
			.from(rooms)
			.innerJoin(roomPolicies, eq(rooms.policyId, roomPolicies.id))
			.where(and(eq(rooms.type, "BATCHMATE"), eq(rooms.groupKey, groupKey)))
			.limit(1);

		if (!created[0]) throw new Error(`Failed to create batchmate room for ${groupKey}`);
		return { ...created[0].rooms, policy: created[0].room_policies };
	}

	// ----------------------------------------------------------------
	// Membership (used only for PRIVATE rooms — future use)
	// ----------------------------------------------------------------

	/** Checks if a user is an explicit member of a room (PRIVATE rooms only). */
	async isMember(roomId: string, userUid: string): Promise<boolean> {
		const rows = await this.db
			.select({ roomId: roomMembers.roomId })
			.from(roomMembers)
			.where(and(eq(roomMembers.roomId, roomId), eq(roomMembers.userUid, userUid)))
			.limit(1);
		return rows.length > 0;
	}

	/** Adds a user as an explicit member (PRIVATE rooms only). Idempotent. */
	async ensureMember(roomId: string, userUid: string): Promise<void> {
		await this.db
			.insert(roomMembers)
			.values({ roomId, userUid })
			.onConflictDoNothing();
	}

	// ----------------------------------------------------------------
	// Message counters
	// ----------------------------------------------------------------

	async incrementMessageCount(roomId: string, lastMessageAt: string): Promise<void> {
		await this.db
			.update(rooms)
			.set({
				messageCount: sql`${rooms.messageCount} + 1`,
				lastMessageAt,
				updatedAt: new Date().toISOString(),
			})
			.where(eq(rooms.id, roomId));
	}

	async decrementMessageCount(roomId: string): Promise<void> {
		await this.db
			.update(rooms)
			.set({
				messageCount: sql`GREATEST(${rooms.messageCount} - 1, 0)`,
				updatedAt: new Date().toISOString(),
			})
			.where(eq(rooms.id, roomId));
	}
}
