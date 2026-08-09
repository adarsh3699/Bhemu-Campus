// ============================================================
// bCampus Chat Worker — Environment Validation
// ============================================================
// FRD §8.19: "fail fast if required configuration is missing"
//
// Called once at the top of the fetch/scheduled handler before
// any request processing begins. Returns a typed Env or throws
// with a clear message about the missing variable.

import type { Env } from "../types";

const REQUIRED_BINDINGS: Array<keyof Env> = [
	"DATABASE_URL",
	"FIREBASE_PROJECT_ID",
	"CHAT_SESSION_SECRET",
	"CHAT_ROOM",
];

/**
 * Validates that all required environment bindings are present.
 * Throws a descriptive Error (not AppError — this is a deployment
 * misconfiguration, not a user-facing error) so Cloudflare logs
 * show exactly what is missing.
 */
export function validateEnv(env: Env): void {
	const missing: string[] = [];

	for (const key of REQUIRED_BINDINGS) {
		const val = env[key];
		if (val === undefined || val === null || val === "") {
			missing.push(key);
		}
	}

	if (missing.length > 0) {
		throw new Error(
			`[chat-worker] Missing required environment bindings: ${missing.join(", ")}. ` +
				`Check your wrangler.toml and .dev.vars.`,
		);
	}
}
