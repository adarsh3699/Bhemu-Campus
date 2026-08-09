// ============================================================
// bCampus Chat Worker — Room Policy Enforcement
// ============================================================
// Evaluates Room Policy rules against the requesting user's role.
// All decisions are data-driven — no hardcoded permission checks.

import type { RoomPolicy } from "../../db/schema";
import type { AppRole } from "../../types";
import { roleAtLeast } from "../../lib/utils";
import { Errors } from "../../lib/errors";

type PolicyAction =
	| "send_message"
	| "send_attachment"
	| "create_poll"
	| "create_announcement"
	| "pin_message";

/**
 * Returns the required role for a given policy action.
 */
function requiredRole(policy: RoomPolicy, action: PolicyAction): AppRole {
	switch (action) {
		case "send_message":
			return policy.sendMessageRole as AppRole;
		case "send_attachment":
			return policy.sendAttachmentRole as AppRole;
		case "create_poll":
			return policy.createPollRole as AppRole;
		case "create_announcement":
			return policy.createAnnouncementRole as AppRole;
		case "pin_message":
			return policy.pinMessageRole as AppRole;
	}
}

/**
 * Asserts that `userRole` is allowed to perform `action` in this room.
 * Throws AppError(PERMISSION_DENIED) if not allowed.
 */
export function enforceRoomPolicy(
	policy: RoomPolicy,
	userRole: AppRole,
	action: PolicyAction,
): void {
	const required = requiredRole(policy, action);
	if (!roleAtLeast(userRole, required)) {
		throw Errors.permissionDenied(action.replace("_", " "));
	}
}

/**
 * Returns true if `userRole` can perform `action`.
 */
export function canPerformAction(
	policy: RoomPolicy,
	userRole: AppRole,
	action: PolicyAction,
): boolean {
	const required = requiredRole(policy, action);
	return roleAtLeast(userRole, required);
}
