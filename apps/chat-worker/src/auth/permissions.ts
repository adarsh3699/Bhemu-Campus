// ============================================================
// bCampus Chat Worker — Permission Checks
// ============================================================
// Pure functions — no DB calls.  Every business-rule permission
// decision passes through here so it can be tested independently.

import type { AppRole } from "../types";
import { roleAtLeast } from "../lib/utils";
import { Errors } from "../lib/errors";

/**
 * Assert that `userRole` meets or exceeds `requiredRole`.
 * Throws AppError(INSUFFICIENT_ROLE) on failure.
 */
export function requireRole(userRole: AppRole, requiredRole: AppRole): void {
	if (!roleAtLeast(userRole, requiredRole)) {
		throw Errors.insufficientRole(requiredRole);
	}
}

/**
 * Assert that the user is the author of a resource, OR is at least a moderator.
 * Used for edit / delete operations.
 */
export function requireAuthorOrModerator(
	userUid: string,
	authorUid: string,
	userRole: AppRole,
): void {
	if (userUid !== authorUid && !roleAtLeast(userRole, "MODERATOR")) {
		throw Errors.permissionDenied();
	}
}

/**
 * Assert that the user is the author. Strict — no moderator override.
 */
export function requireAuthor(userUid: string, authorUid: string): void {
	if (userUid !== authorUid) {
		throw Errors.permissionDenied();
	}
}

/**
 * Assert that the user is at least a moderator.
 */
export function requireModerator(userRole: AppRole): void {
	requireRole(userRole, "MODERATOR");
}

/**
 * Assert that the user is an admin.
 */
export function requireAdmin(userRole: AppRole): void {
	requireRole(userRole, "ADMIN");
}
