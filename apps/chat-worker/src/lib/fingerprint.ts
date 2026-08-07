// ============================================================
// bCampus Chat Worker — Server-owned message fingerprint
// ============================================================

import { normalizeMessageContent } from "./utils";

let cachedKey: { secret: string; key: CryptoKey } | null = null;

async function getFingerprintKey(secret: string): Promise<CryptoKey> {
	if (cachedKey?.secret === secret) return cachedKey.key;

	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	cachedKey = { secret, key };
	return key;
}

/**
 * Creates a keyed fingerprint without storing message content in the DO.
 * The client never supplies this value; the Worker computes it after Zod
 * validation. Reusing the chat-session secret avoids a new production
 * binding while keeping fingerprints opaque to storage readers.
 */
export async function messageFingerprint(
	content: string | null | undefined,
	secret: string,
): Promise<string | null> {
	if (!content) return null;
	const normalized = normalizeMessageContent(content);
	if (!normalized) return null;

	const key = await getFingerprintKey(secret);
	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(normalized),
	);
	return [...new Uint8Array(signature)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}
