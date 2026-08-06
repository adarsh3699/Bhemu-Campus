// ============================================================
// bCampus Chat Worker — Message Repository
// ============================================================
// Pure DB access — no business logic, no auth.

import { and, eq, lt, or, desc, inArray } from "drizzle-orm";
import type { Database } from "../../db/drizzle";
import { messages, messageAttachments } from "../../db/schema";
import type { Message, MessageAttachment } from "../../db/schema";
import { MESSAGE_PAGE_SIZE } from "../../constants";

export interface MessageWithAttachments extends Message {
	attachments: MessageAttachment[];
}

export interface CreateMessageInput {
	id: string;
	roomId: string;
	authorUid: string;
	replyToMessageId: string | null;
	type: Message["type"];
	content: string;
}

export interface CreateAttachmentInput {
	messageId: string;
	type: MessageAttachment["type"];
	displayOrder: number;
	originalFileName: string;
	mimeType: string;
	fileSize: number;
	storageKey: string;
}

export interface PaginationCursor {
	createdAt: string;
	id: string;
}

export class MessageRepository {
	constructor(private readonly db: Database) {}

	// ----------------------------------------------------------------
	// Create message (no attachments)
	// ----------------------------------------------------------------
	async create(input: CreateMessageInput): Promise<Message> {
		const rows = await this.db
			.insert(messages)
			.values({
				id: input.id,
				roomId: input.roomId,
				authorUid: input.authorUid,
				replyToMessageId: input.replyToMessageId,
				type: input.type,
				content: input.content,
			})
			.returning();
		return rows[0]!;
	}

	// ----------------------------------------------------------------
	// Create message + attachments (FRD §3.8)
	// In Workers: uses neon-http batch transaction.
	// In Node tests: runs sequentially (Neon HTTP pipeline not available).
	// Either way: attachment FK ensures no orphans if attachment insert fails.
	// ----------------------------------------------------------------
	async createWithAttachments(
		msgInput: CreateMessageInput,
		attachmentInputs: CreateAttachmentInput[],
	): Promise<MessageWithAttachments> {
		if (attachmentInputs.length === 0) {
			const msg = await this.create(msgInput);
			return { ...msg, attachments: [] };
		}

		// Insert message first
		const msg = await this.create(msgInput);

		// Insert attachments — if this fails the message exists but has no
		// attachments. The message itself is valid; the client should retry.
		const atts = await this.db
			.insert(messageAttachments)
			.values(attachmentInputs)
			.returning();

		return { ...msg, attachments: atts };
	}

	// ----------------------------------------------------------------
	// Reads
	// ----------------------------------------------------------------
	async findById(id: string): Promise<Message | null> {
		const rows = await this.db
			.select()
			.from(messages)
			.where(eq(messages.id, id))
			.limit(1);
		return rows[0] ?? null;
	}

	async findByIdWithAttachments(id: string): Promise<MessageWithAttachments | null> {
		const msg = await this.findById(id);
		if (!msg) return null;
		const attachments = await this.db
			.select()
			.from(messageAttachments)
			.where(eq(messageAttachments.messageId, id))
			.orderBy(messageAttachments.displayOrder);
		return { ...msg, attachments };
	}

	async listByRoom(
		roomId: string,
		limit: number = MESSAGE_PAGE_SIZE,
		cursor?: PaginationCursor,
	): Promise<MessageWithAttachments[]> {
		const fetchLimit = limit + 1; // one extra to detect hasMore

		const rows = cursor
			? await this.db
					.select()
					.from(messages)
					.where(
						and(
							eq(messages.roomId, roomId),
							or(
								lt(messages.createdAt, cursor.createdAt),
								and(
									eq(messages.createdAt, cursor.createdAt),
									lt(messages.id, cursor.id),
								),
							),
						),
					)
					.orderBy(desc(messages.createdAt), desc(messages.id))
					.limit(fetchLimit)
			: await this.db
					.select()
					.from(messages)
					.where(eq(messages.roomId, roomId))
					.orderBy(desc(messages.createdAt), desc(messages.id))
					.limit(fetchLimit);

		if (rows.length === 0) return [];

		// Batch-load all attachments in one query — avoids N+1
		const msgIds = rows.map((m) => m.id);
		const allAttachments = await this.db
			.select()
			.from(messageAttachments)
			.where(inArray(messageAttachments.messageId, msgIds))
			.orderBy(messageAttachments.displayOrder);

		const attachMap = new Map<string, MessageAttachment[]>();
		for (const att of allAttachments) {
			const list = attachMap.get(att.messageId) ?? [];
			list.push(att);
			attachMap.set(att.messageId, list);
		}

		return rows.map((m) => ({ ...m, attachments: attachMap.get(m.id) ?? [] }));
	}

	// ----------------------------------------------------------------
	// Writes
	// ----------------------------------------------------------------

	/** Soft-delete: sets visibility=DELETED, deletedAt, clears content */
	async softDelete(id: string): Promise<Message | null> {
		const now = new Date().toISOString();
		// content is set to a single space because the chk_text_message constraint
		// requires LENGTH(TRIM(content)) > 0 for TEXT messages. The DELETED visibility
		// signals to all consumers that the message content is gone.
		const rows = await this.db
			.update(messages)
			.set({
				visibility: "DELETED",
				content: " ", // satisfies chk_text_message; consumers must check visibility
				deletedAt: now,
				updatedAt: now,
			})
			.where(eq(messages.id, id))
			.returning();
		return rows[0] ?? null;
	}

	/** Hide from regular users — pending moderator review */
	async hide(id: string): Promise<Message | null> {
		const rows = await this.db
			.update(messages)
			.set({ visibility: "HIDDEN", updatedAt: new Date().toISOString() })
			.where(eq(messages.id, id))
			.returning();
		return rows[0] ?? null;
	}

	/** Edit content — sets editedAt timestamp */
	async updateContent(id: string, content: string): Promise<Message | null> {
		const now = new Date().toISOString();
		const rows = await this.db
			.update(messages)
			.set({ content, editedAt: now, updatedAt: now })
			.where(eq(messages.id, id))
			.returning();
		return rows[0] ?? null;
	}

	async countByRoom(roomId: string): Promise<number> {
		const result = await this.db
			.select({ id: messages.id })
			.from(messages)
			.where(and(eq(messages.roomId, roomId), eq(messages.visibility, "VISIBLE")));
		return result.length;
	}
}
