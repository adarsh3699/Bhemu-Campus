// ============================================================
// bCampus Chat Worker — Chat Room Durable Object
// ============================================================
// FRD §3.7, §5.16, §5.17, §6
//
// Responsibilities:
//   - WebSocket connection lifecycle
//   - Broadcasting realtime events
//   - Presence (joined / left / online snapshot)
//   - Heartbeat liveness sweep via Alarm
//   - Rate limiting per user (FRD §5.17)
//   - Idempotency key store (FRD §5.16)
//   - Internal /broadcast POST from Worker (after DB commit)
//
// NOT responsible for:
//   - JWT verification (done in Worker before handoff)
//   - PostgreSQL writes (Service layer only)
//   - Business validation (Service layer only)

import { DurableObject } from "cloudflare:workers";
import { ConnectionManager } from "./ConnectionManager";
import { RateLimiter } from "./RateLimiter";
import { IdempotencyStore } from "./IdempotencyStore";
import { serializeEvent, WS_EVENTS } from "../chat/events/events";
import { parseIncomingEvent } from "../chat/websocket/incoming";
import { HEARTBEAT_INTERVAL_MS, HEARTBEAT_TIMEOUT_MS } from "../constants";
import type { AppRole, Env } from "../types";

// ---- Rate limit config — 5 messages / 10 s burst, 1 msg/s sustained ----
const MSG_RATE_CONFIG = { capacity: 5, refillRate: 1 };

