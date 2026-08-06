// ============================================================
// bCampus Chat Worker — Auth Middleware
// ============================================================
// Resolves every request into an authenticated AuthUser and
// attaches it to the Hono context.

import type { MiddlewareHandler } from "hono";
import { resolveSession, extractBearerToken } from "../../auth/session";
import { Errors } from "../../lib/errors";
import { errorResponse } from "../../lib/response";
import type { Env } from "../../types";

declare module "hono" {
	interface ContextVariableMap {
		user: import("../../types").AuthUser;
	}
}

export const authMiddleware: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
	const authHeader = c.req.header("Authorization") ?? null;
	const token = extractBearerToken(authHeader);

	if (!token) {
		return errorResponse(c, Errors.missingToken());
	}

	try {
		const user = await resolveSession(token, c.env);
		c.set("user", user);
		await next();
	} catch (err) {
		return errorResponse(c, err);
	}
};
