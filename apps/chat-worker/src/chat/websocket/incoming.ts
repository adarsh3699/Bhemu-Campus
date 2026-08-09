// ============================================================
// bCampus Chat Worker — Incoming WebSocket Event Types
// ============================================================
// FRD §6.9
//
// Defines every event a client may send to the server.
// Message creation is a WebSocket command. REST remains available only for
// reads and non-create mutations such as edit/delete.
//
// The Durable Object handles heartbeat/typing directly and can handle the
// message.send command with durable event persistence and idempotent ACKs.
//
// Edit/delete and other room mutations continue to use HTTP so they benefit from:
//   - Zod validation
//   - Full service layer
//   - Transactional DB writes
//   - Proper error codes

export type IncomingEventType =
	// Connection
	| "heartbeat"
	| "message.send"
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
