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
import { PIN_DURATION_MS, type PinDuration } from "@bhemu/shared";
import type { Env } from "../../types";
import { sendFcmToTokens } from "../../lib/fcm";
import { getFcmTokensForRoom } from "../../lib/firestoreTokens";

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

	constructor(
		db: Database,
		private readonly env?: Env,
		private readonly bgTask?: (p: Promise<void>) => void
	) {
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
		const wasPinned = await this.pinRepo.unpin(msg.roomId, messageId);

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
		duration: PinDuration = "forever",
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

		const expiresAt = duration === "forever"
			? null
			: new Date(Date.now() + PIN_DURATION_MS[duration]!).toISOString();
		const pin = await this.pinRepo.pin(roomId, messageId, moderator.uid, expiresAt);

		await broadcast(roomId, {
			event: "pin.updated",
			data: {
				roomId,
				messageId,
				action: "pinned",
				pinnedBy: pin.pinnedBy,
				pinnedAt: pin.pinnedAt,
				expiresAt: pin.expiresAt,
			},
		});

		// Trigger Push Notifications (fire and forget)
		if (this.env && msg) {
			const dispatchPush = async () => {
				const isText = msg.type === "TEXT" || msg.type === "ANNOUNCEMENT";
				const bodyPreview = isText ? msg.content.substring(0, 50) : "Pinned an attachment";
				const tokens = await getFcmTokensForRoom(
					room ? room.type : "UNIVERSITY",
					room ? room.groupKey : null,
					this.env!
				);
				await sendFcmToTokens(tokens, {
					title: `📌 Pinned in ${room.name}`,
					body: bodyPreview,
					data: { source: "bcampus-chat" }
				}, this.env!);
			};
			if (this.bgTask) this.bgTask(dispatchPush());
			else void dispatchPush();
		}
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
