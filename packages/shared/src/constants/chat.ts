// ============================================================
// @bhemu/shared — Chat protocol limits
// ============================================================

/** Must match the server-side message validator and service limits. */
export const MAX_CHAT_MESSAGE_LENGTH = 4000;
export const MAX_CHAT_ATTACHMENTS_PER_MESSAGE = 5;
export const MAX_CHAT_CACHED_MESSAGES = 100;
export const MIN_CHAT_POLL_OPTIONS = 2;
export const MAX_CHAT_POLL_OPTIONS = 8;
export const MAX_CHAT_POLL_QUESTION_LENGTH = 500;
export const MAX_CHAT_POLL_OPTION_LENGTH = 255;
export const CHAT_POLL_VALIDATION_MESSAGES = {
	questionRequired: "Add a question first.",
	questionTooLong: `Question must be ${MAX_CHAT_POLL_QUESTION_LENGTH} characters or fewer.`,
	optionCount: `Add between ${MIN_CHAT_POLL_OPTIONS} and ${MAX_CHAT_POLL_OPTIONS} options.`,
	optionTooLong: `Poll options must be ${MAX_CHAT_POLL_OPTION_LENGTH} characters or fewer.`,
	duplicateOptions: "Poll options must be unique.",
} as const;

/** Shared client-side identifier prefix used for optimistic chat messages. */
export const CHAT_OPTIMISTIC_PREFIX = "optimistic_";

/** Quick reactions shown by web and mobile message actions. */
export const QUICK_CHAT_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;
