// ============================================================
// bCampus Chat Worker — ConnectionManager
// ============================================================
// FRD §3.2, §6.6
//
// Encapsulates all WebSocket connection state for ChatRoomDO.
// Each connection now carries:
//   - connectionId  (unique per socket — FRD §6.6)
//   - uid           (Firebase UID)
//   - role          (AppRole)
//   - deviceType    (FRD §6.6)
//   - connectedAt
//   - lastHeartbeat

import type { AppRole, ModerationStatus } from "../types";

export interface ConnectionMeta {
	/** Unique per socket — not per user (FRD §6.6) */
	connectionId: string;
	uid: string;
	role: AppRole;
	/** e.g. "web" | "mobile" | "unknown" */
	deviceType: string;
	connectedAt: number;
	lastHeartbeat: number;
	/** Auth state copied from the verified short-lived chat session. */
	moderationStatus?: ModerationStatus;
	moderationExpiresAt?: string | null;
	authExpiresAt?: number;
}

export interface PresenceEntry {
	uid: string;
	role: AppRole;
	connectedAt: number;
}

export class ConnectionManager {
	private readonly connections = new Map<WebSocket, ConnectionMeta>();

	// ----------------------------------------------------------------
	// Lifecycle
	// ----------------------------------------------------------------

	add(
		ws: WebSocket,
		uid: string,
		role: AppRole,
		deviceType = "unknown",
		auth?: Pick<ConnectionMeta, "moderationStatus" | "moderationExpiresAt" | "authExpiresAt">,
	): ConnectionMeta {
		const meta: ConnectionMeta = {
			connectionId: crypto.randomUUID(),
			uid,
			role,
			deviceType,
			connectedAt: Date.now(),
			lastHeartbeat: Date.now(),
			...auth,
		};
		this.connections.set(ws, meta);
		return meta;
	}

	/**
	 * Restores a connection which survived Durable Object hibernation.
	 *
	 * The WebSocket Hibernation API keeps the socket alive, but the DO's
	 * in-memory Map is recreated with the next constructor invocation.
	 */
	restore(ws: WebSocket, meta: ConnectionMeta): void {
		this.connections.set(ws, { ...meta });
	}

	remove(ws: WebSocket): ConnectionMeta | null {
		const meta = this.connections.get(ws);
		this.connections.delete(ws);
		return meta ?? null;
	}

	get(ws: WebSocket): ConnectionMeta | null {
		return this.connections.get(ws) ?? null;
	}

	get size(): number {
		return this.connections.size;
	}

	// ----------------------------------------------------------------
	// Heartbeat
	// ----------------------------------------------------------------

	refreshHeartbeat(ws: WebSocket): ConnectionMeta | null {
		const meta = this.connections.get(ws);
		if (meta) meta.lastHeartbeat = Date.now();
		return meta ?? null;
	}

	staleConnections(timeoutMs: number): WebSocket[] {
		const now = Date.now();
		return [...this.connections.entries()]
			.filter(([, m]) => now - m.lastHeartbeat > timeoutMs)
			.map(([ws]) => ws);
	}

	// ----------------------------------------------------------------
	// Sends
	// ----------------------------------------------------------------

	broadcastAll(message: string): void {
		for (const [ws] of this.connections) this.safeSend(ws, message);
	}

	broadcastExcept(exclude: WebSocket, message: string): void {
		for (const [ws] of this.connections) {
			if (ws !== exclude) this.safeSend(ws, message);
		}
	}

	send(ws: WebSocket, message: string): void {
		this.safeSend(ws, message);
	}

	sendToUser(uid: string, message: string): void {
		for (const [ws, meta] of this.connections) {
			if (meta.uid === uid) this.safeSend(ws, message);
		}
	}

	// ----------------------------------------------------------------
	// Presence
	// ----------------------------------------------------------------

	onlineUsers(): PresenceEntry[] {
		const seen = new Map<string, PresenceEntry>();
		for (const meta of this.connections.values()) {
			if (!seen.has(meta.uid)) {
				seen.set(meta.uid, {
					uid: meta.uid,
					role: meta.role,
					connectedAt: meta.connectedAt,
				});
			}
		}
		return [...seen.values()];
	}

	isOnline(uid: string): boolean {
		for (const meta of this.connections.values()) {
			if (meta.uid === uid) return true;
		}
		return false;
	}

	// ----------------------------------------------------------------
	// Private
	// ----------------------------------------------------------------

	private safeSend(ws: WebSocket, message: string): void {
		try {
			ws.send(message);
		} catch {
			this.connections.delete(ws);
		}
	}
}
