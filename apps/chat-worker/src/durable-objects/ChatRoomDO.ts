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
//   - Admission sequencing and duplicate-spam reservations
//   - Internal /broadcast POST from Worker (after DB commit)
//
// NOT responsible for:
//   - JWT verification (done in Worker before handoff)
//   - PostgreSQL writes for the WebSocket message command
//   - Business validation (Service layer only)

import { DurableObject } from "cloudflare:workers";
import { ConnectionManager, type ConnectionMeta } from "./ConnectionManager";
import { RateLimiter } from "./RateLimiter";
import { SpamAdmissionStore } from "../chat/spam/spam.admission";
import { RoomSequenceStore } from "./RoomSequenceStore";
import { createDb } from "../db/drizzle";
import { MessageService, RoomSequenceConflictError } from "../chat/services/message.service";
import { CreateMessageSchema } from "../api/validators/message.validator";
import { serializeEvent, WS_EVENTS } from "../chat/events/events";
import { parseIncomingEvent } from "../chat/websocket/incoming";
import { HEARTBEAT_INTERVAL_MS, HEARTBEAT_TIMEOUT_MS } from "../constants";
import { AppError } from "../lib/errors";
import { messageFingerprint } from "../lib/fingerprint";
import type { AppRole, AuthUser, Env, ModerationStatus } from "../types";
import type { Room, RoomPolicy } from "../db/schema";
import { metric } from "../lib/metrics";

// ---- Rate limit config — 5 messages / 10 s burst, 1 msg/s sustained ----
const MSG_RATE_CONFIG = { capacity: 5, refillRate: 1 };

/** Data retained by Cloudflare with each hibernatable WebSocket. */
interface SocketAttachment extends ConnectionMeta {
	roomId: string;
}

function isSocketAttachment(value: unknown): value is SocketAttachment {
	if (!value || typeof value !== "object") return false;
	const attachment = value as Record<string, unknown>;
	return typeof attachment.roomId === "string"
		&& typeof attachment.connectionId === "string"
		&& typeof attachment.uid === "string"
		&& typeof attachment.role === "string"
		&& typeof attachment.deviceType === "string"
		&& typeof attachment.connectedAt === "number"
		&& typeof attachment.lastHeartbeat === "number";
}

function isAppRole(value: unknown): value is AppRole {
	return value === "STUDENT" || value === "MODERATOR" || value === "ADMIN";
}

function decodeDisplayName(value: string | null): string {
	if (!value) return "Student";
	try {
		const decoded = decodeURIComponent(value).replace(/\s+/g, " ").trim();
		return decoded ? decoded.slice(0, 100) : "Student";
	} catch {
		return "Student";
	}
}

/** Parse only the policy fields required by message authorization. */
function parseRoomPolicy(raw: string | null): RoomPolicy | undefined {
	if (!raw) return undefined;
	try {
		const value = JSON.parse(raw) as Record<string, unknown>;
		if (
			typeof value.id !== "string"
			|| typeof value.name !== "string"
			|| !isAppRole(value.sendMessageRole)
			|| !isAppRole(value.sendAttachmentRole)
			|| !isAppRole(value.createPollRole)
			|| !isAppRole(value.createAnnouncementRole)
			|| !isAppRole(value.pinMessageRole)
			|| typeof value.pinLimit !== "number"
		) return undefined;
		return value as RoomPolicy;
	} catch {
		return undefined;
	}
}

/** Include only safe driver metadata in observability; never raw SQL/content. */
function dbErrorContext(error: unknown): Record<string, string> {
	if (!error || typeof error !== "object") return {};
	const candidate = error as Record<string, unknown>;
	const cause = candidate.cause && typeof candidate.cause === "object"
		? candidate.cause as Record<string, unknown>
		: undefined;
	const read = (key: string): string | undefined => {
		const value = candidate[key] ?? cause?.[key];
		return typeof value === "string" && value.length > 0 ? value : undefined;
	};
	const context: Record<string, string> = {};
	const errorName = read("name");
	const errorCode = read("code");
	const constraint = read("constraint");
	if (errorName) context.errorName = errorName;
	if (errorCode) context.errorCode = errorCode;
	if (constraint) context.constraint = constraint;
	return context;
}