export class ChatRoomDO extends DurableObject<Env> {
	private readonly cm = new ConnectionManager();
	private readonly rl = new RateLimiter(MSG_RATE_CONFIG);
	private readonly idempotency: IdempotencyStore;
	private roomId: string | null = null;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.idempotency = new IdempotencyStore(ctx.storage);
		this.ctx.storage.setAlarm(Date.now() + HEARTBEAT_INTERVAL_MS);
	}

	// ------------------------------------------------------------------
	// fetch() — WS upgrades, internal broadcasts, presence, idempotency
	// ------------------------------------------------------------------
	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		// ---- POST /broadcast — Worker sends after DB commit ----
		if (request.method === "POST" && url.pathname === "/broadcast") {
			const body = await request.json<{ roomId: string; event: string; data: unknown }>();
			this.roomId ??= body.roomId;
			this.cm.broadcastAll(serializeEvent(body.event as Parameters<typeof serializeEvent>[0], body.data));
			return new Response(null, { status: 204 });
		}

		// ---- GET /presence — online user snapshot ----
		if (request.method === "GET" && url.pathname === "/presence") {
			return Response.json({ users: this.cm.onlineUsers(), roomId: this.roomId });
		}

		// ---- POST /idempotency/check — Worker checks before creating message ----
		if (request.method === "POST" && url.pathname === "/idempotency/check") {
			const { roomId, key } = await request.json<{ roomId: string; key: string }>();
			const existing = await this.idempotency.get(roomId, key);
			return Response.json({ messageId: existing });
		}

		// ---- POST /idempotency/set — Worker records after successful create ----
		if (request.method === "POST" && url.pathname === "/idempotency/set") {
			const { roomId, key, messageId } = await request.json<{
				roomId: string;
				key: string;
				messageId: string;
			}>();
			await this.idempotency.set(roomId, key, messageId);
			return new Response(null, { status: 204 });
		}

		// ---- POST /ratelimit/check — Worker checks before message create ----
		if (request.method === "POST" && url.pathname === "/ratelimit/check") {
			const { uid } = await request.json<{ uid: string }>();
			const allowed = this.rl.consume(`msg:${uid}`);
			return Response.json({ allowed }, { status: allowed ? 200 : 429 });
		}

		// ---- WebSocket upgrade ----
		if (request.headers.get("Upgrade") !== "websocket") {
			return new Response("Expected Upgrade: websocket", { status: 426 });
		}

		const uid = request.headers.get("X-User-Id");
		const role = (request.headers.get("X-User-Role") ?? "STUDENT") as AppRole;
		const roomId = request.headers.get("X-Room-Id");
		const deviceType = request.headers.get("X-Device-Type") ?? "unknown";

		if (!uid || !roomId) {
			return new Response("Missing identity headers", { status: 401 });
		}

		this.roomId ??= roomId;

		const [client, server] = Object.values(new WebSocketPair()) as [WebSocket, WebSocket];
		this.ctx.acceptWebSocket(server);

		const meta = this.cm.add(server, uid, role, deviceType);

		// room.synced — FRD §6.18
		this.cm.send(
			server,
			serializeEvent(WS_EVENTS.ROOM_SYNCED, {
				roomId,
				connectionId: meta.connectionId,
				connectedAt: new Date().toISOString(),
				onlineUsers: this.cm.onlineUsers(),
			}),
		);

		// presence.joined — notify all OTHER clients
		this.cm.broadcastExcept(
			server,
			serializeEvent(WS_EVENTS.PRESENCE_JOINED, { uid, role, roomId }),
		);

		return new Response(null, { status: 101, webSocket: client });
	}

	// ------------------------------------------------------------------
	// webSocketMessage — heartbeat + typing relay
	// ------------------------------------------------------------------
	async webSocketMessage(ws: WebSocket, rawMessage: string | ArrayBuffer): Promise<void> {
		if (typeof rawMessage !== "string") return;

		const meta = this.cm.get(ws);
		if (!meta) return;

		const event = parseIncomingEvent(rawMessage);
		if (!event) return;

		switch (event.type) {
			case "heartbeat":
				this.cm.refreshHeartbeat(ws);
				this.cm.send(ws, serializeEvent(WS_EVENTS.HEARTBEAT_ACK, { ts: Date.now() }));
				break;

			case "typing.start":
			case "typing.stop":
				if (this.roomId) {
					this.cm.broadcastExcept(
						ws,
						serializeEvent(
							event.type === "typing.start" ? WS_EVENTS.TYPING_START : WS_EVENTS.TYPING_STOP,
							{ uid: meta.uid, roomId: this.roomId },
						),
					);
				}
				break;

			default:
				// Silently discard unknown events (FRD §6.21)
				break;
		}
	}

	// ------------------------------------------------------------------
	// Disconnect handlers
	// ------------------------------------------------------------------
	webSocketClose(ws: WebSocket): void {
		this.handleDisconnect(ws);
	}

	webSocketError(ws: WebSocket): void {
		this.handleDisconnect(ws);
	}

	// ------------------------------------------------------------------
	// Alarm — heartbeat sweep + rate limiter prune
	// ------------------------------------------------------------------
	async alarm(): Promise<void> {
		// Sweep stale connections
		for (const ws of this.cm.staleConnections(HEARTBEAT_TIMEOUT_MS)) {
			try { ws.close(1001, "Heartbeat timeout"); } catch { /* already closed */ }
			const meta = this.cm.remove(ws);
			if (meta && this.roomId && !this.cm.isOnline(meta.uid)) {
				this.cm.broadcastAll(
					serializeEvent(WS_EVENTS.PRESENCE_LEFT, {
						uid: meta.uid,
						roomId: this.roomId,
						reason: "timeout",
					}),
				);
			}
		}

		// Prune stale rate-limit buckets
		this.rl.prune();

		this.ctx.storage.setAlarm(Date.now() + HEARTBEAT_INTERVAL_MS);
	}

	// ------------------------------------------------------------------
	// Private
	// ------------------------------------------------------------------
	private handleDisconnect(ws: WebSocket): void {
		const meta = this.cm.remove(ws);
		if (!meta || !this.roomId) return;

		if (!this.cm.isOnline(meta.uid)) {
			this.cm.broadcastAll(
				serializeEvent(WS_EVENTS.PRESENCE_LEFT, { uid: meta.uid, roomId: this.roomId }),
			);
		}
	}
}

export type { Env };
