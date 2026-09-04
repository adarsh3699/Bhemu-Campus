// ============================================================
// bCampus Chat Worker — Message Service
// ============================================================
// Owns all message business logic per FRD §3.5.
// No SQL here — delegates entirely to repositories.
//
// FRD §4.8 message creation order:
//   1. Auth + write-block
//   2. Content validation (fast, no DB)
//   3. Membership + room policy (verified public WS lease or DB)
//   4. Reply validation (DB)
//   5. Persist message, attachments, room counter, and event (HTTP batch)
//   6. Broadcast

import {
	MessageRepository,
	type MessageWithRelations,
	type CreateRoomEventInput,
	type CreateMessageIdempotencyInput,
} from "../repositories/message.repository";
import { RoomRepository } from "../repositories/room.repository";
import { PinRepository } from "../repositories/pin.repository";
import type { Database } from "../../db/drizzle";
import { RoomService } from "./room.service";
import { enforceRoomPolicy } from "../policies/room.policy";
import { requireAuthor } from "../../auth/permissions";
import { Errors } from "../../lib/errors";
import { decodeCursor, buildPaginatedResult, type PaginatedResult } from "../../lib/pagination";
import type { AuthUser } from "../../types";
import { MAX_MESSAGE_LENGTH, MAX_ATTACHMENTS_PER_MESSAGE, MESSAGE_PAGE_SIZE } from "../../constants";
import type { Message, Room, RoomPolicy } from "../../db/schema";
import type { Env } from "../../types";
import { sendFcmToTokens } from "../../lib/fcm";
import { getFcmTokensForRoom, getFcmTokensForUser } from "../../lib/firestoreTokens";

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
	/** Allocated by the Room DO before the transactional event write. */
	roomSeq?: number | null;
	/**
	 * Public-room authorization already verified during WebSocket upgrade.
	 * Private rooms intentionally do not use this shortcut.
	 */
	verifiedPublicRoom?: VerifiedPublicRoom;
}

export interface VerifiedPublicRoom {
	id: string;
	visibility: Room["visibility"];
	policy: RoomPolicy;
}

export interface CreateMessageResult {
	message: MessageWithRelations;
	/** False when the DB idempotency record already existed. */
	created: boolean;
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

/** PostgreSQL SQLSTATE 23505, including drivers that wrap the cause. */
function isUniqueViolation(error: unknown): boolean {
	if (!error || typeof error !== "object") return false;
	const candidate = error as { code?: unknown; cause?: { code?: unknown } };
	return candidate.code === "23505" || candidate.cause?.code === "23505";
}

/**
 * Signals that a Room DO allocated a sequence which is already committed in
 * the event stream. The DO can repair its local high-water mark and retry the
 * same message without exposing a database error to the client.
 */
export class RoomSequenceConflictError extends Error {
	readonly roomId: string;
	readonly roomSeq: number;
	readonly highWater: number;

	constructor(roomId: string, roomSeq: number, highWater: number) {
		super(`Room event sequence ${roomSeq} is behind committed high-water ${highWater}.`);
		this.name = "RoomSequenceConflictError";
		this.roomId = roomId;
		this.roomSeq = roomSeq;
		this.highWater = highWater;
	}
}

export class MessageService {
	private readonly msgRepo: MessageRepository;
	private readonly roomRepo: RoomRepository;
	private readonly pinRepo: PinRepository;
	private readonly roomService: RoomService;

