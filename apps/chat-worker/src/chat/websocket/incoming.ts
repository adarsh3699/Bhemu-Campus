// ============================================================
// bCampus Chat Worker — Incoming WebSocket Event Types
// ============================================================
// FRD §6.9
//
// Defines every event a client may send to the server.
// All mutation events (message.send, reaction.set, etc.) are
// handled via the REST API — not directly over WebSocket.
//
// The Durable Object (ChatRoomDO) handles only:
//   - heartbeat       (keeps the connection alive)
//   - typing.start    (relayed to other room members)
//   - typing.stop     (relayed to other room members)
//
// All other operations use HTTP so they benefit from:
//   - Zod validation
//   - Full service layer
//   - Transactional DB writes
//   - Proper error codes

export type IncomingEventType =
	// Connection
	| "heartbeat"
	// Typing indicators
	| "typing.start"
	| "typing.stop";

export interface IncomingEvent {
	type: IncomingEventType | string; // string allows safe unknown-event handling
	payload?: unknown;
}

/**
 * Parses a raw WebSocket message into an IncomingEvent.
 * Returns null on parse failure — unknown events are silently ignored (FRD §6.21).
 */
export function parseIncomingEvent(raw: string): IncomingEvent | null {
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (
			typeof parsed === "object" &&
			parsed !== null &&
			"type" in parsed &&
			typeof (parsed as Record<string, unknown>)["type"] === "string"
		) {
			return parsed as IncomingEvent;
		}
		return null;
	} catch {
		return null;
	}
}
