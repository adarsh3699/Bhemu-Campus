// ============================================================
// bCampus Chat Worker — Per-User Rate Limiter
// ============================================================
// FRD §5.17
//
// Lives inside the Durable Object — the only place we have
// per-room, per-user in-memory state without Redis.
//
// Strategy: token bucket (configurable capacity + refill rate).
// On each consume() call, tokens are refilled based on elapsed
// time, then one token is deducted. If the bucket is empty the
// call is denied and the caller should return 429.

export interface RateLimitConfig {
	/** Maximum tokens in the bucket (burst limit) */
	capacity: number;
	/** Tokens added per second (sustained rate) */
	refillRate: number;
}

interface Bucket {
	tokens: number;
	lastRefill: number;
}

export class RateLimiter {
	private readonly buckets = new Map<string, Bucket>();
	private readonly config: RateLimitConfig;

	constructor(config: RateLimitConfig) {
		this.config = config;
	}

	/**
	 * Attempts to consume one token for `key` (usually `uid:action`).
	 * Returns true if allowed, false if rate-limited.
	 */
	consume(key: string): boolean {
		const now = Date.now();
		let bucket = this.buckets.get(key);

		if (!bucket) {
			bucket = { tokens: this.config.capacity, lastRefill: now };
			this.buckets.set(key, bucket);
		}

		// Refill tokens based on elapsed time
		const elapsed = (now - bucket.lastRefill) / 1000;
		bucket.tokens = Math.min(
			this.config.capacity,
			bucket.tokens + elapsed * this.config.refillRate,
		);
		bucket.lastRefill = now;

		if (bucket.tokens < 1) return false;

		bucket.tokens -= 1;
		return true;
	}

	/** Remove stale buckets to prevent unbounded memory growth. */
	prune(maxAgeMs = 300_000): void {
		const cutoff = Date.now() - maxAgeMs;
		for (const [key, bucket] of this.buckets) {
			if (bucket.lastRefill < cutoff) this.buckets.delete(key);
		}
	}
}
