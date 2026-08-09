// ============================================================
// bCampus Chat Worker — Report Service
// ============================================================
// FRD §7.9, §7.10

import { ReportRepository } from "../repositories/report.repository";
import { MessageRepository } from "../repositories/message.repository";
import type { Database } from "../../db/drizzle";
import { Errors } from "../../lib/errors";
import type { AuthUser, Env } from "../../types";
import type { MessageReport } from "../../db/schema";
import { REPORT_AUTO_FLAG_THRESHOLD, REPORT_WINDOW_HOURS } from "../../constants";
import { logger } from "../../lib/logger";

function assertCanWrite(user: AuthUser): void {
	if (user.moderation.status === "suspended") {
		throw Errors.accountSuspended(user.moderation.expiresAt);
	}
}

export interface CreateReportInput {
	messageId: string;
	reason: MessageReport["reason"];
	description: string | null;
}

// ---- Firestore REST write ----
// Updates users/{targetUid}.moderation.status = "flagged" (FRD §7.10)
async function flagUserInFirestore(
	projectId: string,
	targetUid: string,
	token: string,
): Promise<void> {
	const url =
		`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents` +
		`/users/${targetUid}?updateMask.fieldPaths=moderation.status`;
	try {
		await fetch(url, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				fields: {
					moderation: {
						mapValue: {
							fields: {
								status: { stringValue: "flagged" },
							},
						},
					},
				},
			}),
		});
	} catch (err) {
		// Non-fatal — log and continue. Moderator will still see the hidden message.
		logger.warn("report.firestore_flag_failed", {
			targetUid,
			error: String(err),
		});
	}
}

export class ReportService {
	private readonly reportRepo: ReportRepository;
	private readonly msgRepo: MessageRepository;

	constructor(db: Database) {
		this.reportRepo = new ReportRepository(db);
		this.msgRepo = new MessageRepository(db);
	}

	async reportMessage(
		user: AuthUser,
		input: CreateReportInput,
		env: Env,
		/** Raw Firebase ID token — needed for Firestore REST write */
		idToken: string,
	): Promise<MessageReport> {
		assertCanWrite(user);

		const msg = await this.msgRepo.findById(input.messageId);
		if (!msg) throw Errors.messageNotFound();
		if (msg.visibility === "DELETED") throw Errors.messageDeleted();
		if (msg.authorUid === user.uid) throw Errors.cannotReportOwnMessage();

		const alreadyReported = await this.reportRepo.exists(input.messageId, user.uid);
		if (alreadyReported) throw Errors.reportAlreadyExists();

		const report = await this.reportRepo.create({
			messageId: input.messageId,
			reporterUid: user.uid,
			reason: input.reason,
			description: input.description,
		});

		// ---- FRD §7.10: auto-flag when threshold hit ----
		const uniqueReporters = await this.reportRepo.countUniqueReporters(
			input.messageId,
			REPORT_WINDOW_HOURS,
		);

		if (uniqueReporters >= REPORT_AUTO_FLAG_THRESHOLD) {
			// 1. Hide message from regular users
			await this.msgRepo.hide(input.messageId);

			// 2. Update Firestore moderation.status = "flagged" (FRD §7.10)
			await flagUserInFirestore(env.FIREBASE_PROJECT_ID, msg.authorUid, idToken);

			logger.info("report.auto_flagged", {
				messageId: input.messageId,
				targetUid: msg.authorUid,
				reporters: uniqueReporters,
			});
		}

		return report;
	}
}
