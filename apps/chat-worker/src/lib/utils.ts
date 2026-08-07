// ============================================================
// bCampus Chat Worker — Shared Utilities
// ============================================================

/**
 * Normalize message content for duplicate detection.
 * Trims whitespace, collapses repeated spaces and newlines,
 * and lowercases for case-insensitive comparison.
 */
export function normalizeMessageContent(content: string): string {
	return content
		.trim()
		.replace(/\s+/g, " ")
		.toLowerCase();
}

/**
 * Role order for permission comparisons.
 * Higher index = more permissions.
 */
const ROLE_ORDER = ["STUDENT", "MODERATOR", "ADMIN"] as const;
type AppRole = (typeof ROLE_ORDER)[number];

/**
 * Returns true if `userRole` meets or exceeds `requiredRole`.
 */
export function roleAtLeast(userRole: AppRole, requiredRole: AppRole): boolean {
	return ROLE_ORDER.indexOf(userRole) >= ROLE_ORDER.indexOf(requiredRole);
}

/**
 * Generate a unique request ID for tracing.
 */
export function generateRequestId(): string {
	return crypto.randomUUID();
}
