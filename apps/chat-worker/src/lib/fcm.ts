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
	/** iOS notification thread identifier. Android grouping is not supported by FCM HTTP v1. */
	threadId?: string;
	/** Optional APNs subtitle and browser notification click destination. */
	subtitle?: string;
	webLink?: string;
}

export interface FcmDispatchResult {
	requested: number;
	sent: number;
	failed: number;
}

type FcmSendResult = {
	sent: boolean;
	errorCode?: string;
};

type FcmHttpV1Payload = {
	message: {
		token: string;
		notification: {
			title: string;
			body: string;
		};
		data: Record<string, string>;
		android: {
			priority: "HIGH";
			notification: {
				channel_id: string;
			};
		};
		apns?: {
			payload: {
				aps: {
					"thread-id": string;
					alert?: { subtitle: string };
				};
			};
		};
		webpush?: {
			fcm_options: {
				link: string;
			};
		};
	};
};

const CHAT_NOTIFICATION_CHANNEL_ID = "chat-messages";
const FCM_REQUEST_TIMEOUT_MS = 10_000;

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
		signal: AbortSignal.timeout(FCM_REQUEST_TIMEOUT_MS),
		body: new URLSearchParams({
			grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
			assertion: jwt,
		}),
	});

	if (!tokenRes.ok) {
		const text = await tokenRes.text();
		throw new Error(`Failed to get OAuth access token: ${tokenRes.status} ${text}`);
	}

	const tokenData = (await tokenRes.json()) as { access_token: string; expires_in: number };
	cachedAccessToken = tokenData.access_token;
	tokenExpiresAt = Date.now() + tokenData.expires_in * 1000;
	cachedScopes = scopeStr;

	return cachedAccessToken;
}

function readFcmErrorCode(errorText: string): string | undefined {
	try {
		const payload = JSON.parse(errorText) as {
			error?: {
				status?: string;
				details?: Array<{ errorCode?: string }>;
			};
		};
		return (
			payload.error?.details?.find((detail) => typeof detail.errorCode === "string")?.errorCode ??
			payload.error?.status
		);
	} catch {
		return undefined;
	}
}

/**
 * Builds an FCM HTTP v1 payload with platform-specific fields kept separate.
 *
 * Android notification grouping is intentionally not set here: the FCM HTTP v1
 * AndroidNotification schema has no `group` field. APNs supports `thread-id`,
 * while web push supports a click link, so those are added only to their own
 * platform blocks.
 */
export function buildFcmPayload(token: string, message: FcmMessage): FcmHttpV1Payload {
	const data = Object.fromEntries(
		Object.entries(message.data ?? {}).filter(([, value]) => typeof value === "string")
	) as Record<string, string>;

	return {
		message: {
			token,
			notification: {
				title: message.title,
				body: message.body,
			},
			data,
			android: {
				priority: "HIGH",
				notification: {
					channel_id: CHAT_NOTIFICATION_CHANNEL_ID,
				},
			},
			...(message.threadId
				? {
						apns: {
							payload: {
								aps: {
									"thread-id": message.threadId,
									...(message.subtitle ? { alert: { subtitle: message.subtitle } } : {}),
								},
							},
						},
					}
				: {}),
			...(message.webLink ? { webpush: { fcm_options: { link: message.webLink } } } : {}),
		},
	};
}

async function sendToSingleToken(
	token: string,
	message: FcmMessage,
	env: Env,
	accessToken: string
): Promise<FcmSendResult> {
	const projectId = env.FIREBASE_PROJECT_ID;
	const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

	const res = await fetch(url, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
		},
		signal: AbortSignal.timeout(FCM_REQUEST_TIMEOUT_MS),
		body: JSON.stringify(buildFcmPayload(token, message)),
	});

	if (!res.ok) {
		const errorText = await res.text();
		const errorCode = readFcmErrorCode(errorText);
		logger.warn("fcm.send_failed", {
			token: token.slice(0, 10),
			status: res.status,
			errorCode,
			error: errorText.slice(0, 500),
		});
		return { sent: false, errorCode };
	}

	return { sent: true };
}

/**
 * Sends FCM push to a list of tokens. Silently skips invalid/expired tokens.
 */
export async function sendFcmToTokens(tokens: string[], message: FcmMessage, env: Env): Promise<FcmDispatchResult> {
	const uniqueTokens = [...new Set(tokens.map((token) => token.trim()).filter(Boolean))];
	if (uniqueTokens.length === 0) {
		logger.warn("fcm.no_recipients", {
			title: message.title,
			messageId: message.data?.messageId,
			roomId: message.data?.roomId,
		});
		return { requested: 0, sent: 0, failed: 0 };
	}
	let sent = 0;
	let failed = 0;
	const failureCodes: Record<string, number> = {};

	try {
		const accessToken = await getAccessToken(env, ["https://www.googleapis.com/auth/firebase.messaging"]);

		// Fire concurrently (Worker concurrent outgoing fetch limits apply, typically 50)
		// For massive scale, this would be chunked.
		const chunked = [];
		const chunkSize = 40;
		for (let i = 0; i < uniqueTokens.length; i += chunkSize) {
			chunked.push(uniqueTokens.slice(i, i + chunkSize));
		}

		for (const chunk of chunked) {
			const results = await Promise.all(
				chunk.map((token) =>
					sendToSingleToken(token, message, env, accessToken).catch((error): FcmSendResult => {
						logger.warn("fcm.send_exception", { token: token.slice(0, 10), error: String(error) });
						return { sent: false };
					})
				)
			);
			results.forEach((result) => {
				if (result.sent) sent += 1;
				else {
					failed += 1;
					const code = result.errorCode ?? "UNKNOWN";
					failureCodes[code] = (failureCodes[code] ?? 0) + 1;
				}
			});
		}

		logger.info("fcm.dispatched", {
			requested: uniqueTokens.length,
			sent,
			failed,
			title: message.title,
			messageId: message.data?.messageId,
			roomId: message.data?.roomId,
			failureCodes,
		});
	} catch (error) {
		logger.error("fcm.dispatch_error", { error: String(error) });
		failed += uniqueTokens.length - sent;
	}

	return { requested: uniqueTokens.length, sent, failed };
}
