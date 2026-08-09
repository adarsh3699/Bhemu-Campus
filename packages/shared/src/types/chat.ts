// ============================================================
// @bhemu/shared — Chat Types
// ============================================================
// FRD §3.13: all request/response types shared between Worker,
// React Native app, and web frontend.
// Keep in sync with apps/chat-worker/src/api/responses/shapes.ts

// ---- Enums ----

export type RoomType = "UNIVERSITY" | "BATCHMATE";
export type RoomVisibility = "PUBLIC" | "PRIVATE" | "HIDDEN";
export type AppRole = "STUDENT" | "MODERATOR" | "ADMIN";
export type ModerationStatus = "active" | "flagged" | "suspended" | "banned";
export type MessageType =
	| "TEXT"
	| "IMAGE"
	| "DOCUMENT"
	| "GIF"
	| "POLL"
	| "ANNOUNCEMENT"
	| "SYSTEM";
export type MessageVisibility = "VISIBLE" | "HIDDEN" | "DELETED";
export type AttachmentType = "IMAGE" | "DOCUMENT" | "GIF";
export type ReportReason =
	| "SPAM"
	| "HARASSMENT"
	| "ABUSE"
	| "INAPPROPRIATE"
	| "MISINFORMATION"
	| "OTHER";
export type ModerationActionType =
	| "WARN"
	| "FLAG"
	| "UNFLAG"
	| "SUSPEND"
	| "BAN"
	| "DELETE_MESSAGE";

// ---- API Response Envelope ----

export interface ApiSuccess<T> {
	success: true;
	data: T;
}

export interface ApiError {
	success: false;
	error: { code: string; message: string };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ---- Room ----

export interface RoomPolicy {
	id: string;
	name: string;
	retentionDays: number;
	maxMessages: number;
	sendMessageRole: AppRole;
	sendAttachmentRole: AppRole;
	createPollRole: AppRole;
	createAnnouncementRole: AppRole;
	pinMessageRole: AppRole;
	pinLimit: number;
	createdAt: string;
	updatedAt: string;
}

export interface ChatRoom {
	id: string;
	type: RoomType;
	visibility: RoomVisibility;
	name: string;
	description: string | null;
	/**
	 * groupKey — null for UNIVERSITY, "{batchYear}_{programCode}" for BATCHMATE.
	 * e.g. "2024_P132", "2023_P164-NN1"
	 */
	groupKey: string | null;
	messageCount: number;
	lastMessageAt: string | null;
	policy: RoomPolicy;
	createdAt: string;
	updatedAt: string;
}

// ---- Message ----

export interface ChatAttachment {
	id: string;
	messageId: string;
	type: AttachmentType;
	displayOrder: number;
	originalFileName: string;
	mimeType: string;
	fileSize: number;
	storageKey: string;
	createdAt: string;
}

export interface ChatMessage {
	id: string;
	roomId: string;
	authorUid: string;
	/** Immutable display-name snapshot captured when the message was sent. */
	authorName: string;
	replyToMessageId: string | null;
	type: MessageType;
	visibility: MessageVisibility;
	content: string;
	/** ISO string — set when the author edits the message */
	editedAt: string | null;
	/** ISO string — set when the message is soft-deleted */
	deletedAt: string | null;
	attachments: ChatAttachment[];
	createdAt: string;
	updatedAt: string;
}

// ---- Reaction ----

export interface ChatReaction {
	messageId: string;
	userUid: string;
	emoji: string;
	createdAt: string;
}

// ---- Poll ----

export interface PollOption {
	id: string;
	pollId: string;
	optionText: string;
	displayOrder: number;
	voteCount: number;
	createdAt: string;
}

export interface ChatPoll {
	id: string;
	messageId: string;
	multipleChoice: boolean;
	isClosed: boolean;
	closesAt: string | null;
	options: PollOption[];
	createdAt: string;
	updatedAt: string;
}

// ---- Report ----

export interface ChatReport {
	id: string;
	messageId: string;
	reporterUid: string;
	reason: ReportReason;
	description: string | null;
	createdAt: string;
}

// ---- Pin ----

export interface RoomPin {
	roomId: string;
	messageId: string;
	pinnedBy: string;
	pinnedAt: string;
}

// ---- Moderation ----

export interface ModerationAction {
	id: string;
	userUid: string;
	moderatorUid: string;
	action: ModerationActionType;
	actionReason: string | null;
	messageId: string | null;
	expiresAt: string | null;
	createdAt: string;
}

// ---- Pagination ----

export interface PaginatedResult<T> {
	items: T[];
	nextCursor: string | null;
	hasMore: boolean;
}

// ---- WebSocket event envelope ----

export interface WsEnvelope<T = unknown> {
	id: string;
	type: string;
	timestamp: string;
	payload: T;
}

// ---- WebSocket presence ----

export interface PresenceUser {
	uid: string;
	role: AppRole;
	connectedAt: number;
}

// ---- Request bodies (for use in frontend) ----

export interface CreateMessageRequest {
	roomId: string;
	content?: string;
	replyToMessageId?: string | null;
	idempotencyKey?: string | null;
	attachments?: {
		type: AttachmentType;
		originalFileName: string;
		mimeType: string;
		fileSize: number;
		storageKey: string;
		displayOrder: number;
	}[];
}

export interface CreatePollRequest {
	roomId: string;
	content: string;
	options: string[];
	multipleChoice?: boolean;
	closesAt?: string | null;
}

export interface ReportMessageRequest {
	messageId: string;
	reason: ReportReason;
	description?: string | null;
}
