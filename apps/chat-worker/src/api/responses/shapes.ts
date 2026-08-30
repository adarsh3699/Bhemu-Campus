// ============================================================
// bCampus Chat Worker — Typed API Response Shapes
// ============================================================
// FRD §3.2, §5.4
//
// Every endpoint returns one of these two shapes.
// These types are the contract between backend and frontend.
// Keep in sync with @bhemu/shared/types/chat.ts.

// ---- Standard envelopes ----

export interface ApiSuccess<T> {
	success: true;
	data: T;
}

export interface ApiError {
	success: false;
	error: {
		code: string;
		message: string;
	};
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ---- Room responses ----

export interface RoomPolicyResponse {
	id: string;
	name: string;
	retentionDays: number;
	maxMessages: number;
	sendMessageRole: string;
	sendAttachmentRole: string;
	createPollRole: string;
	createAnnouncementRole: string;
	pinMessageRole: string;
	pinLimit: number;
}

export interface RoomResponse {
	id: string;
	type: string;
	visibility: string;
	name: string;
	description: string | null;
	messageCount: number;
	lastMessageAt: string | null;
	policy: RoomPolicyResponse;
	createdAt: string;
	updatedAt: string;
}

// ---- Message responses ----

export interface AttachmentResponse {
	id: string;
	type: string;
	displayOrder: number;
	originalFileName: string;
	mimeType: string;
	fileSize: number;
	storageKey: string;
	createdAt: string;
}

export interface MessageResponse {
	id: string;
	roomId: string;
	authorUid: string;
	authorName: string;
	replyToMessageId: string | null;
	type: string;
	visibility: string;
	content: string;
	editedAt: string | null;
	deletedAt: string | null;
	attachments: AttachmentResponse[];
	poll: PollResponse | null;
	createdAt: string;
	updatedAt: string;
}

export interface PaginatedMessagesResponse {
	items: MessageResponse[];
	nextCursor: string | null;
	hasMore: boolean;
}

// ---- Reaction responses ----

export interface ReactionResponse {
	messageId: string;
	userUid: string;
	emoji: string;
	createdAt: string;
}

// ---- Poll responses ----

export interface PollOptionResponse {
	id: string;
	pollId: string;
	optionText: string;
	displayOrder: number;
	voteCount: number;
	createdAt: string;
}

export interface PollResponse {
	id: string;
	messageId: string;
	multipleChoice: boolean;
	isClosed: boolean;
	closesAt: string | null;
	options: PollOptionResponse[];
	createdAt: string;
	updatedAt: string;
}

// ---- Report responses ----

export interface ReportResponse {
	id: string;
	messageId: string;
	reporterUid: string;
	reason: string;
	description: string | null;
	createdAt: string;
}

// ---- Pin responses ----

export interface PinResponse {
	roomId: string;
	messageId: string;
	pinnedBy: string;
	pinnedAt: string;
}

// ---- Moderation responses ----

export interface ModerationActionResponse {
	id: string;
	userUid: string;
	moderatorUid: string;
	action: string;
	actionReason: string | null;
	messageId: string | null;
	expiresAt: string | null;
	createdAt: string;
}

// ---- Upload URL response ----

export interface UploadUrlResponse {
	storageKey: string;
	uploadUrl: string;
	expiresInSeconds: number;
}
