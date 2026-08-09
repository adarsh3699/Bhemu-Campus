// ============================================================
// @bhemu/chat — Constants
// ============================================================

// Keep the production endpoint as the default, while allowing local web
// development to point at a local Worker without changing application code.
// The local declaration keeps the neutral package type-safe without requiring
// Node typings; Next.js can still inline the public env expression at build
// time, while runtimes without `process` safely use the default endpoint.
declare const process: { env?: Record<string, string | undefined> } | undefined;
const configuredChatApiBase =
	typeof process !== "undefined" && typeof process.env?.NEXT_PUBLIC_CHAT_API_BASE === "string"
		? process.env.NEXT_PUBLIC_CHAT_API_BASE.trim()
		: "";

export const CHAT_API_BASE = configuredChatApiBase || "https://bcampus-chat.bhemu.in";

export const WS_EVENTS = {
	MESSAGE_CREATED: "message.created",
	MESSAGE_UPDATED: "message.updated",
	MESSAGE_DELETED: "message.deleted",
	REACTION_UPDATED: "reaction.updated",
	POLL_UPDATED: "poll.updated",
	POLL_CLOSED: "poll.closed",
	ANNOUNCEMENT_CREATED: "announcement.created",
	PIN_UPDATED: "pin.updated",
	PRESENCE_JOINED: "presence.joined",
	PRESENCE_LEFT: "presence.left",
	ROOM_SYNCED: "room.synced",
	HEARTBEAT_ACK: "heartbeat.ack",
	MESSAGE_ACK: "message.ack",
	MESSAGE_ERROR: "message.error",
	TYPING_START: "typing.start",
	TYPING_STOP: "typing.stop",
	ERROR: "error",
} as const;

export type WsEventName = (typeof WS_EVENTS)[keyof typeof WS_EVENTS];
