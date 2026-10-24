// ============================================================
// Small in-isolate TTL cache with single-flight loading.
//
// This is deliberately only for low-churn metadata. Worker isolates are
// ephemeral, so callers must always have a database-backed source of truth.
// The in-flight map prevents a burst of identical requests from opening a
// burst of identical database queries in the same isolate.
// ============================================================

interface CacheEntry<T> {
	value: T;
	expiresAt: number;
}

export type TtlCacheEvent =
	| "memory_hit"
	| "kv_hit"
	| "miss"
	| "kv_error"
	| "db_load";

export interface TtlCacheEventContext {
	event: TtlCacheEvent;
	durationMs?: number;
}

export interface TtlCacheOptions {
	/** Optional cross-isolate KV layer. Always treated as a best-effort cache. */
	kv?: KVNamespace;
	/** Keeps KV writes off the request critical path when available. */
	schedule?: (promise: Promise<void>) => void;
	/** Namespace/version prefix to make future cache format changes safe. */
	keyPrefix?: string;
	/** Optional instrumentation hook. Cache keys are intentionally not exposed. */
	onEvent?: (context: TtlCacheEventContext) => void;
}

export class TtlCache<T> {
	private readonly entries = new Map<string, CacheEntry<T>>();
	private readonly inFlight = new Map<string, Promise<T>>();

	constructor(
		private readonly ttlMs: number,
		private readonly maxEntries = 256,
		private readonly ttlJitterMs = 0,
	) {}

	private effectiveTtlMs(): number {
		if (this.ttlJitterMs <= 0) return this.ttlMs;
		const jitter = Math.floor((Math.random() * 2 - 1) * this.ttlJitterMs);
		return Math.max(1_000, this.ttlMs + jitter);
	}

	private emit(options: TtlCacheOptions | undefined, event: TtlCacheEvent, durationMs?: number): void {
		try {
			options?.onEvent?.({ event, durationMs });
		} catch {
			// Observability must never affect cache correctness.
		}
	}

	get(key: string): T | undefined {
		const entry = this.entries.get(key);
		if (!entry) return undefined;
		if (entry.expiresAt <= Date.now()) {
			this.entries.delete(key);
			return undefined;
		}
		return entry.value;
	}

	set(key: string, value: T): void {
		if (this.entries.size >= this.maxEntries && !this.entries.has(key)) {
			const oldestKey = this.entries.keys().next().value;
			if (oldestKey) this.entries.delete(oldestKey);
		}
		this.entries.set(key, { value, expiresAt: Date.now() + this.effectiveTtlMs() });
	}

	async getOrSet(key: string, loader: () => Promise<T>, options?: TtlCacheOptions): Promise<T> {
		const cached = this.get(key);
		if (cached !== undefined) {
			this.emit(options, "memory_hit");
			return cached;
		}

		const existing = this.inFlight.get(key);
		if (existing) return existing;

		const storageKey = `${options?.keyPrefix ?? "bcampus:chat:v1"}:${key}`;
		const request = (async () => {
			const startedAt = Date.now();
			this.emit(options, "miss");
			if (options?.kv) {
				try {
					const kvValue = await options.kv.get<T>(storageKey, {
						type: "json",
						cacheTtl: Math.max(30, Math.ceil((this.ttlMs + this.ttlJitterMs) / 1_000)),
					});
					if (kvValue !== null) {
						this.set(key, kvValue);
						this.emit(options, "kv_hit", Date.now() - startedAt);
						return kvValue;
					}
				} catch {
					this.emit(options, "kv_error", Date.now() - startedAt);
					// KV is an optimization, never a dependency for chat correctness.
				}
			}

			const loadStartedAt = Date.now();
			const value = await loader();
			this.set(key, value);
			this.emit(options, "db_load", Date.now() - loadStartedAt);

			if (options?.kv) {
				const write = options.kv.put(storageKey, JSON.stringify(value), {
					expirationTtl: Math.max(60, Math.ceil((this.ttlMs + this.ttlJitterMs) / 1_000)),
				}).catch(() => undefined);
				if (options.schedule) options.schedule(write);
				else void write;
			}

			return value;
		})()
			.finally(() => {
				if (this.inFlight.get(key) === request) this.inFlight.delete(key);
			});

		this.inFlight.set(key, request);
		return request;
	}
}
