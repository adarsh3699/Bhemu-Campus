// ============================================================
// bCampus Chat Worker — Operational Metrics
// ============================================================
// Metrics are emitted as structured logs so Cloudflare Observability can
// aggregate them without introducing an in-memory counter (which would be
// reset whenever a Worker isolate or Durable Object hibernates).

import { logger, type LogContext } from "./logger";

export type ChatMetricName =
	| "chat.auth.session"
	| "chat.ws.connected"
	| "chat.ws.disconnected"
	| "chat.ws.reconnect_metadata_expired"
	| "chat.ws.broadcast"
	| "chat.ws.fanout"
	| "chat.ws.broadcast_failed"
	| "chat.ws.heartbeat_timeout"
	| "chat.ws.message_idempotency_failed"
	| "chat.message.created"
	| "chat.message.admission"
	| "chat.room.events_replayed"
	| "chat.room.event_replay_failed";

export function metric(name: ChatMetricName, context: LogContext = {}): void {
	logger.info(`metric.${name}`, {
		metric: name,
		...context,
	});
}
