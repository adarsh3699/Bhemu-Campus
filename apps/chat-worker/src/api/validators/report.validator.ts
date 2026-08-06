import { z } from "zod";

export const CreateReportSchema = z.object({
	messageId: z.string().uuid(),
	reason: z.enum([
		"SPAM",
		"HARASSMENT",
		"ABUSE",
		"INAPPROPRIATE",
		"MISINFORMATION",
		"OTHER",
	]),
	description: z.string().max(1000).nullable().optional().default(null),
});

export type CreateReportDto = z.infer<typeof CreateReportSchema>;
