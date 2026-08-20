// ============================================================
// @bhemu/shared — Chat protocol limits
// ============================================================

/** Must match the server-side message validator and service limits. */
export const MAX_CHAT_MESSAGE_LENGTH = 4000;
export const MAX_CHAT_ATTACHMENTS_PER_MESSAGE = 5;
export const MAX_CHAT_CACHED_MESSAGES = 100;

/** Shared client-side identifier prefix used for optimistic chat messages. */
export const CHAT_OPTIMISTIC_PREFIX = "optimistic_";

/** Quick reactions shown by web and mobile message actions. */
export const QUICK_CHAT_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;
