// ============================================================
// bCampus Chat Worker — Session Resolution
// ============================================================
// Resolves Firebase tokens during session bootstrap and short-lived local
// chat sessions on the chat hot path into a fully populated AuthUser.

import { verifyFirebaseToken } from "./firebase";
import { verifyChatSession } from "./chat-session";
import { Errors } from "../lib/errors";
import { metric } from "../lib/metrics";
import type { AuthUser, Env } from "../types";

// ---- Firestore REST API helpers ----

interface FirestoreStringValue {
	stringValue: string;
}
interface FirestoreTimestampValue {
	timestampValue: string;
}
interface FirestoreNullValue {
	nullValue: null;
}
type FirestoreValue =
	| FirestoreStringValue
	| FirestoreTimestampValue
	| FirestoreNullValue
	| { mapValue: { fields: Record<string, FirestoreValue> } };

function getStr(v: FirestoreValue | undefined): string | null {
	if (!v) return null;
	if ("stringValue" in v) return v.stringValue;
	return null;
}

interface FirestoreDoc {
	fields?: Record<string, FirestoreValue>;
}

async function fetchFirestoreDoc(
	projectId: string,
	path: string,
	idToken: string,
): Promise<FirestoreDoc | null> {
	const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}`;
	const res = await fetch(url, {
		headers: { Authorization: `Bearer ${idToken}` },
	});
	if (res.status === 404) return null;
	if (!res.ok) return null;
	return (await res.json()) as FirestoreDoc;
}

/**
 * Resolves a Firebase ID token into a fully populated AuthUser.
 *
 * 1. Verifies the JWT.
 * 2. Fetches the Firestore `users/{uid}` doc to get role + moderation.
 * 3. Enforces account moderation state.
 */
export async function resolveSession(token: string, env: Env): Promise<AuthUser> {
	const startedAt = Date.now();
	const projectId = env.FIREBASE_PROJECT_ID;

	const verificationStartedAt = Date.now();
	const payload = await verifyFirebaseToken(token, projectId);
	const verificationDurationMs = Date.now() - verificationStartedAt;
	const { uid, email } = payload;

	// Fetch Firestore profile for role + moderation
	const profileStartedAt = Date.now();
	const doc = await fetchFirestoreDoc(projectId, `users/${uid}`, token);
	const profileDurationMs = Date.now() - profileStartedAt;

	const fields = doc?.fields ?? {};
	const role = (getStr(fields["role"]) as AuthUser["role"] | null) ?? "STUDENT";

	const modFields =
		"mapValue" in (fields["moderation"] ?? {})
			? (fields["moderation"] as { mapValue: { fields: Record<string, FirestoreValue> } })
					.mapValue.fields
			: {};

	const moderationStatus =
		(getStr(modFields["status"]) as AuthUser["moderation"]["status"] | null) ?? "active";

	const expiresAtRaw = modFields["expiresAt"];
	const moderationExpiresAt =
		expiresAtRaw && "timestampValue" in expiresAtRaw
			? (expiresAtRaw as FirestoreTimestampValue).timestampValue
			: null;

	// Banned users are blocked from ALL requests — including reads (FRD §7.11)
	if (moderationStatus === "banned") {
		throw Errors.accountBanned();
	}

	// Suspended users CAN read (list messages, view rooms) but CANNOT write
	// (send messages, react, vote, report). The write-block is enforced in
	// each service method via assertCanWrite(), NOT here (FRD §7.12).
	//
	// We do expire-check here so an expired suspension resolves to "active"
	// without waiting for a Firestore background update.
	const effectiveStatus =
		moderationStatus === "suspended" &&
		moderationExpiresAt &&
		new Date(moderationExpiresAt) <= new Date()
			? "active"
			: moderationStatus;

	const user = {
		uid,
		email,
		role,
		moderation: {
			status: effectiveStatus,
			expiresAt: moderationExpiresAt,
		},
	};
	metric("chat.auth.session", {
		source: "firebase",
		durationMs: Date.now() - startedAt,
		verificationDurationMs,
		profileDurationMs,
	});
	return user;
}

/**
 * Resolves the canonical chat credential.
 *
 * Firebase tokens are accepted only by POST /api/v1/session. Normal chat
 * REST and WebSocket requests must use the short-lived local session so
 * authentication has one hot-path contract and never silently downgrades to
 * a Firestore lookup.
 */
export async function resolveRequestSession(
	token: string,
	env: Env,
): Promise<AuthUser> {
	const startedAt = Date.now();
	const chatUser = await verifyChatSession(token, env);
	if (!chatUser) {
		metric("chat.auth.session", {
			source: "chat_session_rejected",
			durationMs: Date.now() - startedAt,
		});
		throw Errors.chatSessionRequired();
	}

	metric("chat.auth.session", {
		source: "chat_session",
		durationMs: Date.now() - startedAt,
	});
	return chatUser;
}

/**
 * Extracts the Bearer token from an Authorization header.
 * Returns null if missing or malformed.
 */
export function extractBearerToken(authHeader: string | null): string | null {
	if (!authHeader) return null;
	const parts = authHeader.split(" ");
	if (parts.length !== 2 || parts[0]?.toLowerCase() !== "bearer") return null;
	return parts[1] ?? null;
}
