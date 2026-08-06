import { z } from "zod";
import { MAX_POLL_OPTIONS, MIN_POLL_OPTIONS } from "../../constants";

export const CreatePollSchema = z.object({
	roomId: z.string().uuid(),
	content: z.string().min(1, "Poll question is required.").max(500),
	options: z
		.array(z.string().min(1).max(255))
		.min(MIN_POLL_OPTIONS, `A poll must have at least ${MIN_POLL_OPTIONS} options.`)
		.max(MAX_POLL_OPTIONS, `A poll can have at most ${MAX_POLL_OPTIONS} options.`),
	multipleChoice: z.boolean().optional().default(false),
	closesAt: z.string().datetime().nullable().optional().default(null),
});

export const VotePollSchema = z.object({
	optionIds: z
		.array(z.string().uuid())
		.min(1, "At least one option must be selected."),
});

export type CreatePollDto = z.infer<typeof CreatePollSchema>;
export type VotePollDto = z.infer<typeof VotePollSchema>;