export class ChatRoomDO extends DurableObject<Env> {
	private readonly workerEnv: Env;
	private readonly cm = new ConnectionManager();
	private readonly rl = new RateLimiter(MSG_RATE_CONFIG);
	private readonly spamAdmission: SpamAdmissionStore;
	private readonly sequences: RoomSequenceStore;
	/**
	 * Serializes fan-out so a background send cannot overtake an earlier event
	 * from an HTTP mutation. The queue is deliberately separate from message
	 * admission: the database/event-stream commit remains the source of truth.
	 */
	private fanoutQueue: Promise<void> = Promise.resolve();
	private roomId: string | null = null;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.workerEnv = env;
		this.spamAdmission = new SpamAdmissionStore(ctx.storage);
		this.sequences = new RoomSequenceStore(ctx.storage);
		this.restoreHibernatingConnections();
		this.ctx.storage.setAlarm(Date.now() + HEARTBEAT_INTERVAL_MS);
	}

	// ------------------------------------------------------------------
	// fetch() — WS upgrades, broadcasts, presence, and admission state
	// ------------------------------------------------------------------
	override async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		// ---- POST /broadcast — Worker sends after DB commit ----
		if (request.method === "POST" && url.pathname === "/broadcast") {
			const body = await request.json<{ roomId: string; event: string; data: unknown }>();
			this.roomId ??= body.roomId;
			// HTTP mutations wait for the ordered fan-out to finish. This keeps
			// edit/delete/reaction events from overtaking a queued message event,
			// while WebSocket message sends use the same queue without waiting.
			await this.enqueueFanout(body.roomId, { event: body.event, data: body.data }, true);
			return new Response(null, { status: 204 });
		}

		// ---- GET /presence — online user snapshot ----
		if (request.method === "GET" && url.pathname === "/presence") {
			return Response.json({ users: this.cm.onlineUsers(), roomId: this.roomId });
		}

		// ---- WebSocket upgrade ----
		if (request.headers.get("Upgrade") !== "websocket") {
			return new Response("Expected Upgrade: websocket", { status: 426 });
		}

		const uid = request.headers.get("X-User-Id");
		const role = (request.headers.get("X-User-Role") ?? "STUDENT") as AppRole;
		const displayName = decodeDisplayName(request.headers.get("X-User-Display-Name"));
		const roomId = request.headers.get("X-Room-Id");
		const deviceType = request.headers.get("X-Device-Type") ?? "unknown";
		const roomVisibilityRaw = request.headers.get("X-Room-Visibility");
		const roomVisibility: Room["visibility"] | undefined =
			roomVisibilityRaw === "PUBLIC" || roomVisibilityRaw === "PRIVATE" || roomVisibilityRaw === "HIDDEN"
				? roomVisibilityRaw
				: undefined;
		const roomPolicy = parseRoomPolicy(request.headers.get("X-Room-Policy"));
		const moderationStatus = request.headers.get("X-User-Moderation-Status") as ModerationStatus | null;
		const moderationExpiresAt = request.headers.get("X-User-Moderation-Expires-At");
		const authExpiresAtRaw = request.headers.get("X-Chat-Auth-Expires-At");
		const authExpiresAt = authExpiresAtRaw ? Number(authExpiresAtRaw) : undefined;

		if (!uid || !roomId) {
			return new Response("Missing identity headers", { status: 401 });
		}

		this.roomId ??= roomId;

		const [client, server] = Object.values(new WebSocketPair()) as [WebSocket, WebSocket];
		this.ctx.acceptWebSocket(server);

		const meta = this.cm.add(server, uid, role, deviceType, {
			displayName,
			moderationStatus: moderationStatus ?? undefined,
			moderationExpiresAt: moderationExpiresAt || null,
			authExpiresAt: Number.isFinite(authExpiresAt) ? authExpiresAt : undefined,
			roomVisibility,
			roomPolicy,
		});
		this.persistConnection(server, meta, roomId);
		metric("chat.ws.connected", {
			roomId,
			connectionId: meta.connectionId,
			deviceType,
			connectionCount: this.cm.size,
		});

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
	override async webSocketMessage(ws: WebSocket, rawMessage: string | ArrayBuffer): Promise<void> {
		if (typeof rawMessage !== "string") return;

		const meta = this.connectionFor(ws);
		if (!meta) return;

		const event = parseIncomingEvent(rawMessage);
		if (!event) return;

		switch (event.type) {
			case "message.send": {
				await this.handleMessageSend(ws, meta, event.payload);
				break;
			}

			case "heartbeat": {
				const refreshed = this.cm.refreshHeartbeat(ws);
				if (!refreshed || !this.roomId) return;
				this.persistConnection(ws, refreshed, this.roomId);
				const roomSeq = await this.sequences.current(this.roomId);
				this.cm.send(ws, serializeEvent(WS_EVENTS.HEARTBEAT_ACK, {
					receivedAt: Date.now(),
					roomSeq,
				}));
				break;
			}

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
	override webSocketClose(ws: WebSocket): void {
		this.handleDisconnect(ws);
	}

	override webSocketError(ws: WebSocket): void {
		this.handleDisconnect(ws);
	}

	// ------------------------------------------------------------------
	// Alarm — heartbeat sweep + rate limiter prune
	// ------------------------------------------------------------------
	override async alarm(): Promise<void> {
		// Sweep stale connections
		const staleConnections = this.cm.staleConnections(HEARTBEAT_TIMEOUT_MS);
		for (const ws of staleConnections) {
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
		const staleCount = staleConnections.length;
		if (staleCount > 0) {
			metric("chat.ws.heartbeat_timeout", {
				roomId: this.roomId ?? undefined,
				connectionCount: staleCount,
			});
		}

		// Prune stale rate-limit buckets
		this.rl.prune();

		this.ctx.storage.setAlarm(Date.now() + HEARTBEAT_INTERVAL_MS);
	}

	// ------------------------------------------------------------------
	// Private
	// ------------------------------------------------------------------
	private async handleMessageSend(
		ws: WebSocket,
		meta: ConnectionMeta,
		payload: unknown,
	): Promise<void> {
		const startedAt = Date.now();
		const sendError = (code: string, message: string, clientMessageId?: string | null): void => {
			this.cm.send(ws, serializeEvent(WS_EVENTS.MESSAGE_ERROR, {
				code,
				message,
				clientMessageId: clientMessageId ?? null,
			}));
		};

		if (!this.roomId) {
			sendError("ROOM_NOT_READY", "Message room is not ready.");
			return;
		}
		if (meta.authExpiresAt !== undefined && Date.now() >= meta.authExpiresAt) {
			sendError("CHAT_SESSION_REQUIRED", "Chat session expired. Reconnecting is required.");
			try { ws.close(4001, "Chat session expired"); } catch { /* already closed */ }
			return;
		}
		if (!meta.moderationStatus) {
			sendError("CHAT_SESSION_REQUIRED", "Socket authorization metadata is unavailable.");
			return;
		}

		const record = payload && typeof payload === "object"
			? payload as Record<string, unknown>
			: {};
		const parsed = CreateMessageSchema.safeParse({ ...record, roomId: this.roomId });
		if (!parsed.success) {
			sendError("VALIDATION_ERROR", "Invalid message payload.");
			return;
		}

		const key = parsed.data.idempotencyKey ?? null;

		if (!this.rl.consume(`msg:${meta.uid}`)) {
			sendError("RATE_LIMITED", "You are sending too many requests. Please slow down.", key);
			return;
		}

		const fingerprint = await messageFingerprint(
			parsed.data.content,
			this.workerEnv.CHAT_SESSION_SECRET,
		);
		const reservationId = fingerprint ? crypto.randomUUID() : null;
		if (fingerprint && reservationId) {
			const admitted = await this.spamAdmission.admit(
				this.roomId,
				meta.uid,
				fingerprint,
				reservationId,
			);
			if (!admitted) {
				sendError("DUPLICATE_MESSAGE", "This message was already sent recently.", key);
				return;
			}
		}

		let roomSeq = await this.sequences.next(this.roomId);
		const admissionDurationMs = Date.now() - startedAt;
		metric("chat.message.admission", {
			roomId: this.roomId,
			transport: "websocket",
			result: "durable_do",
			durationMs: admissionDurationMs,
		});
		const user: AuthUser = {
			uid: meta.uid,
			email: null,
			displayName: meta.displayName ?? "Student",
			role: meta.role,
			moderation: {
				status: meta.moderationStatus,
				expiresAt: meta.moderationExpiresAt ?? null,
			},
		};

		try {
			const service = new MessageService(createDb(this.workerEnv.DATABASE_URL));
			let result: Awaited<ReturnType<MessageService["createMessage"]>> | null = null;
			const serviceStartedAt = Date.now();
			for (let attempt = 0; attempt < 2; attempt += 1) {
				try {
					result = await service.createMessage(
						user,
						{
							...parsed.data,
							roomSeq,
							...(meta.roomVisibility === "PUBLIC" && meta.roomPolicy
								? {
									verifiedPublicRoom: {
										id: this.roomId,
										visibility: meta.roomVisibility,
										policy: meta.roomPolicy,
									},
								}
								: {}),
						},
						async (roomId, event) => {
							// The message is already durable in Neon + room_events. Queue
							// fan-out in the background so the sender ACK is not held up by
							// the number or health of connected receivers.
							this.enqueueFanout(roomId, event);
						},
					);
					break;
				} catch (error) {
					if (!(error instanceof RoomSequenceConflictError) || attempt === 1) {
						throw error;
					}
					await this.sequences.advanceTo(this.roomId, error.highWater);
					roomSeq = await this.sequences.next(this.roomId);
					metric("chat.room.sequence_repaired", {
						roomId: this.roomId,
						staleSequence: error.roomSeq,
						highWater: error.highWater,
						newSequence: roomSeq,
					});
				}
			}
			if (!result) throw new Error("Message creation did not complete");
			const { message, created } = result;
			metric("chat.message.created", {
				roomId: this.roomId,
				transport: "websocket",
				result: created ? "created" : "idempotent",
				durationMs: Date.now() - startedAt,
				admissionDurationMs,
				serviceDurationMs: Date.now() - serviceStartedAt,
				roomPolicySource: meta.roomVisibility === "PUBLIC" && meta.roomPolicy
					? "socket_lease"
					: "database",
				roomSeq,
			});
			this.cm.send(ws, serializeEvent(WS_EVENTS.MESSAGE_ACK, {
				clientMessageId: key,
				message,
				...(created ? { roomSeq } : {}),
			}));
		} catch (err) {
			metric("chat.message.failed", {
				roomId: this.roomId,
				transport: "websocket",
				durationMs: Date.now() - startedAt,
				...dbErrorContext(err),
			});
			if (fingerprint && reservationId) {
				await this.spamAdmission.release(this.roomId, meta.uid, fingerprint, reservationId);
			}
			if (err instanceof AppError) {
				sendError(err.code, err.message, key);
			} else {
				sendError("INTERNAL_ERROR", "Message could not be sent.", key);
			}
		}
	}

	/**
	 * Fan out committed events in order without making WebSocket ACK latency
	 * depend on receiver count. Every job is registered with waitUntil so DO
	 * hibernation cannot interrupt it. HTTP callers can opt into awaiting the
	 * same queue when their endpoint promises delivery before returning.
	 */
	private enqueueFanout(
		roomId: string,
		event: { event: string; data: unknown },
		awaitDelivery = false,
	): Promise<void> {
		const job = this.fanoutQueue.then(async () => {
			// Yield once so the WebSocket message handler can send its ACK before
			// iterating every connected receiver. The queue still preserves order.
			await new Promise<void>((resolve) => setTimeout(resolve, 0));
			const startedAt = Date.now();
			try {
				this.roomId ??= roomId;
				this.cm.broadcastAll(
					serializeEvent(
						event.event as Parameters<typeof serializeEvent>[0],
						event.data,
					),
				);
				metric("chat.ws.fanout", {
					roomId,
					event: event.event,
					connectionCount: this.cm.size,
					delivery: "background_ordered",
					durationMs: Date.now() - startedAt,
				});
			} catch (error) {
				metric("chat.ws.broadcast_failed", {
					roomId,
					event: event.event,
					delivery: "background_ordered",
					durationMs: Date.now() - startedAt,
					errorName: error instanceof Error ? error.name : "unknown",
				});
			}
		});

		// A failed fan-out must not poison all subsequent events in the queue.
		this.fanoutQueue = job.catch(() => undefined);
		this.ctx.waitUntil(this.fanoutQueue);
		return awaitDelivery ? this.fanoutQueue : Promise.resolve();
	}

	private handleDisconnect(ws: WebSocket): void {
		const meta = this.cm.remove(ws);
		if (!meta || !this.roomId) return;

		metric("chat.ws.disconnected", {
			roomId: this.roomId,
			connectionId: meta.connectionId,
			connectionCount: this.cm.size,
		});

		if (!this.cm.isOnline(meta.uid)) {
			this.cm.broadcastAll(
				serializeEvent(WS_EVENTS.PRESENCE_LEFT, { uid: meta.uid, roomId: this.roomId }),
			);
		}
	}

	/** Restores live hibernatable sockets into the in-memory registry. */
	private restoreHibernatingConnections(): void {
		for (const ws of this.ctx.getWebSockets()) {
			const attachment = ws.deserializeAttachment();
			if (!isSocketAttachment(attachment)) {
				// Sockets opened by a pre-attachment deployment cannot safely be
				// associated with a user after hibernation. Let the client reconnect.
				try { ws.close(1012, "Connection metadata expired"); } catch { /* already closed */ }
				metric("chat.ws.reconnect_metadata_expired");
				continue;
			}

			this.roomId ??= attachment.roomId;
			this.cm.restore(ws, attachment);
		}
	}

	/** Persists connection identity and liveness across DO hibernation. */
	private persistConnection(ws: WebSocket, meta: ConnectionMeta, roomId: string): void {
		ws.serializeAttachment({ ...meta, roomId } satisfies SocketAttachment);
	}

	/** Defensive restoration for a socket event delivered just after a wake-up. */
	private connectionFor(ws: WebSocket): ConnectionMeta | null {
		const known = this.cm.get(ws);
		if (known) return known;

		const attachment = ws.deserializeAttachment();
		if (!isSocketAttachment(attachment)) return null;
		this.roomId ??= attachment.roomId;
		this.cm.restore(ws, attachment);
		return this.cm.get(ws);
	}
}
