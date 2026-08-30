import { z } from "zod";

export const WarnUserSchema = z.object({
	targetUserUid: z.string().min(1),
	reason: z.string().max(500).nullable().optional().default(null),
	messageId: z.string().uuid().optional(),
});

export const SuspendUserSchema = z.object({
	targetUserUid: z.string().min(1),
	reason: z.string().max(500).nullable().optional().default(null),
	expiresAt: z.string().datetime({ message: "expiresAt must be an ISO 8601 datetime." }),
});

export const BanUserSchema = z.object({
	targetUserUid: z.string().min(1),
	reason: z.string().max(500).nullable().optional().default(null),
});

export const DeleteMessageModerationSchema = z.object({
	reason: z.string().max(500).nullable().optional().default(null),
});

export const PinMessageSchema = z.object({
	duration: z.enum(["8h", "1d", "1w", "1m", "forever"]).optional().default("forever"),
});

export type WarnUserDto = z.infer<typeof WarnUserSchema>;
export type SuspendUserDto = z.infer<typeof SuspendUserSchema>;
export type BanUserDto = z.infer<typeof BanUserSchema>;
export type DeleteMessageModerationDto = z.infer<typeof DeleteMessageModerationSchema>;
export type PinMessageDto = z.infer<typeof PinMessageSchema>;
