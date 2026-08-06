// ============================================================
// bCampus Chat Worker — Room Service
// ============================================================
//
// Membership model (current):
//   PUBLIC rooms (UNIVERSITY + BATCHMATE) — open to all authenticated users.
//   The room_members table is NOT used for access control on PUBLIC rooms.
//   It exists for future PRIVATE room support (e.g. clubs, manual invites).
//
// BATCHMATE rooms are auto-provisioned on first access for each groupKey.
// UNIVERSITY room is auto-provisioned on first access if it doesn't exist.

import { RoomRepository, type RoomWithPolicy } from "../repositories/room.repository";
import type { Database } from "../../db/drizzle";
import { Errors } from "../../lib/errors";

export class RoomService {
	private readonly repo: RoomRepository;

	constructor(db: Database) {
		this.repo = new RoomRepository(db);
	}

	async listRooms(): Promise<RoomWithPolicy[]> {
		return this.repo.findAll();
	}

	async getRoom(roomId: string): Promise<RoomWithPolicy> {
		const room = await this.repo.findById(roomId);
		if (!room) throw Errors.roomNotFound();
		return room;
	}

	/** Returns the UNIVERSITY room, auto-creating it if it doesn't exist yet. */
	async getUniversityRoom(): Promise<RoomWithPolicy> {
		return this.repo.findOrCreateUniversityRoom();
	}

	/**
	 * Returns (or lazily creates) the caller's batchmate room.
	 * groupKey format: "{batchYear}_{programCode}" — e.g. "2024_P132"
	 * Sourced from the caller's active profile.groupKey in Firestore.
	 */
	async getBatchmateRoom(groupKey: string): Promise<RoomWithPolicy> {
		if (!groupKey || !groupKey.includes("_")) {
			throw Errors.validationError(
				"groupKey must be in format {batchYear}_{programCode}, e.g. 2024_P132",
			);
		}
		return this.repo.findOrCreateBatchmateRoom(groupKey);
	}

	/**
	 * Validates access and returns the room.
	 *
	 * PUBLIC rooms: open to every authenticated user — no room_members check.
	 * PRIVATE rooms: requires an entry in room_members (future use).
	 *
	 * NOTE: room_members is intentionally NOT written for PUBLIC rooms.
	 * It is reserved for future manual-membership rooms (clubs, events, etc.).
	 */
	async requireMembership(roomId: string, userUid: string): Promise<RoomWithPolicy> {
		const room = await this.getRoom(roomId);

		if (room.visibility === "PUBLIC") {
			// No membership table check or write needed.
			// Every authenticated user can access PUBLIC rooms.
			return room;
		}

		// PRIVATE / HIDDEN — check room_members table
		const isMember = await this.repo.isMember(roomId, userUid);
		if (!isMember) throw Errors.notRoomMember();
		return room;
	}
}
