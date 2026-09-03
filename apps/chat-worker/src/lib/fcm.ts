// ============================================================
// bCampus Chat Worker — FCM Client (HTTP v1)
// ============================================================
// Lightweight Firebase Cloud Messaging client for Cloudflare Workers.
// Authenticates via Service Account JSON (OAuth2) and sends multicast pushes.

import type { Env } from "../types";
import { logger } from "./logger";

export interface FcmMessage {
	title: string;
	body: string;
	data?: Record<string, string>;
}

// Memory cache for the OAuth2 access token to avoid re-signing on every push
let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;
let cachedScopes = "";

/**
 * Gets a Google OAuth2 access token for the given scopes.
 * Uses Web Crypto to sign a JWT using the Service Account private key.
 */
export async function getAccessToken(env: Env, scopes: string[]): Promise<string> {
	const scopeStr = scopes.join(" ");
	if (cachedAccessToken && cachedScopes === scopeStr && Date.now() < tokenExpiresAt - 60000) {
		return cachedAccessToken;
	}

	const saStr = env.FIREBASE_SERVICE_ACCOUNT_KEY;
	if (!saStr) throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not configured");
	
	const serviceAccount = JSON.parse(saStr);
	const privateKey = serviceAccount.private_key;
	const clientEmail = serviceAccount.client_email;

	// 1. Create JWT header
	const header = { alg: "RS256", typ: "JWT" };
	const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

	// 2. Create JWT claim set
	const now = Math.floor(Date.now() / 1000);
	const claimSet = {
		iss: clientEmail,
		scope: scopeStr,
		aud: "https://oauth2.googleapis.com/token",
		exp: now + 3600,
		iat: now,
	};
	const claimB64 = btoa(JSON.stringify(claimSet)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

	const signatureInput = `${headerB64}.${claimB64}`;

	// 3. Import private key
	const pemHeader = "-----BEGIN PRIVATE KEY-----";
	const pemFooter = "-----END PRIVATE KEY-----";
	const pemContents = privateKey.replace(pemHeader, "").replace(pemFooter, "").replace(/\s/g, "");
	const binaryDerString = atob(pemContents);
	const binaryDer = new Uint8Array(binaryDerString.length);
	for (let i = 0; i < binaryDerString.length; i++) {
		binaryDer[i] = binaryDerString.charCodeAt(i);
	}

	const cryptoKey = await crypto.subtle.importKey(
		"pkcs8",
		binaryDer.buffer,
		{ name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
		false,
		["sign"]
	);

	// 4. Sign the JWT
	const encoder = new TextEncoder();
	const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, encoder.encode(signatureInput));
	const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
		.replace(/=/g, "")
		.replace(/\+/g, "-")
		.replace(/\//g, "_");

	const jwt = `${signatureInput}.${signatureB64}`;

	// 5. Exchange JWT for Access Token
	const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
			assertion: jwt,
		}),
	});

	if (!tokenRes.ok) {
		const text = await tokenRes.text();
		throw new Error(`Failed to get OAuth access token: ${tokenRes.status} ${text}`);
	}

	const tokenData = await tokenRes.json() as { access_token: string; expires_in: number };
	cachedAccessToken = tokenData.access_token;
	tokenExpiresAt = Date.now() + tokenData.expires_in * 1000;
	cachedScopes = scopeStr;

	return cachedAccessToken;
}

/**
 * Sends a single FCM push message via HTTP v1 API.
 * 
 * Note: The HTTP v1 API does not support multicast (multiple tokens in one request)
 * natively via a single `tokens` array like the old legacy API did.
 * We must fire concurrent requests.
 */
async function sendToSingleToken(token: string, message: FcmMessage, env: Env, accessToken: string): Promise<boolean> {
	const projectId = env.FIREBASE_PROJECT_ID;
	const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

	const res = await fetch(url, {
		method: "POST",
		headers: {
			"Authorization": `Bearer ${accessToken}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			message: {
				token,
				notification: {
					title: message.title,
					body: message.body,
				},
				data: message.data ?? {},
				android: {
					priority: "HIGH",
					notification: {
						channel_id: "chat-messages",
					},
				},
			},
		}),
	});

	if (!res.ok) {
		const errorText = await res.text();
		logger.warn("fcm.send_failed", { token: token.slice(0, 10), status: res.status, error: errorText });
		return false;
	}
	
	return true;
}

/**
 * Sends FCM push to a list of tokens. Silently skips invalid/expired tokens.
 */
export async function sendFcmToTokens(
	tokens: string[],
	message: FcmMessage,
	env: Env
): Promise<void> {
	if (tokens.length === 0) return;

	try {
		const accessToken = await getAccessToken(env, ["https://www.googleapis.com/auth/firebase.messaging"]);
		
		// Fire concurrently (Worker concurrent outgoing fetch limits apply, typically 50)
		// For massive scale, this would be chunked.
		const chunked = [];
		const chunkSize = 40;
		for (let i = 0; i < tokens.length; i += chunkSize) {
			chunked.push(tokens.slice(i, i + chunkSize));
		}

		for (const chunk of chunked) {
			await Promise.all(chunk.map((t) => sendToSingleToken(t, message, env, accessToken).catch(() => false)));
		}
		
		logger.info("fcm.dispatched", { count: tokens.length, title: message.title });
	} catch (error) {
		logger.error("fcm.dispatch_error", { error: String(error) });
	}
}
