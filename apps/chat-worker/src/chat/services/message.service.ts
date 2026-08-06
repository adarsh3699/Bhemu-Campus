// ============================================================
// bCampus Chat Worker — Message Service
// ============================================================
// Owns all message business logic per FRD §3.5.
// No SQL here — delegates entirely to repositories.
//
// FRD §4.8 message creation order:
//   1. Auth + write-block
//   2. Content validation (fast, no DB)
//   3. Spam check (fast, uses recent cache)
//   4. Membership + room policy (DB load)
//   5. Reply validation (DB)
//   6. Persist (transaction)
//   7. Update room counters
//   8. Broadcast

import {
	MessageRepository,
	type MessageWithAttachments,
} from "../repositories/message.repository";
import { RoomRepository } from "../repositories/room.repository";
import type { Database } from "../../db/drizzle";
import { RoomService } from "./room.service";
import { enforceRoomPolicy } from "../policies/room.policy";
import { checkDuplicateSpam } from "../spam/spam.detector";
import { requireAuthor } from "../../auth/permissions";
import { Errors } from "../../lib/errors";
import { decodeCursor, buildPaginatedResult, type PaginatedResult } from "../../lib/pagination";
import type { AuthUser } from "../../types";
import { MAX_MESSAGE_LENGTH, MAX_ATTACHMENTS_PER_MESSAGE, MESSAGE_PAGE_SIZE } from "../../constants";
import type { Message } from "../../db/schema";

export interface AttachmentInput {
	type: "IMAGE" | "DOCUMENT" | "GIF";
	originalFileName: string;
	mimeType: string;
	fileSize: number;
	storageKey: string;
	displayOrder: number;
}

export interface CreateMessageInput {
	roomId: string;
	content: string;
	replyToMessageId: string | null;
	type?: Message["type"];
	attachments?: AttachmentInput[];
	/** FRD §5.16 — client-generated key for idempotent retries */
	idempotencyKey?: string | null;
}

export interface BroadcastPayload {
	event: string;
	data: unknown;
}

export type BroadcastFn = (roomId: string, payload: BroadcastPayload) => Promise<void>;

// ---- Write-blocking moderation check (FRD §7.12) ----
// Suspended users CAN read but CANNOT create any content.
// This guard lives in the service, not auth middleware, so GETs still work.
function assertCanWrite(user: AuthUser): void {
	if (user.moderation.status === "suspended") {
		throw Errors.accountSuspended(user.moderation.expiresAt);
	}
}

export class MessageService {
	private readonly msgRepo: MessageRepository;
	private readonly roomRepo: RoomRepository;
	private readonly roomService: RoomService;

	constructor(db: Database) {
		this.msgRepo = new MessageRepository(db);
		this.roomRepo = new RoomRepository(db);
		this.roomService = new RoomService(db);
	}

	// ----------------------------------------------------------------
	// List (read — allowed for suspended users)
	// ----------------------------------------------------------------
	async listMessages(
		roomId: string,
		userUid: string,
		limitRaw: number = MESSAGE_PAGE_SIZE,
		cursorStr?: string,
	): Promise<PaginatedResult<MessageWithAttachments>> {
		await this.roomService.requireMembership(roomId, userUid);
		const limit = Math.min(limitRaw, 100);
		const cursor = cursorStr ? decodeCursor(cursorStr) : undefined;
		const rows = await this.msgRepo.listByRoom(roomId, limit, cursor);
		return buildPaginatedResult(rows, limit);
	}

