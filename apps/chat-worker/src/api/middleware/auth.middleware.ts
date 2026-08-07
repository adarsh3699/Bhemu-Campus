// ============================================================
// bCampus Chat Worker — Auth Middleware
// ============================================================
// Resolves every request into an authenticated AuthUser and
// attaches it to the Hono context.

import type { MiddlewareHandler } from "hono";
import { resolveRequestSession, resolveSession, extractBearerToken } from "../../auth/session";
import { Errors } from "../../lib/errors";
import { errorResponse } from "../../lib/response";
import type { AuthUser, Env } from "../../types";

declare module "hono" {
	interface ContextVariableMap {
		user: import("../../types").AuthUser;
	}
}

type SessionResolver = (token: string, env: Env) => Promise<AuthUser>;

function createAuthMiddleware(resolve: SessionResolver): MiddlewareHandler<{ Bindings: Env }> {
	return async (c, next) => {
		const authHeader = c.req.header("Authorization") ?? null;
		const token = extractBearerToken(authHeader);

		if (!token) {
			return errorResponse(c, Errors.missingToken());
		}

		try {
			c.set("user", await resolve(token, c.env));
			await next();
		} catch (err) {
			return errorResponse(c, err);
		}
	};
}

/** Canonical middleware for all chat REST endpoints. */
export const authMiddleware = createAuthMiddleware(resolveRequestSession);

/**
 * Explicit Firebase middleware for the report route's Firestore REST write.
 * This is not a chat-auth fallback; it is a narrow integration boundary until
 * that write moves to a Worker service credential.
 */
export const firebaseAuthMiddleware = createAuthMiddleware(resolveSession);
