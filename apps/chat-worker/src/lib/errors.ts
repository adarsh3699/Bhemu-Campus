// ============================================================
// bCampus Chat Worker — Application Errors
// ============================================================

export type ErrorCode =
	// Auth
	| "INVALID_TOKEN"
	| "MISSING_TOKEN"
	| "CHAT_SESSION_REQUIRED"
	| "ACCOUNT_SUSPENDED"
	| "ACCOUNT_BANNED"
	// Rooms
	| "ROOM_NOT_FOUND"
	| "NOT_ROOM_MEMBER"
	// Messages
	| "MESSAGE_NOT_FOUND"
	| "MESSAGE_DELETED"
	| "MESSAGE_HIDDEN"
	| "MESSAGE_TOO_LONG"
	| "EMPTY_MESSAGE"
	| "CANNOT_REPLY_TO_DELETED"
	| "REPLY_CROSS_ROOM"
	// Permissions
	| "PERMISSION_DENIED"
	| "INSUFFICIENT_ROLE"
	// Attachments
	| "ATTACHMENT_LIMIT_EXCEEDED"
	| "INVALID_ATTACHMENT_TYPE"
	| "FILE_TOO_LARGE"
	// Polls
	| "POLL_NOT_FOUND"
	| "POLL_CLOSED"
	| "POLL_OPTION_NOT_FOUND"
	| "POLL_OPTION_CROSS_POLL"
	| "INVALID_POLL_OPTION_COUNT"
	// Reports
	| "REPORT_ALREADY_EXISTS"
	| "CANNOT_REPORT_OWN_MESSAGE"
	// Moderation
	| "MODERATION_TARGET_NOT_FOUND"
	// Rate Limiting
	| "RATE_LIMITED"
	// Spam
	| "SPAM_DETECTED"
	| "DUPLICATE_MESSAGE"
	// Pins
	| "PIN_LIMIT_REACHED"
	| "MESSAGE_ALREADY_PINNED"
	| "MESSAGE_NOT_PINNED"
	// Idempotency
	| "DUPLICATE_REQUEST"
	// Generic
	| "VALIDATION_ERROR"
	| "NOT_FOUND"
	| "CONFLICT"
	| "INTERNAL_ERROR";

export class AppError extends Error {
	constructor(
		public readonly code: ErrorCode,
		message: string,
		public readonly httpStatus: number = 400,
	) {
		super(message);
		this.name = "AppError";
	}
}

// ---- Convenience constructors ----

export const Errors = {
	invalidToken: () => new AppError("INVALID_TOKEN", "Invalid or expired token.", 401),
	missingToken: () => new AppError("MISSING_TOKEN", "Authorization token is required.", 401),
	chatSessionRequired: () =>
		new AppError(
			"CHAT_SESSION_REQUIRED",
			"A valid chat session is required. Please refresh your chat session.",
			401,
		),
	accountSuspended: (expiresAt: string | null) =>
		new AppError(
			"ACCOUNT_SUSPENDED",
			expiresAt
				? `Your account is suspended until ${expiresAt}.`
				: "Your account is suspended.",
			403,
		),
	accountBanned: () =>
		new AppError("ACCOUNT_BANNED", "Your account has been permanently banned.", 403),

	roomNotFound: () => new AppError("ROOM_NOT_FOUND", "Room does not exist.", 404),
	notRoomMember: () => new AppError("NOT_ROOM_MEMBER", "You are not a member of this room.", 403),

	messageNotFound: () => new AppError("MESSAGE_NOT_FOUND", "Message does not exist.", 404),
	messageDeleted: () =>
		new AppError("MESSAGE_DELETED", "This message has been deleted.", 404),
	messageTooLong: (max: number) =>
		new AppError("MESSAGE_TOO_LONG", `Message exceeds the maximum length of ${max} characters.`, 422),
	emptyMessage: () => new AppError("EMPTY_MESSAGE", "Message content cannot be empty.", 422),
	cannotReplyToDeleted: () =>
		new AppError("CANNOT_REPLY_TO_DELETED", "Cannot reply to a deleted message.", 422),
	replyAcrossRooms: () =>
		new AppError("REPLY_CROSS_ROOM", "Cannot reply to a message in a different room.", 422),

	permissionDenied: (action?: string) =>
		new AppError(
			"PERMISSION_DENIED",
			action ? `You do not have permission to ${action}.` : "Permission denied.",
			403,
		),
	insufficientRole: (required: string) =>
		new AppError(
			"INSUFFICIENT_ROLE",
			`This action requires the '${required}' role or higher.`,
			403,
		),

	attachmentLimitExceeded: (max: number) =>
		new AppError(
			"ATTACHMENT_LIMIT_EXCEEDED",
			`Maximum ${max} attachments per message.`,
			422,
		),
	invalidAttachmentType: (type: string) =>
		new AppError("INVALID_ATTACHMENT_TYPE", `Attachment type '${type}' is not allowed.`, 422),
	fileTooLarge: (maxMb: number) =>
		new AppError("FILE_TOO_LARGE", `File exceeds the maximum size of ${maxMb} MB.`, 422),

	pollNotFound: () => new AppError("POLL_NOT_FOUND", "Poll does not exist.", 404),
	pollClosed: () => new AppError("POLL_CLOSED", "This poll is closed.", 409),
	pollOptionNotFound: () => new AppError("POLL_OPTION_NOT_FOUND", "Poll option does not exist.", 404),
	pollOptionCrossPoll: () =>
		new AppError("POLL_OPTION_CROSS_POLL", "Poll option does not belong to this poll.", 422),
	invalidPollOptionCount: (min: number, max: number) =>
		new AppError(
			"INVALID_POLL_OPTION_COUNT",
			`A poll must have between ${min} and ${max} options.`,
			422,
		),

	reportAlreadyExists: () =>
		new AppError("REPORT_ALREADY_EXISTS", "You have already reported this message.", 409),
	cannotReportOwnMessage: () =>
		new AppError("CANNOT_REPORT_OWN_MESSAGE", "You cannot report your own message.", 422),

	spamDetected: () =>
		new AppError("SPAM_DETECTED", "Your message was flagged as spam. Please wait before sending again.", 429),
	duplicateMessage: () =>
		new AppError("DUPLICATE_MESSAGE", "This message was already sent recently.", 429),
	rateLimited: () =>
		new AppError("RATE_LIMITED", "You are sending too many requests. Please slow down.", 429),

	pinLimitReached: (limit: number) =>
		new AppError("PIN_LIMIT_REACHED", `This room allows a maximum of ${limit} pinned messages.`, 409),
	messageAlreadyPinned: () =>
		new AppError("MESSAGE_ALREADY_PINNED", "This message is already pinned.", 409),
	messageNotPinned: () =>
		new AppError("MESSAGE_NOT_PINNED", "This message is not pinned.", 404),

	validationError: (message: string) =>
		new AppError("VALIDATION_ERROR", message, 422),
	notFound: (resource: string) =>
		new AppError("NOT_FOUND", `${resource} not found.`, 404),
	conflict: (message: string) =>
		new AppError("CONFLICT", message, 409),
	internal: (message = "An internal error occurred.") =>
		new AppError("INTERNAL_ERROR", message, 500),
};
