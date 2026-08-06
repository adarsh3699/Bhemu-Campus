// ============================================================
// bCampus Chat Worker — WebSocket Event Types & Builder
// ============================================================
// FRD §6.7, §6.8, §6.10
//
// Every server → client event uses this exact wire format.
// Event names are immutable — never rename after shipping.

// ---- Outgoing event names (FRD §6.10) ----

export const WS_EVENTS = {
	// Messages
	MESSAGE_CREATED: "message.created",
	MESSAGE_UPDATED: "message.updated",
	MESSAGE_DELETED: "message.deleted",

	// Reactions
	REACTION_UPDATED: "reaction.updated",

	// Polls
	POLL_UPDATED: "poll.updated",
	POLL_CLOSED: "poll.closed",

	// Announcements
	ANNOUNCEMENT_CREATED: "announcement.created",

	// Pins
	PIN_UPDATED: "pin.updated",

	// Presence
	PRESENCE_JOINED: "presence.joined",
	PRESENCE_LEFT: "presence.left",

	// Session
	ROOM_SYNCED: "room.synced",
	HEARTBEAT_ACK: "heartbeat.ack",

	// Typing (FRD §1.4 non-goal for v1 history, but relay is ok)
	TYPING_START: "typing.start",
	TYPING_STOP: "typing.stop",

	// Errors
	ERROR: "error",
} as const;

export type WsEventName = (typeof WS_EVENTS)[keyof typeof WS_EVENTS];

// ---- Incoming event names (FRD §6.9) ----
// Clients send these; the Worker handles them via REST.
// The DO only handles heartbeat and typing indicators directly.

export const CLIENT_EVENTS = {
	HEARTBEAT: "heartbeat",
	TYPING_START: "typing.start",
	TYPING_STOP: "typing.stop",
} as const;

export type ClientEventName = (typeof CLIENT_EVENTS)[keyof typeof CLIENT_EVENTS];

// ---- Wire envelope (FRD §6.7) ----

export interface WsEnvelope<T = unknown> {
	/** Globally unique event ID — clients use this for dedup (FRD §6.15) */
	id: string;
	type: WsEventName;
	timestamp: string;
	payload: T;
}

// ---- Payload shapes per event ----

export interface MessageCreatedPayload {
	message: unknown; // MessageWithAttachments — typed via shared package
}

export interface MessageDeletedPayload {
	messageId: string;
	roomId: string;
	byModerator?: boolean;
}

export interface ReactionUpdatedPayload {
	messageId: string;
	userUid: string;
	emoji: string | null; // null = removed
}

export interface PinUpdatedPayload {
	roomId: string;
	messageId: string;
	action: "pinned" | "unpinned";
}

export interface PresencePayload {
	uid: string;
	role: string;
	roomId: string;
	reason?: string;
}

export interface RoomSyncedPayload {
	roomId: string;
	connectedAt: string;
	onlineUsers: Array<{ uid: string; role: string; connectedAt: number }>;
}

export interface ErrorPayload {
	code: string;
	message: string;
}

// ---- Builder ----

/**
 * Constructs a fully-typed WS envelope ready for JSON serialisation.
 * Used by ChatRoomDO to ensure every outgoing event follows the spec.
 */
export function buildEvent<T>(type: WsEventName, payload: T): WsEnvelope<T> {
	return {
		id: crypto.randomUUID(),
		type,
		timestamp: new Date().toISOString(),
		payload,
	};
}

export function serializeEvent<T>(type: WsEventName, payload: T): string {
	return JSON.stringify(buildEvent(type, payload));
}