	// ----------------------------------------------------------------
	// Create — FRD §4.8 order strictly followed
	// ----------------------------------------------------------------
	async createMessage(
		user: AuthUser,
		input: CreateMessageInput,
		broadcast: BroadcastFn,
	): Promise<MessageWithAttachments> {
		const msgType = input.type ?? "TEXT";
		const attachments = input.attachments ?? [];

		// Step 1 — Write-block check (fastest, no I/O)
		assertCanWrite(user);

		// Step 2 — Content validation (fast, no DB)
		if (msgType === "TEXT") {
			const trimmed = input.content.trim();
			if (!trimmed) throw Errors.emptyMessage();
			if (trimmed.length > MAX_MESSAGE_LENGTH) {
				throw Errors.messageTooLong(MAX_MESSAGE_LENGTH);
			}
		}

		// Attachment count check (fast, no DB)
		if (attachments.length > MAX_ATTACHMENTS_PER_MESSAGE) {
			throw Errors.attachmentLimitExceeded(MAX_ATTACHMENTS_PER_MESSAGE);
		}

		// Step 3 — Spam check against recent DB messages (before expensive policy load)
		const recentRows = await this.msgRepo.listByRoom(input.roomId, 10);
		const recentByAuthor = recentRows.filter((m) => m.authorUid === user.uid);
		checkDuplicateSpam({ content: input.content, recentMessages: recentByAuthor });

		// Step 4 — Membership + room policy
		const room = await this.roomService.requireMembership(input.roomId, user.uid);

		if (msgType === "TEXT") {
			enforceRoomPolicy(room.policy, user.role, "send_message");
		} else if (msgType === "ANNOUNCEMENT") {
			enforceRoomPolicy(room.policy, user.role, "create_announcement");
		}

		if (attachments.length > 0) {
			enforceRoomPolicy(room.policy, user.role, "send_attachment");
		}

		// Step 5 — Reply validation
		if (input.replyToMessageId) {
			const parent = await this.msgRepo.findById(input.replyToMessageId);
			if (!parent) throw Errors.messageNotFound();
			if (parent.visibility === "DELETED") throw Errors.cannotReplyToDeleted();
			if (parent.roomId !== input.roomId) throw Errors.replyAcrossRooms();
		}

		// Step 6 — Persist (transaction when attachments present — FRD §3.8)
		const id = crypto.randomUUID();
		const msg = await this.msgRepo.createWithAttachments(
			{
				id,
				roomId: input.roomId,
				authorUid: user.uid,
				replyToMessageId: input.replyToMessageId,
				type: msgType,
				content: input.content,
			},
			attachments.map((a) => ({
				messageId: id,
				type: a.type,
				displayOrder: a.displayOrder,
				originalFileName: a.originalFileName,
				mimeType: a.mimeType,
				fileSize: a.fileSize,
				storageKey: a.storageKey,
			})),
		);

		// Step 7 — Update room counters
		await this.roomRepo.incrementMessageCount(input.roomId, msg.createdAt);

		// Step 8 — Broadcast AFTER commit (FRD §6.2 Principle 1)
		// Announcements get their own dedicated event (FRD §6.10)
		const event = msgType === "ANNOUNCEMENT" ? "announcement.created" : "message.created";
		await broadcast(input.roomId, { event, data: msg });

		return msg;
	}

	// ----------------------------------------------------------------
	// Edit — FRD §4.10: ONLY the author may edit via this endpoint.
	// Moderators/Admins use the moderation workflow (separate endpoint).
	// ----------------------------------------------------------------
	async editMessage(
		user: AuthUser,
		messageId: string,
		newContent: string,
		broadcast: BroadcastFn,
	): Promise<MessageWithAttachments> {
		assertCanWrite(user);

		const msg = await this.msgRepo.findById(messageId);
		if (!msg) throw Errors.messageNotFound();
		if (msg.visibility === "DELETED") throw Errors.messageDeleted();
		if (msg.type !== "TEXT") throw Errors.permissionDenied("edit non-text message");

		// FRD §4.10: only original author — not moderator — via this endpoint
		requireAuthor(user.uid, msg.authorUid);

		const trimmed = newContent.trim();
		if (!trimmed) throw Errors.emptyMessage();
		if (trimmed.length > MAX_MESSAGE_LENGTH) throw Errors.messageTooLong(MAX_MESSAGE_LENGTH);

		await this.msgRepo.updateContent(messageId, trimmed);
		const result = await this.msgRepo.findByIdWithAttachments(messageId);
		if (!result) throw Errors.messageNotFound();

		await broadcast(msg.roomId, { event: "message.updated", data: result });
		return result;
	}

	// ----------------------------------------------------------------
	// Delete — author or moderator (FRD §4.11)
	// ----------------------------------------------------------------
	async deleteMessage(
		user: AuthUser,
		messageId: string,
		broadcast: BroadcastFn,
	): Promise<void> {
		assertCanWrite(user);

		const msg = await this.msgRepo.findById(messageId);
		if (!msg) throw Errors.messageNotFound();
		if (msg.visibility === "DELETED") throw Errors.messageDeleted();

		// Authors can self-delete; moderators delete via moderation endpoint
		requireAuthor(user.uid, msg.authorUid);

		await this.msgRepo.softDelete(messageId);
		await this.roomRepo.decrementMessageCount(msg.roomId);

		await broadcast(msg.roomId, {
			event: "message.deleted",
			data: { messageId, roomId: msg.roomId },
		});
	}

	// ----------------------------------------------------------------
	// Get single message
	// ----------------------------------------------------------------
	async getMessage(messageId: string): Promise<MessageWithAttachments> {
		const msg = await this.msgRepo.findByIdWithAttachments(messageId);
		if (!msg) throw Errors.messageNotFound();
		return msg;
	}
}
