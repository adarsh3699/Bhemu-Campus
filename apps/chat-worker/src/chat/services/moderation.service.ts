// ============================================================
// bCampus Chat Worker — Moderation Service
// ============================================================

import { ModerationRepository } from "../repositories/moderation.repository";
import { MessageRepository } from "../repositories/message.repository";
import { PinRepository } from "../repositories/pin.repository";
import { RoomService } from "./room.service";
import type { Database } from "../../db/drizzle";
import { requireModerator, requireAdmin } from "../../auth/permissions";
import { enforceRoomPolicy } from "../policies/room.policy";
import { Errors } from "../../lib/errors";
import type { AuthUser } from "../../types";
import type { ModerationAction } from "../../db/schema";
import type { BroadcastFn } from "./message.service";

export interface ModerationActionInput {
	targetUserUid: string;
	reason: string | null;
	messageId?: string;
	expiresAt?: string | null;
}

export class ModerationService {
	private readonly modRepo: ModerationRepository;
	private readonly msgRepo: MessageRepository;
	private readonly pinRepo: PinRepository;
	private readonly roomService: RoomService;

	constructor(db: Database) {
		this.modRepo = new ModerationRepository(db);
		this.msgRepo = new MessageRepository(db);
		this.pinRepo = new PinRepository(db);
		this.roomService = new RoomService(db);
	}

	async warnUser(
		moderator: AuthUser,
		input: ModerationActionInput,
	): Promise<ModerationAction> {
		requireModerator(moderator.role);
		return this.modRepo.create({
			userUid: input.targetUserUid,
			moderatorUid: moderator.uid,
			action: "WARN",
			actionReason: input.reason,
			messageId: input.messageId ?? null,
			expiresAt: null,
		});
	}

	async suspendUser(
		moderator: AuthUser,
		input: ModerationActionInput,
	): Promise<ModerationAction> {
		requireModerator(moderator.role);
		return this.modRepo.create({
			userUid: input.targetUserUid,
			moderatorUid: moderator.uid,
			action: "SUSPEND",
			actionReason: input.reason,
			messageId: null,
			expiresAt: input.expiresAt ?? null,
		});
	}

	async banUser(moderator: AuthUser, input: ModerationActionInput): Promise<ModerationAction> {
		requireAdmin(moderator.role);
		return this.modRepo.create({
			userUid: input.targetUserUid,
			moderatorUid: moderator.uid,
			action: "BAN",
			actionReason: input.reason,
			messageId: null,
			expiresAt: null,
		});
	}

	async deleteMessage(
		moderator: AuthUser,
		messageId: string,
		reason: string | null,
		broadcast: BroadcastFn,
	): Promise<ModerationAction> {
		requireModerator(moderator.role);

		const msg = await this.msgRepo.findById(messageId);
		if (!msg) throw Errors.messageNotFound();
		if (msg.visibility === "DELETED") throw Errors.messageDeleted();

		await this.msgRepo.softDelete(messageId);
		const wasPinned = msg.type === "ANNOUNCEMENT"
			? await this.pinRepo.unpin(msg.roomId, messageId)
			: false;

		const action = await this.modRepo.create({
			userUid: msg.authorUid,
			moderatorUid: moderator.uid,
			action: "DELETE_MESSAGE",
			actionReason: reason,
			messageId,
			expiresAt: null,
		});

		await broadcast(msg.roomId, {
			event: "message.deleted",
			data: { messageId, roomId: msg.roomId, byModerator: true },
		});
		if (wasPinned) {
			await broadcast(msg.roomId, {
				event: "pin.updated",
				data: { messageId, roomId: msg.roomId, action: "unpinned" },
			});
		}

		return action;
	}

	async pinMessage(
		moderator: AuthUser,
		roomId: string,
		messageId: string,
		broadcast: BroadcastFn,
	): Promise<void> {
		const room = await this.roomService.getRoom(roomId);
		enforceRoomPolicy(room.policy, moderator.role, "pin_message");

		const msg = await this.msgRepo.findById(messageId);
		if (!msg) throw Errors.messageNotFound();
		if (msg.visibility === "DELETED") throw Errors.messageDeleted();
		if (msg.roomId !== roomId) throw Errors.notFound("Message in room");

		const alreadyPinned = await this.pinRepo.exists(roomId, messageId);
		if (alreadyPinned) throw Errors.messageAlreadyPinned();

		const currentCount = await this.pinRepo.countByRoom(roomId);
		if (currentCount >= room.policy.pinLimit) {
			throw Errors.pinLimitReached(room.policy.pinLimit);
		}

		await this.pinRepo.pin(roomId, messageId, moderator.uid);

		await broadcast(roomId, {
			event: "pin.updated",
			data: { roomId, messageId, action: "pinned" },
		});
	}

	async unpinMessage(
		moderator: AuthUser,
		roomId: string,
		messageId: string,
		broadcast: BroadcastFn,
	): Promise<void> {
		const room = await this.roomService.getRoom(roomId);
		enforceRoomPolicy(room.policy, moderator.role, "pin_message");

		const exists = await this.pinRepo.exists(roomId, messageId);
		if (!exists) throw Errors.messageNotPinned();

		await this.pinRepo.unpin(roomId, messageId);

		await broadcast(roomId, {
			event: "pin.updated",
			data: { roomId, messageId, action: "unpinned" },
		});
	}

	async getPins(roomId: string) {
		return this.pinRepo.findByRoom(roomId);
	}
}
