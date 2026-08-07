// ============================================================
// bCampus Chat Worker — Durable duplicate-spam admission state
// ============================================================
//
// The Room Durable Object is already the serialized authority for a room's
// message admission. Keep the short duplicate window there so the hot path
// does not need a Neon read. Entries are reservations: a failed database
// write can release one, while an abandoned request expires automatically.

import { SPAM_MAX_IDENTICAL, SPAM_WINDOW_MS } from "../../constants";

interface Reservation {
	id: string;
	expiresAt: number;
}

interface FingerprintState {
	reservations: Reservation[];
}

export class SpamAdmissionStore {
	constructor(private readonly storage: DurableObjectStorage) {}

	private key(roomId: string, uid: string, fingerprint: string): string {
		return `spam:${roomId}:${uid}:${fingerprint}`;
	}

	/**
	 * Atomically reserves one duplicate window slot. Durable Object input
	 * gates serialize the storage read/write sequence for this room, so two
	 * concurrent sends cannot both observe the same count.
	 */
	async admit(
		roomId: string,
		uid: string,
		fingerprint: string,
		reservationId: string,
	): Promise<boolean> {
		const key = this.key(roomId, uid, fingerprint);
		const now = Date.now();
		const stored = await this.storage.get<FingerprintState>(key);
		const active = (stored?.reservations ?? []).filter((entry) => entry.expiresAt > now);

		if (active.length >= SPAM_MAX_IDENTICAL) {
			if (active.length !== (stored?.reservations.length ?? 0)) {
				await this.storage.put(key, { reservations: active });
			}
			return false;
		}

		active.push({ id: reservationId, expiresAt: now + SPAM_WINDOW_MS });
		await this.storage.put(key, { reservations: active });
		return true;
	}

	/** Releases a reservation when the database write fails. */
	async release(
		roomId: string,
		uid: string,
		fingerprint: string,
		reservationId: string,
	): Promise<void> {
		const key = this.key(roomId, uid, fingerprint);
		const stored = await this.storage.get<FingerprintState>(key);
		if (!stored) return;

		const now = Date.now();
		const active = stored.reservations.filter(
			(entry) => entry.expiresAt > now && entry.id !== reservationId,
		);
		if (active.length === 0) {
			await this.storage.delete(key);
		} else {
			await this.storage.put(key, { reservations: active });
		}
	}
}
