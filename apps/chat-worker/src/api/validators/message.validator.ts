import { z } from "zod";
import { MAX_MESSAGE_LENGTH, MESSAGE_PAGE_SIZE } from "../../constants";

export const CreateMessageSchema = z.object({
	roomId: z.string().uuid("roomId must be a valid UUID."),
	content: z.string().max(MAX_MESSAGE_LENGTH).optional().default(""),
	type: z.enum(["TEXT", "ANNOUNCEMENT"]).optional().default("TEXT"),
	replyToMessageId: z.string().uuid().nullable().optional().default(null),
	/** FRD §5.16 — client-generated unique key for idempotent retries */
	idempotencyKey: z.string().min(1).max(128).nullable().optional().default(null),
	attachments: z
		.array(
			z.object({
				type: z.enum(["IMAGE", "DOCUMENT", "GIF"]),
				originalFileName: z.string().min(1).max(255),
				mimeType: z.string().min(1).max(150),
				fileSize: z.number().int().positive(),
				storageKey: z.string().min(1),
				displayOrder: z.number().int().min(0),
			}),
		)
		.optional()
		.default([]),
});

export const EditMessageSchema = z.object({
	content: z.string().min(1).max(MAX_MESSAGE_LENGTH),
});

export const ListMessagesSchema = z.object({
	roomId: z.string().uuid("roomId must be a valid UUID."),
	cursor: z.string().optional(),
	limit: z.coerce.number().int().min(1).max(100).optional().default(MESSAGE_PAGE_SIZE),
});

export const ListRoomEventsSchema = z.object({
	after: z.coerce.number().int().min(0).optional().default(0),
	limit: z.coerce.number().int().min(1).max(100).optional().default(100),
});

export type CreateMessageDto = z.infer<typeof CreateMessageSchema>;
export type EditMessageDto = z.infer<typeof EditMessageSchema>;
export type ListMessagesDto = z.infer<typeof ListMessagesSchema>;
export type ListRoomEventsDto = z.infer<typeof ListRoomEventsSchema>;
