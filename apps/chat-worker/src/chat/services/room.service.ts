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
import { TtlCache, type TtlCacheOptions } from "../../lib/ttlCache";
import { metric } from "../../lib/metrics";

const ROOM_METADATA_TTL_MS = 30_000;
const ROOM_METADATA_TTL_JITTER_MS = 5_000;
const GROUP_KEY_PATTERN = /^\d{4}_[A-Za-z0-9-]{1,80}$/;
const roomMetadataCache = new TtlCache<RoomWithPolicy>(ROOM_METADATA_TTL_MS, 256, ROOM_METADATA_TTL_JITTER_MS);
const roomListCache = new TtlCache<RoomWithPolicy[]>(ROOM_METADATA_TTL_MS, 1, ROOM_METADATA_TTL_JITTER_MS);

interface RoomLookupOptions {
	/** Only use this for read-only metadata. Authorization defaults to fresh DB data. */
	cache?: boolean;
}

export class RoomService {
	private readonly repo: RoomRepository;
	private readonly cacheOptions: TtlCacheOptions;

	constructor(db: Database, cacheOptions: TtlCacheOptions = {}) {
		this.repo = new RoomRepository(db);
		this.cacheOptions = {
			...cacheOptions,
			keyPrefix: "bcampus:chat:rooms:v1",
			onEvent: (context) => {
				cacheOptions.onEvent?.(context);
				// Do not log memory hits on every request; the local hot path must
				// remain cheaper than the database fallback it replaces.
				if (context.event === "memory_hit") return;
				metric("chat.cache.event", {
					cacheName: "room_metadata",
					event: context.event,
					durationMs: context.durationMs,
				});
			},
		};
	}

	async listRooms(): Promise<RoomWithPolicy[]> {
		return roomListCache.getOrSet("all", () => this.repo.findAll(), this.cacheOptions);
	}

	async getRoom(roomId: string, options: RoomLookupOptions = {}): Promise<RoomWithPolicy> {
		const load = async (): Promise<RoomWithPolicy> => {
			const room = await this.repo.findById(roomId);
			if (!room) throw Errors.roomNotFound();
			return room;
		};
		if (!options.cache) return load();
		return roomMetadataCache.getOrSet(`room:${roomId}`, load, this.cacheOptions);
	}

	/** Returns the UNIVERSITY room, auto-creating it if it doesn't exist yet. */
	async getUniversityRoom(): Promise<RoomWithPolicy> {
		return roomMetadataCache.getOrSet("university", () => this.repo.findOrCreateUniversityRoom(), this.cacheOptions);
	}

	/**
	 * Returns (or lazily creates) the caller's batchmate room.
	 * groupKey format: "{batchYear}_{programCode}" — e.g. "2024_P132"
	 * Sourced from the caller's active profile.groupKey in Firestore.
	 */
	async getBatchmateRoom(groupKey: string): Promise<RoomWithPolicy> {
		if (!GROUP_KEY_PATTERN.test(groupKey)) {
			throw Errors.validationError(
				"groupKey must be in format {batchYear}_{programCode}, e.g. 2024_P132",
			);
		}
		return roomMetadataCache.getOrSet(
			`batchmate:${groupKey}`,
			() => this.repo.findOrCreateBatchmateRoom(groupKey),
			this.cacheOptions,
		);
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
	async requireMembership(
		roomId: string,
		userUid: string,
		options: RoomLookupOptions = {},
	): Promise<RoomWithPolicy> {
		const room = await this.getRoom(roomId, options);

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
