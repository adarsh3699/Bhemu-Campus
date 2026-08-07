// ============================================================
// bCampus Chat Worker — Durable per-room sequence allocator
// ============================================================

const SEQUENCE_PREFIX = "room-sequence:";

/**
 * The Room DO serializes admission for a room. Persisting the high-water
 * mark in DO storage makes that ordering survive hibernation and restarts.
 * Failed reservations intentionally leave gaps; clients replay by cursor
 * and do not assume sequences are contiguous across failed writes.
 */
export class RoomSequenceStore {
	constructor(private readonly storage: DurableObjectStorage) {}

	async next(roomId: string): Promise<number> {
		const key = `${SEQUENCE_PREFIX}${roomId}`;
		const current = (await this.storage.get<number>(key)) ?? 0;
		const next = current + 1;
		await this.storage.put(key, next);
		return next;
	}

	/** Returns the latest allocated sequence for heartbeat gap detection. */
	async current(roomId: string): Promise<number> {
		return (await this.storage.get<number>(`${SEQUENCE_PREFIX}${roomId}`)) ?? 0;
	}
}
