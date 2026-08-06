// ============================================================
// bCampus Chat Worker — Idempotency Store
// ============================================================
// FRD §5.16
//
// Tracks client-supplied idempotency keys so that duplicate
// POST /messages retries return the already-created message
// instead of inserting a new one.
//
// Storage: Durable Object persistent storage (survives restarts).
// TTL:     24 hours — after which keys are evicted.
//
// Key format stored:  idempotency:{roomId}:{key}  → messageId

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class IdempotencyStore {
	constructor(private readonly storage: DurableObjectStorage) {}

	private storageKey(roomId: string, key: string): string {
		return `idempotency:${roomId}:${key}`;
	}

	/** Returns the existing messageId if this key was already processed, else null. */
	async get(roomId: string, key: string): Promise<string | null> {
		const stored = await this.storage.get<{ messageId: string; expiresAt: number }>(
			this.storageKey(roomId, key),
		);
		if (!stored) return null;
		if (Date.now() > stored.expiresAt) {
			await this.storage.delete(this.storageKey(roomId, key));
			return null;
		}
		return stored.messageId;
	}

	/** Records a newly created message ID against its idempotency key. */
	async set(roomId: string, key: string, messageId: string): Promise<void> {
		await this.storage.put(this.storageKey(roomId, key), {
			messageId,
			expiresAt: Date.now() + TTL_MS,
		});
	}
}
