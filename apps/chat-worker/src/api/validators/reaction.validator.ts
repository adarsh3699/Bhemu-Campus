import { z } from "zod";

export const SetReactionSchema = z.object({
	messageId: z.string().uuid(),
	emoji: z.string().min(1).max(32),
});

export type SetReactionDto = z.infer<typeof SetReactionSchema>;
