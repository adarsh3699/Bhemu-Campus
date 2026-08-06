// ============================================================
// bCampus Chat Worker — Spam Detector
// ============================================================
// Stateless per-request checks.
// Rate-limit / per-user state lives in the Durable Object.
// This module only runs pure checks that don't need stored state.

import {
	SPAM_WINDOW_MS,
	SPAM_MAX_IDENTICAL,
} from "../../constants";
import { normalizeMessageContent } from "../../lib/utils";
import { Errors } from "../../lib/errors";

export interface SpamCheckInput {
	content: string | null;
	recentMessages: Array<{ content: string | null; createdAt: string }>;
}

/**
 * Checks for duplicate / identical messages within the spam window.
 * `recentMessages` should be the last N messages from the same author
 * within SPAM_WINDOW_MS.
 */
export function checkDuplicateSpam(input: SpamCheckInput): void {
	if (!input.content) return;

	const normalizedNew = normalizeMessageContent(input.content);
	const windowStart = Date.now() - SPAM_WINDOW_MS;

	let identicalCount = 0;
	for (const msg of input.recentMessages) {
		if (!msg.content) continue;
		const msgTime = new Date(msg.createdAt).getTime();
		if (msgTime < windowStart) continue;

		if (normalizeMessageContent(msg.content) === normalizedNew) {
			identicalCount++;
		}
	}

	if (identicalCount >= SPAM_MAX_IDENTICAL) {
		throw Errors.duplicateMessage();
	}
}
