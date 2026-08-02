const startupMarks = new Map<string, number>();

/** Lightweight dev diagnostics for measuring the critical startup path. */
export function markStartup(label: string) {
	const now = globalThis.performance?.now?.() ?? Date.now();
	startupMarks.set(label, now);
	// eslint-disable-next-line no-console
	if (__DEV__) console.debug(`[startup] ${label} ${Math.round(now)}ms`);
}

export function getStartupMarks() {
	return Object.fromEntries(startupMarks);
}
