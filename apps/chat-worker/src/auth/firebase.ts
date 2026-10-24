// ============================================================
// bCampus Chat Worker — Firebase JWT Verification
// ============================================================
// Verifies Firebase ID Tokens using Google's public JWKS.
// Keeps a module-level cache of the public keys so we don't
// hit Google on every request.

import { importX509, jwtVerify } from "jose";
import { FIREBASE_JWKS_URL } from "../constants";
import { Errors } from "../lib/errors";

interface GooglePublicKeys {
	[kid: string]: string;
}

interface KeyCache {
	keys: GooglePublicKeys;
	expiresAt: number;
}

// Module-level cache — lives for the lifetime of the Worker isolate.
let keyCache: KeyCache | null = null;
let publicKeysRequest: Promise<GooglePublicKeys> | null = null;
const importedKeyCache = new Map<string, CryptoKey>();

async function fetchPublicKeys(): Promise<GooglePublicKeys> {
	if (keyCache && Date.now() < keyCache.expiresAt) {
		return keyCache.keys;
	}
	if (publicKeysRequest) return publicKeysRequest;

	const request = (async () => {
		const res = await fetch(FIREBASE_JWKS_URL);
		if (!res.ok) {
			throw Errors.internal("Failed to fetch Firebase public keys.");
		}

		const cacheControl = res.headers.get("cache-control") ?? "";
		const match = cacheControl.match(/max-age=(\d+)/);
		const maxAge = match ? parseInt(match[1] ?? "3600", 10) : 3600;

		const keys = (await res.json()) as GooglePublicKeys;
		keyCache = { keys, expiresAt: Date.now() + maxAge * 1_000 };
		// Imported CryptoKeys belong to the previous JWKS snapshot. Rebuild them
		// once if Google rotates certificates instead of importing on every login.
		importedKeyCache.clear();
		return keys;
	})();
	publicKeysRequest = request;
	try {
		return await request;
	} finally {
		if (publicKeysRequest === request) publicKeysRequest = null;
	}
}

export interface FirebaseTokenPayload {
	uid: string;
	email: string | null;
	displayName: string | null;
}

/**
 * Verifies a Firebase ID Token and returns the decoded payload.
 * Throws AppError on failure — never returns null.
 */
export async function verifyFirebaseToken(
	token: string,
	projectId: string,
): Promise<FirebaseTokenPayload> {
	let header: { kid?: string };
	try {
		header = JSON.parse(atob(token.split(".")[0] ?? "")) as { kid?: string };
	} catch {
		throw Errors.invalidToken();
	}

	const kid = header.kid;
	if (!kid) throw Errors.invalidToken();

	const keys = await fetchPublicKeys();
	const certPem = keys[kid];
	if (!certPem) throw Errors.invalidToken();

	try {
		let publicKey = importedKeyCache.get(kid);
		if (!publicKey) {
			publicKey = await importX509(certPem, "RS256");
			importedKeyCache.set(kid, publicKey);
		}
		const { payload } = await jwtVerify(token, publicKey, {
			issuer: `https://securetoken.google.com/${projectId}`,
			audience: projectId,
			algorithms: ["RS256"],
		});

		return {
			uid: (payload["user_id"] ?? payload.sub) as string,
			email: (payload["email"] as string | undefined) ?? null,
			displayName: (payload["name"] as string | undefined) ?? null,
		};
	} catch {
		throw Errors.invalidToken();
	}
}
