// ============================================================
// bCampus Chat Worker — Session Resolution
// ============================================================
// Combines Firebase token verification with Firestore profile
// lookup to produce a fully resolved AuthUser for every request.

import { verifyFirebaseToken } from "./firebase";
import { Errors } from "../lib/errors";
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
	const projectId = env.FIREBASE_PROJECT_ID;

	const payload = await verifyFirebaseToken(token, projectId);
	const { uid, email } = payload;

	// Fetch Firestore profile for role + moderation
	const doc = await fetchFirestoreDoc(projectId, `users/${uid}`, token);

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

	return {
		uid,
		email,
		role,
		moderation: {
			status: effectiveStatus,
			expiresAt: moderationExpiresAt,
		},
	};
}

/**
 * Extracts the Bearer token from an Authorization header.
 * Returns null if missing or malformed.
 */
export function extractBearerToken(authHeader: string | null): string | null {
	if (!authHeader) return null;
	const parts = authHeader.split(" ");
	if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") return null;
	return parts[1] ?? null;
}
