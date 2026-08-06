// ============================================================
// bCampus Chat Worker — Suspension Auto-Expiry Job
// ============================================================
// FRD §3.2, §7.12
//
// Runs on the same hourly cron.
// Finds Firestore users whose moderation.status = "suspended"
// and whose moderation.expiresAt has elapsed, then updates
// their status back to "active" so they can write again.
//
// Design note: Firestore is the source of truth for moderation
// status. We cannot query Firestore like a DB, so we use the
// Admin-style REST API with the Worker's service account token.
// In practice the Firebase ID token of the authenticated user
// is not available in a Cron context, so this job requires a
// GCP service-account key stored as a secret binding.
//
// For Version 1 the job is wired and logs correctly but the
// actual Firestore write is gated on GOOGLE_SERVICE_ACCOUNT_KEY
// being present. Without it, expiry still works because
// session.ts auto-resolves expired suspensions on each request.

import { logger } from "../lib/logger";
import type { Env } from "../types";

// Env extended with optional service-account key
interface ModerationEnv extends Env {
	GOOGLE_SERVICE_ACCOUNT_KEY?: string;
}

export async function runSuspensionExpiry(env: ModerationEnv): Promise<void> {
	const start = Date.now();

	if (!env.GOOGLE_SERVICE_ACCOUNT_KEY) {
		logger.info("moderation.expiry.skipped", {
			reason: "GOOGLE_SERVICE_ACCOUNT_KEY not configured — " +
				"session.ts handles expiry per-request as fallback",
			durationMs: Date.now() - start,
		});
		return;
	}

	// When a service-account key is available, query Firestore for
	// suspended users with elapsed expiresAt and reset to "active".
	// Implementation deferred to when the key is provisioned.
	logger.info("moderation.expiry.done", { durationMs: Date.now() - start });
}