	constructor(
		db: Database,
		private readonly env?: Env,
		private readonly bgTask?: (p: Promise<void>) => void
	) {
		this.msgRepo = new MessageRepository(db);
		this.roomRepo = new RoomRepository(db);
		this.pinRepo = new PinRepository(db);
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
	): Promise<PaginatedResult<MessageWithRelations>> {
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
	): Promise<CreateMessageResult> {
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

		// Step 3 — duplicate admission already happened in the serialized Room
		// DO. This service remains the final membership/policy authority.
		const room = input.verifiedPublicRoom?.id === input.roomId
			&& input.verifiedPublicRoom.visibility === "PUBLIC"
			? input.verifiedPublicRoom
			: await this.roomService.requireMembership(input.roomId, user.uid);

		if (msgType === "TEXT") {
			enforceRoomPolicy(room.policy, user.role, "send_message");
		} else if (msgType === "ANNOUNCEMENT") {
			enforceRoomPolicy(room.policy, user.role, "create_announcement");
		}

		if (attachments.length > 0) {
			enforceRoomPolicy(room.policy, user.role, "send_attachment");
		}

		// Step 5 — Reply validation
		let parentAuthorUid: string | null = null;
		if (input.replyToMessageId) {
			const parent = await this.msgRepo.findById(input.replyToMessageId);
			if (!parent) throw Errors.messageNotFound();
			if (parent.visibility === "DELETED") throw Errors.cannotReplyToDeleted();
			if (parent.roomId !== input.roomId) throw Errors.replyAcrossRooms();
			parentAuthorUid = parent.authorUid;
		}

		// Step 5 — Persist message, attachments, counter, and immutable room event
		// in one DB batch.
		const id = crypto.randomUUID();
		const createdAt = new Date().toISOString();
		const event = msgType === "ANNOUNCEMENT" ? "announcement.created" : "message.created";
		const attachmentRows = attachments.map((a) => ({
			messageId: id,
			id: crypto.randomUUID(),
			type: a.type,
			displayOrder: a.displayOrder,
			originalFileName: a.originalFileName,
			mimeType: a.mimeType,
			fileSize: a.fileSize,
			storageKey: a.storageKey,
			createdAt,
		}));
		const eventId = input.roomSeq ? crypto.randomUUID() : null;
		const eventInput: CreateRoomEventInput | undefined =
			input.roomSeq && eventId
				? {
					roomId: input.roomId,
					roomSeq: input.roomSeq,
					eventId,
					eventType: event,
					aggregateId: id,
					payload: {
						version: 1,
						message: {
							id,
							roomId: input.roomId,
							authorUid: user.uid,
							authorName: user.displayName,
							idempotencyKey: input.idempotencyKey,
							replyToMessageId: input.replyToMessageId,
							type: msgType,
							visibility: "VISIBLE",
							content: input.content,
							editedAt: null,
							deletedAt: null,
							createdAt,
							updatedAt: createdAt,
							attachments: attachmentRows,
						},
					},
				}
				: undefined;
		const idempotencyInput: CreateMessageIdempotencyInput | undefined =
			input.idempotencyKey
			? {
				roomId: input.roomId,
				authorUid: user.uid,
				key: input.idempotencyKey,
				messageId: id,
			}
			: undefined;
		let msg: MessageWithRelations;
		try {
			msg = await this.msgRepo.createWithAttachmentsAndRoomCounter(
				{
					id,
					roomId: input.roomId,
					authorUid: user.uid,
					authorName: user.displayName,
					replyToMessageId: input.replyToMessageId,
					type: msgType,
					content: input.content,
					createdAt,
					updatedAt: createdAt,
				},
				attachmentRows,
				eventInput,
				idempotencyInput,
			);
		} catch (error) {
			// A concurrent retry can lose the unique idempotency insert after its
			// message transaction is rolled back. Return the winner's committed
			// message instead of surfacing a transient 500 or creating a duplicate.
			if (isUniqueViolation(error)) {
				if (input.idempotencyKey) {
					const existing = await this.msgRepo.findByIdempotencyKey(
						input.roomId,
						user.uid,
						input.idempotencyKey,
					);
					if (existing) return { message: existing, created: false };
				}
				// A deployment/restart can restore a DO with a stale local
				// sequence. Only query the event stream on a unique conflict;
				// the normal send path remains a single write batch.
				if (input.roomSeq !== null && input.roomSeq !== undefined) {
					const highWater = await this.msgRepo.getRoomEventHighWater(input.roomId);
					if (highWater >= input.roomSeq) {
						throw new RoomSequenceConflictError(input.roomId, input.roomSeq, highWater);
					}
				}
			}
			throw error;
		}
		// Step 7 — Broadcast AFTER the message + counter batch completes
		// Announcements get their own dedicated event (FRD §6.10)
		// Inject idempotencyKey so the client can reliably match optimistic UI
		await broadcast(input.roomId, {
			event,
			data: {
				...msg,
				idempotencyKey: input.idempotencyKey,
				...(eventId && input.roomSeq ? { eventId, roomSeq: input.roomSeq } : {}),
			},
		});

		// Trigger Push Notifications (fire and forget)
		if (this.env) {
			const dispatchPush = async () => {
				const isText = msg.type === "TEXT" || msg.type === "ANNOUNCEMENT";
				const bodyPreview = isText ? msg.content.substring(0, 50) : "Sent an attachment";
				
				const room = await this.roomRepo.findById(msg.roomId);
				const roomName = room ? room.name : "the room";
				const roomType = room ? room.type : "UNIVERSITY";

				if (msg.type === "ANNOUNCEMENT") {
					const tokens = await getFcmTokensForRoom(
						roomType,
						room ? room.groupKey : null,
						this.env!,
						false // All users get announcements
					);
					await sendFcmToTokens(tokens, {
						title: `📢 Announcement in ${roomName}`,
						body: `${msg.authorName}: ${bodyPreview}`,
						data: { source: "bcampus-chat" }
					}, this.env!);
				} else if (parentAuthorUid && parentAuthorUid !== msg.authorUid) {
					// It's a reply to someone else
					const tokens = await getFcmTokensForUser(parentAuthorUid, this.env!);
					await sendFcmToTokens(tokens, {
						title: `${msg.authorName} replied to you`,
						body: bodyPreview,
						data: { source: "bcampus-chat" }
					}, this.env!);
				} else if (roomType === "BATCHMATE") {
					// Standard message in batchmate room, target users who opted in to ALL messages
					const tokens = await getFcmTokensForRoom(
						roomType,
						room ? room.groupKey : null,
						this.env!,
						true // onlyAllMessages = true
					);
					// Filter out the sender's own tokens to avoid sending push to the person who sent the message
					const senderTokens = await getFcmTokensForUser(msg.authorUid, this.env!);
					const senderTokenSet = new Set(senderTokens);
					const recipientTokens = tokens.filter(t => !senderTokenSet.has(t));
					
					await sendFcmToTokens(recipientTokens, {
						title: `New message in ${roomName}`,
						body: `${msg.authorName}: ${bodyPreview}`,
						data: { source: "bcampus-chat" }
					}, this.env!);
				}
			};
			if (this.bgTask) this.bgTask(dispatchPush());
			else void dispatchPush();
		}

		return { message: msg, created: true };
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
	): Promise<MessageWithRelations> {
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
		const result = await this.msgRepo.findByIdWithRelations(messageId);
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
		const wasPinned = await this.pinRepo.unpin(msg.roomId, messageId);

		await broadcast(msg.roomId, {
			event: "message.deleted",
			data: { messageId, roomId: msg.roomId },
		});
		if (wasPinned) {
			await broadcast(msg.roomId, {
				event: "pin.updated",
				data: { messageId, roomId: msg.roomId, action: "unpinned" },
			});
		}
	}

}
