// ============================================================
// bCampus Chat Worker — Short-lived chat session tokens
// ============================================================
// Firebase authentication is intentionally used only to establish this
// session. Message requests then verify this local HMAC token instead of
// performing a Firestore profile read on every request.

import { SignJWT, jwtVerify } from "jose";
import type { JWTPayload } from "jose";
import type { AuthUser, Env } from "../types";

const SESSION_ISSUER = "bhemu-chat";
const SESSION_AUDIENCE = "bhemu-chat-api";
const SESSION_TTL_SECONDS = 5 * 60;

interface ChatSessionClaims extends JWTPayload {
	kind: "chat_session";
	uid: string;
	email: string | null;
	displayName: string;
	role: AuthUser["role"];
	moderation: AuthUser["moderation"];
}

function secretBytes(env: Env): Uint8Array {
	if (!env.CHAT_SESSION_SECRET) {
		throw new Error("CHAT_SESSION_SECRET is not configured");
	}
	return new TextEncoder().encode(env.CHAT_SESSION_SECRET);
}

export interface IssuedChatSession {
	token: string;
	expiresAt: string;
}

export async function issueChatSession(user: AuthUser, env: Env): Promise<IssuedChatSession> {
	const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1_000);
	const claims: ChatSessionClaims = {
		kind: "chat_session",
		uid: user.uid,
		email: user.email,
		displayName: user.displayName,
		role: user.role,
		moderation: user.moderation,
	};

	const token = await new SignJWT(claims)
		.setProtectedHeader({ alg: "HS256", typ: "JWT" })
		.setIssuer(SESSION_ISSUER)
		.setAudience(SESSION_AUDIENCE)
		.setIssuedAt()
		.setExpirationTime(Math.floor(expiresAt.getTime() / 1_000))
		.sign(secretBytes(env));

	return { token, expiresAt: expiresAt.toISOString() };
}

/** Returns null when the bearer is a Firebase token rather than a chat token. */
export async function verifyChatSession(
	token: string,
	env: Env,
): Promise<AuthUser | null> {
	try {
		const { payload } = await jwtVerify<ChatSessionClaims>(token, secretBytes(env), {
			algorithms: ["HS256"],
			issuer: SESSION_ISSUER,
			audience: SESSION_AUDIENCE,
		});
		if (
			payload.kind !== "chat_session" ||
			typeof payload.uid !== "string" ||
			(payload.role !== "STUDENT" && payload.role !== "MODERATOR" && payload.role !== "ADMIN")
		) {
			return null;
		}

		return {
			uid: payload.uid,
			email: payload.email ?? null,
			// Sessions created before author names were added remain valid until
			// expiry. Their next bootstrap supplies the canonical display name.
			displayName: typeof payload.displayName === "string" && payload.displayName.trim()
				? payload.displayName.slice(0, 100)
				: "Student",
			role: payload.role,
			moderation: payload.moderation,
		};
	} catch {
		return null;
	}
}
