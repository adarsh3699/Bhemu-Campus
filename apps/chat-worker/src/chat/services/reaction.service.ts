// ============================================================
// bCampus Chat Worker — Reaction Service
// ============================================================

import { ReactionRepository } from "../repositories/reaction.repository";
import { MessageRepository } from "../repositories/message.repository";
import type { Database } from "../../db/drizzle";
import { Errors } from "../../lib/errors";
import type { AuthUser } from "../../types";
import type { MessageReaction } from "../../db/schema";
import type { BroadcastFn } from "./message.service";

// FRD §7.12 — suspended users cannot create content (including reactions)
function assertCanWrite(user: AuthUser): void {
	if (user.moderation.status === "suspended") {
		throw Errors.accountSuspended(user.moderation.expiresAt);
	}
}

export class ReactionService {
	private readonly reactionRepo: ReactionRepository;
	private readonly msgRepo: MessageRepository;

	constructor(db: Database) {
		this.reactionRepo = new ReactionRepository(db);
		this.msgRepo = new MessageRepository(db);
	}

	async setReaction(
		user: AuthUser,
		messageId: string,
		emoji: string,
		broadcast: BroadcastFn,
	): Promise<MessageReaction> {
		assertCanWrite(user);

		const msg = await this.msgRepo.findById(messageId);
		if (!msg) throw Errors.messageNotFound();
		if (msg.visibility === "DELETED") throw Errors.messageDeleted();

		const reaction = await this.reactionRepo.upsert(messageId, user.uid, emoji);
		await broadcast(msg.roomId, { event: "reaction.updated", data: reaction });
		return reaction;
	}

	async removeReaction(
		user: AuthUser,
		messageId: string,
		broadcast: BroadcastFn,
	): Promise<void> {
		assertCanWrite(user);

		const msg = await this.msgRepo.findById(messageId);
		if (!msg) throw Errors.messageNotFound();

		await this.reactionRepo.remove(messageId, user.uid);
		await broadcast(msg.roomId, {
			event: "reaction.updated",
			data: { messageId, userUid: user.uid, emoji: null },
		});
	}
}
