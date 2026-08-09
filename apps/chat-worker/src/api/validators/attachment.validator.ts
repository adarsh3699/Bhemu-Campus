import { z } from "zod";
import { MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES } from "../../constants";

export const UploadUrlRequestSchema = z.object({
	fileName: z.string().min(1).max(255),
	mimeType: z.enum(ALLOWED_MIME_TYPES as unknown as [string, ...string[]]),
	fileSize: z
		.number()
		.int()
		.positive()
		.max(MAX_FILE_SIZE_BYTES, `File size must not exceed ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.`),
	messageId: z.string().uuid().optional(),
});

export type UploadUrlRequestDto = z.infer<typeof UploadUrlRequestSchema>;
