"use client";

// ============================================================
// bCampus Web — Chat Context
// ============================================================

import React, {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useAuth } from "@/firebase/AuthContext";
import { useGpaData } from "@/contexts/GpaDataContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import {
	apiGetUniversityRoom,
	apiGetBatchmateRoom,
	apiGetMessages,
	apiGetRoomEvents,
	apiCreateChatSession,
	apiEditMessage,
	apiDeleteMessage,
	apiSetReaction,
	apiRemoveReaction,
	apiReportMessage,
	apiGetRoomPins,
	apiCreatePoll,
	apiVotePoll,
	apiClosePoll,
	apiPinMessage,
	apiUnpinMessage,
	apiWarnUser,
	apiSuspendUser,
	apiBanUser,
	apiModerationDeleteMessage,
	ChatApiError,
	WS_EVENTS,
	CHAT_API_BASE,
} from "@bhemu/chat";
import type {
	ChatDisplayMessage,
	ChatRoom,
	ChatMessage,
	ChatPoll,
	RoomPin,
	AppRole,
	WsEnvelope,
	PresenceUser,
	ReportReason,
	PinDuration,
} from "@bhemu/shared";
import { CHAT_OPTIMISTIC_PREFIX, createChatClientMessageId, getChatPinExpiry, MAX_CHAT_CACHED_MESSAGES, MAX_CHAT_MESSAGE_LENGTH, mergeChatMessages, normalizeChatDisplayName, removeChatPinForMessage } from "@bhemu/shared";
import type { GPAProfile } from "@bhemu/shared";

export type ActiveRoom = "university" | "batchmate";
interface ChatContextValue {
	universityRoom: ChatRoom | null;
	batchmateRoom: ChatRoom | null;
	activeRoom: ActiveRoom;
	setActiveRoom: (r: ActiveRoom) => void;
	currentRoom: ChatRoom | null;
	currentUserId: string | null; // lifted so MessageBubble doesn't call useAuth()
	chatRole: AppRole | null;
	messages: ChatDisplayMessage[];
	pinnedMessages: RoomPin[];
	hasMore: boolean;
	loadingMessages: boolean;
	loadOlderMessages: () => Promise<void>;
	sendText: (content: string, replyToId?: string) => Promise<void>;
	editMsg: (messageId: string, content: string) => Promise<void>;
	deleteMsg: (messageId: string) => Promise<void>;
	retryMessage: (messageId: string) => Promise<void>;
	react: (messageId: string, emoji: string) => Promise<void>;
	unreact: (messageId: string) => Promise<void>;
	report: (messageId: string, reason: ReportReason, description?: string) => Promise<void>;
	createPoll: (content: string, options: string[], multipleChoice?: boolean, closesAt?: string | null) => Promise<void>;
	votePoll: (pollId: string, optionIds: string[]) => Promise<void>;
	closePoll: (pollId: string) => Promise<void>;
	sendAnnouncement: (content: string) => Promise<void>;
	togglePin: (messageId: string, duration?: PinDuration) => Promise<void>;
	moderationDelete: (messageId: string, reason?: string) => Promise<void>;
	warnUser: (userUid: string, reason?: string, messageId?: string) => Promise<void>;
	suspendUser: (userUid: string, expiresAt: string, reason?: string) => Promise<void>;
	banUser: (userUid: string, reason?: string) => Promise<void>;
	onlineUsers: PresenceUser[];
	connected: boolean;
	error: string | null;
	dismissError: () => void;
	hasBatchmateRoom: boolean;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export function useChat(): ChatContextValue {
	const ctx = useContext(ChatContext);
	if (!ctx) throw new Error("useChat must be inside ChatProvider");
	return ctx;
}

// ---- WS payload shapes ----
interface MsgDeletedPayload { messageId: string }
interface PresenceJoinedPayload { uid: string; role: string; connectedAt?: number }
interface PresenceLeftPayload { uid: string }
interface RoomSyncedPayload {
	roomId: string;
	onlineUsers: PresenceUser[];
}
type PollEventPayload = ChatPoll;
interface PinEventPayload {
	roomId: string;
	messageId: string;
	action: "pinned" | "unpinned";
	pinnedBy?: string;
	pinnedAt?: string;
	expiresAt?: string | null;
}

const HEARTBEAT_MS = 25_000;
const HEARTBEAT_TIMEOUT_MS = 10_000;
const RECONNECT_BASE_DELAY_MS = 1_000;
const RECONNECT_MAX_DELAY_MS = 30_000;
const MESSAGE_SOCKET_READY_TIMEOUT_MS = 5_000;
const TOKEN_REFRESH_SKEW_MS = 60_000;
const SESSION_REFRESH_SKEW_MS = 60_000;
const AUTH_RECOVERY_MESSAGE = "Your chat session has expired. Please sign in again.";
const ROOM_SEQUENCE_STORAGE_PREFIX = "bhemu:chat:room-seq:";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function roomSequenceStorageKey(roomId: string): string {
	return `${ROOM_SEQUENCE_STORAGE_PREFIX}${roomId}`;
}

function readRoomSequence(roomId: string): number {
	if (typeof window === "undefined") return 0;
	try {
		const value = Number(window.localStorage.getItem(roomSequenceStorageKey(roomId)) ?? 0);
		return Number.isSafeInteger(value) && value >= 0 ? value : 0;
	} catch {
		return 0;
	}
}

function writeRoomSequence(roomId: string, sequence: number): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(roomSequenceStorageKey(roomId), String(sequence));
	} catch {
		// Storage can be unavailable in private browsing; in-memory recovery
		// still protects the active connection.
	}
}

const ROOM_CACHE_PREFIX = "bhemu:chat:room:";
const MESSAGES_CACHE_PREFIX = "bhemu:chat:messages:";

function readCachedRoom(key: string): ChatRoom | null {
	if (typeof window === "undefined") return null;
	try {
		const data = window.localStorage.getItem(`${ROOM_CACHE_PREFIX}${key}`);
		return data ? JSON.parse(data) : null;
	} catch {
		return null;
	}
}

function writeCachedRoom(key: string, room: ChatRoom): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(`${ROOM_CACHE_PREFIX}${key}`, JSON.stringify(room));
	} catch {}
}

function readCachedMessages(roomId: string): ChatDisplayMessage[] {
	if (typeof window === "undefined") return [];
	try {
		const data = window.localStorage.getItem(`${MESSAGES_CACHE_PREFIX}${roomId}`);
		return data ? JSON.parse(data) : [];
	} catch {
		return [];
	}
}

function writeCachedMessages(roomId: string, messages: ChatDisplayMessage[]): void {
	if (typeof window === "undefined") return;
	try {
		const toCache = messages.slice(-MAX_CHAT_CACHED_MESSAGES);
		window.localStorage.setItem(`${MESSAGES_CACHE_PREFIX}${roomId}`, JSON.stringify(toCache));
	} catch {}
}

interface PendingSocketSend {
	resolve: (message: ChatMessage) => void;
	reject: (error: ChatApiError) => void;
	timer: ReturnType<typeof setTimeout>;
}

function isRecoverableChatAuthError(error: unknown): error is ChatApiError {
	return error instanceof ChatApiError
		&& error.status === 401
		&& (error.code === "CHAT_SESSION_REQUIRED" || error.code === "INVALID_TOKEN");
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
	const { currentUser } = useAuth();
	const { currentProfile } = useGpaData();

	const [universityRoom, setUniversityRoom] = useState<ChatRoom | null>(null);
	const [batchmateRoom, setBatchmateRoom] = useState<ChatRoom | null>(null);
	const [activeRoom, setActiveRoom] = useState<ActiveRoom>("university");
	const [messages, setMessages] = useState<ChatDisplayMessage[]>([]);
	const [pinnedMessages, setPinnedMessages] = useState<RoomPin[]>([]);
	const [chatRole, setChatRole] = useState<AppRole | null>(null);
	const [hasMore, setHasMore] = useState(false);
	const [loadingMessages, setLoadingMessages] = useState(false);
	const [connected, setConnected] = useState(false);
	const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
	const [error, setError] = useState<string | null>(null);

	const cursorRef = useRef<string | null>(null);
	const wsRef = useRef<WebSocket | null>(null);
	const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const pongTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const reconnectAttemptsRef = useRef(0);
	const connectionGenerationRef = useRef(0);
	const currentRoomIdRef = useRef<string | null>(null);
	const resolvedGroupKeyRef = useRef<string | null>(null);
	const universityRoomLoadRef = useRef<{
		uid: string;
		promise: Promise<ChatRoom | null>;
	} | null>(null);
	const batchmateRoomLoadRef = useRef(new Map<string, Promise<ChatRoom | null>>());
	const tokenCacheRef = useRef<{ token: string; expiresAt: number } | null>(null);
	const chatSessionCacheRef = useRef<{ token: string; expiresAt: number; uid: string; role: AppRole } | null>(null);
	const sessionBootstrapRef = useRef<Promise<string | null> | null>(null);
	const messagesRef = useRef<ChatDisplayMessage[]>([]);
	const messageRequestRef = useRef(0);
	const syncingRoomRef = useRef<string | null>(null);
	const roomSequencesRef = useRef(new Map<string, number>());
	const roomEventSyncRef = useRef(new Map<string, Promise<void>>());
	const syncRoomEventsRef = useRef<((roomId: string, after?: number) => Promise<void>) | null>(null);
	const pendingSocketSendsRef = useRef(new Map<string, PendingSocketSend>());
	// Guards against concurrent loadOlderMessages calls
	const loadingOlderRef = useRef(false);
	const syncLatestMessagesRef = useRef<((roomId: string) => Promise<void>) | null>(null);

	// Keep latest setters in a ref so WS callbacks always use the current version
	const stateRef = useRef({ setMessages, setOnlineUsers, setConnected, setError });
	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(() => { stateRef.current = { setMessages, setOnlineUsers, setConnected, setError }; });
	useEffect(() => { messagesRef.current = messages; }, [messages]);

	const dismissError = useCallback(() => setError(null), []);

	const groupKey = useMemo(
		() => (currentProfile as (GPAProfile & { groupKey?: string | null }) | undefined)?.groupKey ?? null,
		[currentProfile],
	);
	
	// Keep the user's currentGroupKey updated in Firestore so the chat-worker
	// knows which batchmate room to target for push notifications (even if 
	// they are actively using the mobile app while changing profiles on web).
	useEffect(() => {
		if (currentUser) {
			const userRef = doc(db, "users", currentUser.uid);
			updateDoc(userRef, { currentGroupKey: groupKey }).catch(err => {
				console.warn("Failed to sync currentGroupKey to user doc", err);
			});
		}
	}, [currentUser, groupKey]);

	const hasBatchmateRoom = !!groupKey;
	const currentRoom = activeRoom === "university" ? universityRoom : batchmateRoom;
	const currentUserId = currentUser?.uid ?? null;

	// ---- Firebase token (used to bootstrap/refresh the chat session and the
	// explicit Firestore-backed report integration) ----
	// Firebase owns the token lifetime. We cache until the actual expiry returned
	// by Firebase instead of guessing from the time we happened to read it.
	const getFirebaseToken = useCallback(async (forceRefresh = false): Promise<string | null> => {
		if (!currentUser) return null;
		const cache = tokenCacheRef.current;
		if (!forceRefresh && cache && Date.now() + TOKEN_REFRESH_SKEW_MS < cache.expiresAt) {
			return cache.token;
		}
		try {
			const result = await currentUser.getIdTokenResult(forceRefresh);
			const expiresAt = Date.parse(result.expirationTime);
			if (!result.token || !Number.isFinite(expiresAt)) return null;
			tokenCacheRef.current = { token: result.token, expiresAt };
			return result.token;
		} catch { return null; }
	}, [currentUser]);

	// ---- Cached chat session ----
	// The first room load exchanges the Firebase token once. All normal chat
	// REST requests and WebSocket reconnects use the locally verifiable session.
	const getToken = useCallback(async (forceRefresh = false): Promise<string | null> => {
		if (!currentUser) return null;
		const cached = chatSessionCacheRef.current;
		if (!forceRefresh && cached && cached.uid === currentUser.uid
			&& Date.now() + SESSION_REFRESH_SKEW_MS < cached.expiresAt) {
			setChatRole(cached.role);
			return cached.token;
		}

		if (sessionBootstrapRef.current) return sessionBootstrapRef.current;
		if (forceRefresh) chatSessionCacheRef.current = null;

		const bootstrap = (async () => {
			const firebaseToken = await getFirebaseToken(forceRefresh);
			if (!firebaseToken) {
				setError(AUTH_RECOVERY_MESSAGE);
				return null;
			}

			try {
				let session;
				try {
					session = await apiCreateChatSession(firebaseToken);
				} catch (error) {
					// A cached Firebase token can be rejected after revocation or a
					// clock/network edge case. Refresh it once before surfacing auth.
					if (!(error instanceof ChatApiError && error.status === 401 && error.code === "INVALID_TOKEN")) {
						throw error;
					}
					tokenCacheRef.current = null;
					const freshFirebaseToken = await getFirebaseToken(true);
					if (!freshFirebaseToken) {
						setError(AUTH_RECOVERY_MESSAGE);
						return null;
					}
					session = await apiCreateChatSession(freshFirebaseToken);
				}

				const expiresAt = Date.parse(session.expiresAt);
				if (!Number.isFinite(expiresAt)) {
					throw new Error("Chat session response had an invalid expiry.");
				}
				chatSessionCacheRef.current = { token: session.token, expiresAt, uid: currentUser.uid, role: session.role };
				setChatRole(session.role);
				setError(null);
				return session.token;
			} catch (error) {
				// Chat has one canonical credential. Never silently downgrade to a
				// Firebase-token hot path; report only after recovery was exhausted.
				if (isRecoverableChatAuthError(error)) setError(AUTH_RECOVERY_MESSAGE);
				else setError("Chat authentication is temporarily unavailable. Please retry.");
				return null;
			}
		})();
		sessionBootstrapRef.current = bootstrap;
		try {
			return await bootstrap;
		} finally {
			if (sessionBootstrapRef.current === bootstrap) sessionBootstrapRef.current = null;
		}
	}, [currentUser, getFirebaseToken]);

	// Every remaining chat REST operation gets one transparent session recovery
	// retry. Message creation is WebSocket-only and has its own idempotent ACK.
	const requestWithChatAuth = useCallback(async <T,>(
		request: (token: string) => Promise<T>,
	): Promise<T | null> => {
		let token = await getToken();
		if (!token) return null;

		try {
			return await request(token);
		} catch (error) {
			if (!isRecoverableChatAuthError(error)) throw error;
			token = await getToken(true);
			if (!token) return null;

			try {
				return await request(token);
			} catch (retryError) {
				if (isRecoverableChatAuthError(retryError)) {
					setError(AUTH_RECOVERY_MESSAGE);
					return null;
				}
				throw retryError;
			}
		}
	}, [getToken]);

	useEffect(() => {
		tokenCacheRef.current = null;
		chatSessionCacheRef.current = null;
		sessionBootstrapRef.current = null;
		universityRoomLoadRef.current = null;
		batchmateRoomLoadRef.current.clear();
		resolvedGroupKeyRef.current = null;
	}, [currentUser?.uid]);

	// ---- Unified Message Upsert Store ----
	const upsertMessage = useCallback((newMessage: ChatDisplayMessage) => {
		setMessages(prev => mergeChatMessages(prev, [newMessage]));
	}, []);

	const getRoomSequence = useCallback((roomId: string): number => {
		const cached = roomSequencesRef.current.get(roomId);
		if (cached !== undefined) return cached;
		const persisted = readRoomSequence(roomId);
		roomSequencesRef.current.set(roomId, persisted);
		return persisted;
	}, []);

	const setRoomSequence = useCallback((roomId: string, sequence: number): void => {
		const current = getRoomSequence(roomId);
		if (sequence <= current) return;
		roomSequencesRef.current.set(roomId, sequence);
		writeRoomSequence(roomId, sequence);
	}, [getRoomSequence]);

	/** Replays durable events after a reconnect or a detected sequence gap. */
	const syncRoomEvents = useCallback(async (roomId: string, afterOverride?: number) => {
		const existing = roomEventSyncRef.current.get(roomId);
		if (existing) return existing;

		const startAfter = afterOverride ?? getRoomSequence(roomId);
		const syncPromise = (async () => {
			let after = startAfter;
			while (true) {
				const page = await requestWithChatAuth(token => apiGetRoomEvents(token, roomId, after, 100));
				if (!page || currentRoomIdRef.current !== roomId) return;
				if (page.resyncRequired) {
					await syncLatestMessagesRef.current?.(roomId);
					if (page.highWater > after) setRoomSequence(roomId, page.highWater);
					return;
				}

				for (const event of page.events) {
					const message = event.payload?.message;
					if (message?.id && message.roomId === roomId) {
						upsertMessage({
							...message,
							eventId: event.eventId,
							roomSeq: event.roomSeq,
						});
					}
					after = Math.max(after, event.roomSeq);
				}
				if (after > startAfter) setRoomSequence(roomId, after);

				if (!page.hasMore || after >= page.highWater) return;
			}
		})();

		roomEventSyncRef.current.set(roomId, syncPromise);
		try {
			await syncPromise;
		} finally {
			if (roomEventSyncRef.current.get(roomId) === syncPromise) {
				roomEventSyncRef.current.delete(roomId);
			}
		}
	}, [requestWithChatAuth, getRoomSequence, setRoomSequence, upsertMessage]);

	useEffect(() => {
		syncRoomEventsRef.current = syncRoomEvents;
		return () => { syncRoomEventsRef.current = null; };
	}, [syncRoomEvents]);

	// ---- WS event handler — declared before connectWs to avoid TDZ ----
	const handleWsEvent = useCallback((envelope: WsEnvelope) => {
		const { setMessages: setMsgs, setOnlineUsers: setPresence, setConnected: setConn, setError: setErr } = stateRef.current;
		switch (envelope.type) {
			case WS_EVENTS.MESSAGE_ACK: {
				const ack = envelope.payload as {
					clientMessageId?: string | null;
					message?: ChatDisplayMessage | null;
					roomSeq?: number;
				};
				if (ack.clientMessageId && ack.message) {
					const sequence = Number(ack.roomSeq);
					if (
						ack.message.roomId === currentRoomIdRef.current
						&& Number.isSafeInteger(sequence)
						&& sequence > 0
					) {
						setRoomSequence(ack.message.roomId, sequence);
					}
					const confirmedMessage: ChatDisplayMessage = Number.isSafeInteger(sequence) && sequence > 0
						? { ...ack.message, roomSeq: sequence }
						: ack.message;
					const pending = pendingSocketSendsRef.current.get(ack.clientMessageId);
					if (pending) {
						clearTimeout(pending.timer);
						pendingSocketSendsRef.current.delete(ack.clientMessageId);
						pending.resolve(confirmedMessage);
					}
					upsertMessage({ ...confirmedMessage, idempotencyKey: ack.clientMessageId });
				}
				break;
			}
			case WS_EVENTS.MESSAGE_ERROR: {
				const failure = envelope.payload as {
					clientMessageId?: string | null;
					code?: string;
					message?: string;
				};
				const pending = failure.clientMessageId
					? pendingSocketSendsRef.current.get(failure.clientMessageId)
					: undefined;
				const error = new ChatApiError(
					failure.code ?? "MESSAGE_SEND_FAILED",
					failure.message ?? "Message could not be sent.",
					429,
				);
				if (pending && failure.clientMessageId) {
					clearTimeout(pending.timer);
					pendingSocketSendsRef.current.delete(failure.clientMessageId);
					pending.reject(error);
				} else {
					setErr(error.message);
				}
				break;
			}
			case WS_EVENTS.ROOM_SYNCED: {
				const room = envelope.payload as RoomSyncedPayload;
				if (room.roomId !== currentRoomIdRef.current) break;
				setConn(true);
				setErr(null);
				setPresence(room.onlineUsers ?? []);
				void syncRoomEventsRef.current?.(room.roomId).catch(() => {
					// Replay failures still converge through the committed snapshot.
					void syncLatestMessagesRef.current?.(room.roomId);
				});
				break;
			}

			case WS_EVENTS.MESSAGE_CREATED:
			case WS_EVENTS.ANNOUNCEMENT_CREATED: {
				const message = envelope.payload as ChatDisplayMessage;
				if (!message?.id || message.roomId !== currentRoomIdRef.current) break;
				const sequence = Number(message.roomSeq);
				if (Number.isSafeInteger(sequence) && sequence > 0) {
					const previous = getRoomSequence(message.roomId);
					if (sequence > previous + 1) {
						void syncRoomEventsRef.current?.(message.roomId, previous).catch(() => {
							void syncLatestMessagesRef.current?.(message.roomId);
						});
					}
					setRoomSequence(message.roomId, sequence);
				}
				upsertMessage(message);
				break;
			}
			case WS_EVENTS.MESSAGE_UPDATED: {
				const message = envelope.payload as ChatDisplayMessage;
				if (!message?.id || message.roomId !== currentRoomIdRef.current) break;
				upsertMessage(message);
				break;
			}
			case WS_EVENTS.MESSAGE_DELETED: {
				const { messageId } = envelope.payload as MsgDeletedPayload;
				setPinnedMessages(prev => removeChatPinForMessage(prev, messageId));
				setMsgs(prev => prev.map(m =>
					m.id === messageId ? { ...m, visibility: "DELETED" as const, content: "" } : m,
				));
				break;
			}
			case WS_EVENTS.REACTION_UPDATED: {
				const reaction = envelope.payload as { messageId: string; userUid: string; emoji: string | null; createdAt: string };
				setMsgs(prev => prev.map(m => {
					if (m.id !== reaction.messageId) return m;
					const current = m.reactions ?? [];
					if (reaction.emoji === null) {
						// Remove reaction
						return { ...m, reactions: current.filter(r => r.userUid !== reaction.userUid) };
					}
					// Upsert reaction
					const existingIndex = current.findIndex(r => r.userUid === reaction.userUid);
					const newReactions = [...current];
					if (existingIndex !== -1) {
						newReactions[existingIndex] = { ...newReactions[existingIndex], emoji: reaction.emoji, createdAt: reaction.createdAt };
					} else {
						newReactions.push({ messageId: reaction.messageId, userUid: reaction.userUid, emoji: reaction.emoji, createdAt: reaction.createdAt });
					}
					return { ...m, reactions: newReactions };
				}));
				break;
			}
			case WS_EVENTS.POLL_UPDATED:
			case WS_EVENTS.POLL_CLOSED: {
				const poll = envelope.payload as PollEventPayload;
				if (!poll?.id || !poll.messageId) break;
				setMsgs(prev => prev.map(message =>
					message.id === poll.messageId ? { ...message, poll } : message,
				));
				break;
			}
			case WS_EVENTS.PIN_UPDATED: {
				const pin = envelope.payload as PinEventPayload;
				if (!pin?.roomId || pin.roomId !== currentRoomIdRef.current || !pin.messageId) break;
				setPinnedMessages(prev => {
					const withoutMessage = prev.filter(item => item.messageId !== pin.messageId);
					if (pin.action === "unpinned") return withoutMessage;
					return [...withoutMessage, {
						roomId: pin.roomId,
						messageId: pin.messageId,
						pinnedBy: pin.pinnedBy ?? "",
						pinnedAt: pin.pinnedAt ?? envelope.timestamp,
						expiresAt: pin.expiresAt ?? null,
					}];
				});
				break;
			}
			case WS_EVENTS.PRESENCE_JOINED: {
				const p = envelope.payload as PresenceJoinedPayload;
				setPresence(prev =>
					prev.some(u => u.uid === p.uid) ? prev
						: [...prev, { uid: p.uid, role: p.role as PresenceUser["role"], connectedAt: p.connectedAt ?? Date.now() }],
				);
				break;
			}
			case WS_EVENTS.PRESENCE_LEFT: {
				const { uid } = envelope.payload as PresenceLeftPayload;
				setPresence(prev => prev.filter(u => u.uid !== uid));
				break;
			}
		}
	}, [getRoomSequence, setRoomSequence, upsertMessage]);

	// Ref for reconnect to avoid circular TDZ
	const connectWsRef = useRef<((roomId: string) => Promise<void>) | null>(null);

	const disconnectWs = useCallback(() => {
		connectionGenerationRef.current++;
		if (heartbeatRef.current) clearInterval(heartbeatRef.current);
		if (pongTimeoutRef.current) clearTimeout(pongTimeoutRef.current);
		if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
		if (wsRef.current) {
			wsRef.current.onclose = null;
			wsRef.current.onerror = null;
			wsRef.current.close(1000, "intentional");
			wsRef.current = null;
		}
		for (const [key, pending] of pendingSocketSendsRef.current) {
			clearTimeout(pending.timer);
			pendingSocketSendsRef.current.delete(key);
			pending.reject(new ChatApiError("MESSAGE_SOCKET_CLOSED", "Message socket closed.", 503));
		}
		setConnected(false);
	}, []);

	const sendMessageOverSocket = useCallback(
		(roomId: string, content: string, replyToId: string | undefined, idempotencyKey: string, type: "TEXT" | "ANNOUNCEMENT" = "TEXT") =>
			new Promise<ChatMessage>((resolve, reject) => {
				const ws = wsRef.current;
				if (!ws || ws.readyState !== WebSocket.OPEN) {
					reject(new ChatApiError("MESSAGE_SOCKET_UNAVAILABLE", "Message socket is unavailable.", 503));
					return;
				}

				const timer = setTimeout(() => {
					pendingSocketSendsRef.current.delete(idempotencyKey);
					reject(new ChatApiError("MESSAGE_SOCKET_TIMEOUT", "Message socket timed out.", 504));
				}, 15_000);
				pendingSocketSendsRef.current.set(idempotencyKey, { resolve, reject, timer });

				try {
					ws.send(JSON.stringify({
						type: "message.send",
						payload: {
							roomId,
							content,
							type,
							replyToMessageId: replyToId ?? null,
							idempotencyKey,
						},
					}));
				} catch {
					clearTimeout(timer);
					pendingSocketSendsRef.current.delete(idempotencyKey);
					reject(new ChatApiError("MESSAGE_SOCKET_UNAVAILABLE", "Message socket is unavailable.", 503));
				}
			}),
		[],
	);

	const waitForMessageSocket = useCallback(async (roomId: string): Promise<void> => {
		const deadline = Date.now() + MESSAGE_SOCKET_READY_TIMEOUT_MS;
		while (Date.now() < deadline) {
			if (
				currentRoomIdRef.current === roomId
				&& wsRef.current?.readyState === WebSocket.OPEN
			) return;
			await new Promise(resolve => setTimeout(resolve, 50));
		}
		throw new ChatApiError("MESSAGE_SOCKET_UNAVAILABLE", "Message connection is unavailable.", 503);
	}, []);

	const connectWs = useCallback(async (roomId: string) => {
		disconnectWs();
		const generation = connectionGenerationRef.current;
		const token = await getToken();
		if (!token || generation !== connectionGenerationRef.current || currentRoomIdRef.current !== roomId) return;

		const wsBase = CHAT_API_BASE.replace("https://", "wss://").replace("http://", "ws://");
		const ws = new WebSocket(`${wsBase}/ws/${roomId}?token=${encodeURIComponent(token)}`);
		wsRef.current = ws;
		const isCurrentConnection = () =>
			wsRef.current === ws
			&& connectionGenerationRef.current === generation
			&& currentRoomIdRef.current === roomId;

		ws.onopen = () => {
			if (!isCurrentConnection()) {
				ws.close(1000, "superseded");
				return;
			}
			reconnectAttemptsRef.current = 0;
			const sendHeartbeat = () => {
				if (!isCurrentConnection() || ws.readyState !== WebSocket.OPEN) return;
				try {
					ws.send(JSON.stringify({ type: "heartbeat" }));
					if (pongTimeoutRef.current) clearTimeout(pongTimeoutRef.current);
					pongTimeoutRef.current = setTimeout(() => {
						if (isCurrentConnection()) ws.close(4000, "Heartbeat timeout");
					}, HEARTBEAT_TIMEOUT_MS);
				} catch {
					ws.close(4000, "Heartbeat send failed");
				}
			};
			sendHeartbeat();
			heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_MS);
		};

		ws.onmessage = (ev: MessageEvent<string>) => {
			if (!isCurrentConnection()) return;
			try {
				const data = JSON.parse(ev.data);
				if (data.type === WS_EVENTS.HEARTBEAT_ACK) {
					if (pongTimeoutRef.current) clearTimeout(pongTimeoutRef.current);
					const serverSequence = Number(data.payload?.roomSeq);
					const roomIdForHeartbeat = currentRoomIdRef.current;
					if (roomIdForHeartbeat && Number.isSafeInteger(serverSequence)) {
						const localSequence = getRoomSequence(roomIdForHeartbeat);
						if (serverSequence > localSequence) {
							void syncRoomEventsRef.current?.(roomIdForHeartbeat, localSequence).catch(() => {
								void syncLatestMessagesRef.current?.(roomIdForHeartbeat);
							});
						}
					}
					return;
				}
				handleWsEvent(data as WsEnvelope); 
			}
			catch { /* ignore malformed frames */ }
		};

		ws.onclose = ev => {
			if (!isCurrentConnection()) return;
			wsRef.current = null;
			for (const [key, pending] of pendingSocketSendsRef.current) {
				clearTimeout(pending.timer);
				pendingSocketSendsRef.current.delete(key);
				pending.reject(new ChatApiError("MESSAGE_SOCKET_CLOSED", "Message socket closed.", 503));
			}
			stateRef.current.setConnected(false);
			if (heartbeatRef.current) clearInterval(heartbeatRef.current);
			if (pongTimeoutRef.current) clearTimeout(pongTimeoutRef.current);
			if (ev.code !== 1000 && currentRoomIdRef.current === roomId) {
				reconnectAttemptsRef.current++;
				const retryDelay = Math.min(
					RECONNECT_MAX_DELAY_MS,
					RECONNECT_BASE_DELAY_MS * 2 ** Math.min(reconnectAttemptsRef.current - 1, 5),
				);
				reconnectTimerRef.current = setTimeout(() => {
					if (currentRoomIdRef.current === roomId) void connectWsRef.current?.(roomId);
				}, retryDelay);
			}
		};

		ws.onerror = () => {
			if (isCurrentConnection()) stateRef.current.setError("Connection error. Retrying…");
		};
	}, [getToken, disconnectWs, getRoomSequence, handleWsEvent]);

	useEffect(() => { connectWsRef.current = connectWs; }, [connectWs]);

	// ---- Room loading ----
	// Room bootstrap can be triggered by both auth readiness and profile/groupKey
	// readiness. Share in-flight requests so StrictMode and those transitions do
	// not issue duplicate university/batchmate queries.
	const loadRooms = useCallback(async (uid: string, gk: string | null) => {
		const loadUniversity = (): Promise<ChatRoom | null> => {
			const cached = universityRoomLoadRef.current;
			if (cached?.uid === uid) return cached.promise;

			const promise = requestWithChatAuth(apiGetUniversityRoom);
			universityRoomLoadRef.current = { uid, promise };
			void promise.then(
				(room) => {
					if (!room && universityRoomLoadRef.current?.promise === promise) {
						universityRoomLoadRef.current = null;
					}
				},
				() => {
					if (universityRoomLoadRef.current?.promise === promise) {
						universityRoomLoadRef.current = null;
					}
				},
			);
			return promise;
		};

		const loadBatchmate = (group: string): Promise<ChatRoom | null> => {
			const key = `${uid}:${group}`;
			const cached = batchmateRoomLoadRef.current.get(key);
			if (cached) return cached;

			const promise = requestWithChatAuth(token => apiGetBatchmateRoom(token, group));
			batchmateRoomLoadRef.current.set(key, promise);
			void promise.then(
				(room) => {
					if (!room && batchmateRoomLoadRef.current.get(key) === promise) {
						batchmateRoomLoadRef.current.delete(key);
					}
				},
				() => {
					if (batchmateRoomLoadRef.current.get(key) === promise) {
						batchmateRoomLoadRef.current.delete(key);
					}
				},
			);
			return promise;
		};

		try {
			const cachedUni = readCachedRoom("university");
			if (cachedUni && !universityRoom) setUniversityRoom(cachedUni);

			const university = await loadUniversity();
			if (university) setUniversityRoom(university);
		}
		catch (e) { if (e instanceof ChatApiError) setError(e.message); }

		// Batchmate room — only fetch if groupKey changed
		if (gk && gk !== resolvedGroupKeyRef.current) {
			try {
				const cachedBatch = readCachedRoom(`batchmate:${gk}`);
				if (cachedBatch && !batchmateRoom) setBatchmateRoom(cachedBatch);

				const batchmate = await loadBatchmate(gk);
				if (batchmate) {
					setBatchmateRoom(batchmate);
					resolvedGroupKeyRef.current = gk;
				}
			} catch (e) { if (e instanceof ChatApiError) setError(e.message); }
		} else if (!gk) {
			setBatchmateRoom(null);
			resolvedGroupKeyRef.current = null;
		}
	}, [requestWithChatAuth, universityRoom, batchmateRoom]);

	// ---- Message loading ----
	const loadMessages = useCallback(async (roomId: string, reset = false) => {
		const requestId = ++messageRequestRef.current;
		setLoadingMessages(true);
		try {
			const result = await requestWithChatAuth(token => apiGetMessages(
				token,
				roomId,
				reset ? undefined : (cursorRef.current ?? undefined),
				50,
			));
			if (!result) return;
			if (currentRoomIdRef.current !== roomId || requestId !== messageRequestRef.current) return;
			const ordered = [...result.items].reverse();
			setMessages(prev => mergeChatMessages(prev, ordered));
			setHasMore(result.hasMore);
			cursorRef.current = result.nextCursor;
		} catch (e) {
			if (e instanceof ChatApiError) setError(e.message);
		} finally {
			if (requestId === messageRequestRef.current) setLoadingMessages(false);
		}
	}, [requestWithChatAuth]);

	const loadPins = useCallback(async (roomId: string) => {
		try {
			const pins = await requestWithChatAuth((token) => apiGetRoomPins(token, roomId));
			if (currentRoomIdRef.current === roomId && pins) setPinnedMessages(pins);
		} catch (e) {
			if (currentRoomIdRef.current === roomId && e instanceof ChatApiError) setError(e.message);
		}
	}, [requestWithChatAuth]);

	useEffect(() => {
		const nextExpiry = pinnedMessages.reduce<number | null>((soonest, pin) => {
			if (!pin.expiresAt) return soonest;
			const expiresAt = Date.parse(pin.expiresAt);
			return Number.isNaN(expiresAt) || (soonest !== null && soonest <= expiresAt)
				? soonest
				: expiresAt;
		}, null);
		if (nextExpiry === null) return;

		const timeout = window.setTimeout(() => {
			const now = Date.now();
			setPinnedMessages((prev) => prev.filter((pin) => !pin.expiresAt || Date.parse(pin.expiresAt) > now));
		}, Math.max(0, nextExpiry - Date.now()) + 50);

		return () => window.clearTimeout(timeout);
	}, [pinnedMessages]);

	/**
	 * Snapshot reconciliation is the source for initial history,
	 * replay expiry, and unavailable event-stream recovery. It fetches every
	 * page from the newest message back to one already in the local store.
	 */
	const syncLatestMessages = useCallback(async (roomId: string) => {
		if (currentRoomIdRef.current !== roomId || syncingRoomRef.current === roomId) return;
		syncingRoomRef.current = roomId;

		try {
			const knownServerIds = new Set(
				messagesRef.current
					.filter(message => message.roomId === roomId && !message.id.startsWith(CHAT_OPTIMISTIC_PREFIX))
					.map(message => message.id),
			);
			const recovered: ChatDisplayMessage[] = [];
			let cursor: string | undefined;

			while (true) {
				const page = await requestWithChatAuth(token => apiGetMessages(token, roomId, cursor, 100));
				if (!page) return;
				if (currentRoomIdRef.current !== roomId) return;
				recovered.push(...page.items);

				const foundAnchor = page.items.some(message => knownServerIds.has(message.id));
				if (!knownServerIds.size || foundAnchor || !page.hasMore || !page.nextCursor) break;
				cursor = page.nextCursor;
			}

			if (currentRoomIdRef.current === roomId && recovered.length > 0) {
				setMessages(prev => mergeChatMessages(prev, recovered));
			}
		} catch (e) {
			if (currentRoomIdRef.current === roomId && e instanceof ChatApiError) setError(e.message);
		} finally {
			if (syncingRoomRef.current === roomId) syncingRoomRef.current = null;
		}
	}, [requestWithChatAuth]);

	useEffect(() => {
		syncLatestMessagesRef.current = syncLatestMessages;
		return () => { syncLatestMessagesRef.current = null; };
	}, [syncLatestMessages]);

	// ---- Effects ----

	// Load rooms when uid or groupKey changes — stable deps, no double-fire
	const currentUid = currentUser?.uid ?? null;
	useEffect(() => {
		if (!currentUid) return;
		// This effect starts the external room-loading lifecycle.
		// eslint-disable-next-line react-hooks/set-state-in-effect
		void loadRooms(currentUid, groupKey);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentUid, groupKey]);

	// Connect to room when room id changes
	const currentRoomId = currentRoom?.id ?? null;
	useEffect(() => {
		if (!currentRoomId) {
			currentRoomIdRef.current = null;
			// This effect synchronizes the external WebSocket lifecycle.
			// eslint-disable-next-line react-hooks/set-state-in-effect
			disconnectWs();
			return;
		}
		currentRoomIdRef.current = currentRoomId;
		cursorRef.current = null;
		loadingOlderRef.current = false;
		
		const cachedMessages = readCachedMessages(currentRoomId);
		setMessages(cachedMessages);
		setPinnedMessages([]);
		
		void loadMessages(currentRoomId, true);
		void loadPins(currentRoomId);
		void connectWs(currentRoomId);
		return () => {
			if (currentRoomIdRef.current === currentRoomId) currentRoomIdRef.current = null;
			disconnectWs();
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentRoomId]);

	// Fall back to university if batchmate room disappears (profile switch)
	useEffect(() => {
		if (activeRoom === "batchmate" && !hasBatchmateRoom) {
			// This effect keeps the selected room valid when the profile changes.
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setActiveRoom("university");
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [hasBatchmateRoom]);

	// Cache syncing effects
	useEffect(() => {
		if (universityRoom) writeCachedRoom("university", universityRoom);
	}, [universityRoom]);

	useEffect(() => {
		if (batchmateRoom && groupKey) writeCachedRoom(`batchmate:${groupKey}`, batchmateRoom);
	}, [batchmateRoom, groupKey]);

	useEffect(() => {
		if (currentRoomId && messages.length > 0) {
			// Small debounce to avoid writing on every single optimistic key stroke
			const timer = setTimeout(() => {
				writeCachedMessages(currentRoomId, messages);
			}, 500);
			return () => clearTimeout(timer);
		}
	}, [messages, currentRoomId]);

	// ---- Public actions ----

	const loadOlderMessages = useCallback(async () => {
		// Guard: prevent concurrent calls
		if (!currentRoomIdRef.current || !hasMore || loadingMessages || loadingOlderRef.current) return;
		loadingOlderRef.current = true;
		try {
			await loadMessages(currentRoomIdRef.current);
		} finally {
			loadingOlderRef.current = false;
		}
	}, [hasMore, loadingMessages, loadMessages]);

	const sendText = useCallback(async (content: string, replyToId?: string) => {
		// Use ref for roomId — avoids stale closure if room changes mid-send
		const roomId = currentRoomIdRef.current;
		if (!currentUser || !roomId) return;
		const trimmedContent = content.trim();
		if (!trimmedContent) {
			setError("Message cannot be empty.");
			return;
		}
		if (trimmedContent.length > MAX_CHAT_MESSAGE_LENGTH) {
			setError(`Message exceeds ${MAX_CHAT_MESSAGE_LENGTH} characters.`);
			return;
		}
		if (replyToId && !UUID_PATTERN.test(replyToId)) {
			setError("The selected reply is no longer available.");
			return;
		}

		const idempotencyKey = createChatClientMessageId();
		const optimisticMsg: ChatDisplayMessage = {
			id: idempotencyKey,
			idempotencyKey,
			roomId,
			authorUid: currentUser.uid,
			authorName: normalizeChatDisplayName(currentUser.displayName),
			replyToMessageId: replyToId ?? null,
			type: "TEXT",
			visibility: "VISIBLE",
			content: trimmedContent,
			editedAt: null,
			deletedAt: null,
			attachments: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
		setMessages(prev => [...prev, optimisticMsg]);

		try {
			await waitForMessageSocket(roomId);
			const confirmedMsg = await sendMessageOverSocket(roomId, trimmedContent, replyToId, idempotencyKey);
			if (!confirmedMsg) {
				setMessages(prev => prev.filter(m => m.id !== idempotencyKey));
				return;
			}
			
			// REPLACE the optimistic message with the confirmed one IMMEDIATELY.
			// Pass idempotencyKey so the upsertStore can clean up any ghosts!
			upsertMessage({ ...confirmedMsg, idempotencyKey });
		} catch (e) {
			// A timeout/close is ambiguous: the DO may have committed the message
			// before the ACK was lost. Keep the optimistic row and replay the durable
			// event stream instead of deleting a message that may already exist.
			if (e instanceof ChatApiError
				&& (e.code === "MESSAGE_SOCKET_TIMEOUT" || e.code === "MESSAGE_SOCKET_CLOSED")) {
				setError("Message delivery is being confirmed…");
				void syncRoomEvents(roomId).catch(() => {
					return syncLatestMessagesRef.current?.(roomId);
				}).finally(() => {
					setMessages(prev => {
						const index = prev.findIndex(m => m.id === idempotencyKey);
						if (index === -1) return prev;
						// If the ID is still the optimistic ID, it was never confirmed
						if (prev[index].id === idempotencyKey) {
							const next = [...prev];
							next[index] = { ...next[index], failed: true };
							return next;
						}
						return prev;
					});
				});
				return;
			}
			setMessages(prev => prev.filter(m => m.id !== idempotencyKey));
			if (e instanceof ChatApiError) setError(e.message);
		}
	}, [currentUser, sendMessageOverSocket, syncRoomEvents, upsertMessage, waitForMessageSocket]);

	const retryMessage = useCallback(async (messageId: string) => {
		const message = messagesRef.current.find(m => m.id === messageId);
		if (!message || !message.failed) return;
		
		const roomId = message.roomId;
		const content = message.content;
		const replyToId = message.replyToMessageId;

		// Reset failed state and refresh createdAt so it snaps back to bottom
		setMessages(prev => prev.map(m => m.id === messageId ? { ...m, failed: false, createdAt: new Date().toISOString() } : m));
		
		try {
			await waitForMessageSocket(roomId);
			const confirmedMsg = await sendMessageOverSocket(roomId, content, replyToId ?? undefined, messageId);
			if (!confirmedMsg) {
				setMessages(prev => prev.filter(m => m.id !== messageId));
				return;
			}
			upsertMessage({ ...confirmedMsg, idempotencyKey: messageId });
		} catch (e) {
			if (e instanceof ChatApiError
				&& (e.code === "MESSAGE_SOCKET_TIMEOUT" || e.code === "MESSAGE_SOCKET_CLOSED")) {
				setError("Message delivery is being confirmed…");
				void syncRoomEvents(roomId).catch(() => {
					return syncLatestMessagesRef.current?.(roomId);
				}).finally(() => {
					setMessages(prev => {
						const index = prev.findIndex(m => m.id === messageId);
						if (index === -1) return prev;
						if (prev[index].id === messageId) {
							const next = [...prev];
							next[index] = { ...next[index], failed: true };
							return next;
						}
						return prev;
					});
				});
				return;
			}
			setMessages(prev => prev.filter(m => m.id !== messageId));
			if (e instanceof ChatApiError) setError(e.message);
		}
	}, [sendMessageOverSocket, syncRoomEvents, upsertMessage, waitForMessageSocket]);

	const editMsg = useCallback(async (messageId: string, content: string) => {
		const trimmedContent = content.trim();
		if (!trimmedContent) {
			setError("Message cannot be empty.");
			return;
		}
		if (trimmedContent.length > MAX_CHAT_MESSAGE_LENGTH) {
			setError(`Message exceeds ${MAX_CHAT_MESSAGE_LENGTH} characters.`);
			return;
		}
		setMessages(prev => prev.map(m =>
			m.id === messageId ? { ...m, content: trimmedContent, editedAt: new Date().toISOString() } : m,
		));
		try { await requestWithChatAuth(token => apiEditMessage(token, messageId, trimmedContent)); }
		catch (e) { if (e instanceof ChatApiError) setError(e.message); }
	}, [requestWithChatAuth]);

	const deleteMsg = useCallback(async (messageId: string) => {
		setPinnedMessages(prev => removeChatPinForMessage(prev, messageId));
		setMessages(prev => prev.map(m =>
			m.id === messageId ? { ...m, visibility: "DELETED" as const, content: "" } : m,
		));
		try { await requestWithChatAuth(token => apiDeleteMessage(token, messageId)); }
		catch (e) { if (e instanceof ChatApiError) setError(e.message); }
	}, [requestWithChatAuth]);

	const react = useCallback(async (messageId: string, emoji: string) => {
		await requestWithChatAuth(token => apiSetReaction(token, messageId, emoji));
	}, [requestWithChatAuth]);

	const unreact = useCallback(async (messageId: string) => {
		await requestWithChatAuth(token => apiRemoveReaction(token, messageId));
	}, [requestWithChatAuth]);

	const report = useCallback(async (messageId: string, reason: ReportReason, description?: string) => {
		const token = await getFirebaseToken();
		if (!token) return;
		await apiReportMessage(token, messageId, reason, description);
	}, [getFirebaseToken]);

	const updatePoll = useCallback((poll: ChatPoll) => {
		setMessages(prev => prev.map(message =>
			message.id === poll.messageId ? { ...message, poll } : message,
		));
	}, []);

	const createPoll = useCallback(async (
		content: string,
		options: string[],
		multipleChoice = false,
		closesAt: string | null = null,
	) => {
		const roomId = currentRoomIdRef.current;
		if (!roomId) return;
		const poll = await requestWithChatAuth(token => apiCreatePoll(token, roomId, content, options, multipleChoice, closesAt));
		if (poll) {
			updatePoll(poll);
			void syncLatestMessages(roomId);
		}
	}, [requestWithChatAuth, syncLatestMessages, updatePoll]);

	const votePoll = useCallback(async (pollId: string, optionIds: string[]) => {
		const poll = await requestWithChatAuth(token => apiVotePoll(token, pollId, optionIds));
		if (poll) updatePoll(poll);
	}, [requestWithChatAuth, updatePoll]);

	const closePoll = useCallback(async (pollId: string) => {
		const poll = await requestWithChatAuth(token => apiClosePoll(token, pollId));
		if (poll) updatePoll(poll);
	}, [requestWithChatAuth, updatePoll]);

	const sendAnnouncement = useCallback(async (content: string) => {
		const roomId = currentRoomIdRef.current;
		if (!currentUser || !roomId) return;
		const trimmedContent = content.trim();
		if (!trimmedContent) {
			setError("Announcement cannot be empty.");
			return;
		}
		if (trimmedContent.length > MAX_CHAT_MESSAGE_LENGTH) {
			setError(`Announcement exceeds ${MAX_CHAT_MESSAGE_LENGTH} characters.`);
			return;
		}

		const idempotencyKey = createChatClientMessageId();
		const optimisticMessage: ChatDisplayMessage = {
			id: idempotencyKey,
			idempotencyKey,
			roomId,
			authorUid: currentUser.uid,
			authorName: normalizeChatDisplayName(currentUser.displayName),
			replyToMessageId: null,
			type: "ANNOUNCEMENT",
			visibility: "VISIBLE",
			content: trimmedContent,
			editedAt: null,
			deletedAt: null,
			attachments: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
		setMessages(prev => [...prev, optimisticMessage]);

		try {
			await waitForMessageSocket(roomId);
			const confirmed = await sendMessageOverSocket(roomId, trimmedContent, undefined, idempotencyKey, "ANNOUNCEMENT");
			upsertMessage({ ...confirmed, idempotencyKey });
		} catch (error) {
			setMessages(prev => prev.filter(message => message.id !== idempotencyKey));
			if (error instanceof ChatApiError) setError(error.message);
		}
	}, [currentUser, sendMessageOverSocket, upsertMessage, waitForMessageSocket]);

	const togglePin = useCallback(async (messageId: string, duration: PinDuration = "forever") => {
		const roomId = currentRoomIdRef.current;
		if (!roomId) return;
		const isPinned = pinnedMessages.some(pin => pin.messageId === messageId);
		setPinnedMessages(prev => isPinned
			? prev.filter(pin => pin.messageId !== messageId)
			: [...prev, {
				roomId,
				messageId,
				pinnedBy: currentUserId ?? "",
				pinnedAt: new Date().toISOString(),
				expiresAt: getChatPinExpiry(duration),
			}]
		);
		try {
			await requestWithChatAuth(token => isPinned
				? apiUnpinMessage(token, roomId, messageId)
				: apiPinMessage(token, roomId, messageId, duration));
		} catch (error) {
			void loadPins(roomId);
			if (error instanceof ChatApiError) setError(error.message);
		}
	}, [currentUserId, loadPins, pinnedMessages, requestWithChatAuth]);

	const moderationDelete = useCallback(async (messageId: string, reason?: string) => {
		setPinnedMessages(prev => removeChatPinForMessage(prev, messageId));
		setMessages(prev => prev.map(message =>
			message.id === messageId ? { ...message, visibility: "DELETED" as const, content: "" } : message,
		));
		try {
			await requestWithChatAuth(token => apiModerationDeleteMessage(token, messageId, reason));
		} catch (error) {
			void syncLatestMessages(currentRoomIdRef.current ?? "");
			if (error instanceof ChatApiError) setError(error.message);
		}
	}, [requestWithChatAuth, syncLatestMessages]);

	const warnUser = useCallback(async (userUid: string, reason?: string, messageId?: string) => {
		await requestWithChatAuth(token => apiWarnUser(token, userUid, reason, messageId));
	}, [requestWithChatAuth]);

	const suspendUser = useCallback(async (userUid: string, expiresAt: string, reason?: string) => {
		await requestWithChatAuth(token => apiSuspendUser(token, userUid, expiresAt, reason));
	}, [requestWithChatAuth]);

	const banUser = useCallback(async (userUid: string, reason?: string) => {
		await requestWithChatAuth(token => apiBanUser(token, userUid, reason));
	}, [requestWithChatAuth]);

	const value = useMemo<ChatContextValue>(() => ({
		universityRoom, batchmateRoom, activeRoom, setActiveRoom, currentRoom,
		currentUserId, chatRole,
		messages, pinnedMessages, hasMore, loadingMessages, loadOlderMessages,
		sendText, editMsg, deleteMsg, retryMessage, react, unreact, report,
		createPoll, votePoll, closePoll, sendAnnouncement, togglePin,
		moderationDelete, warnUser, suspendUser, banUser,
		onlineUsers, connected, error, dismissError, hasBatchmateRoom,
	}), [
		universityRoom, batchmateRoom, activeRoom, currentRoom, currentUserId, chatRole,
		messages, pinnedMessages, hasMore, loadingMessages, loadOlderMessages,
		sendText, editMsg, deleteMsg, retryMessage, react, unreact, report,
		createPoll, votePoll, closePoll, sendAnnouncement, togglePin,
		moderationDelete, warnUser, suspendUser, banUser,
		onlineUsers, connected, error, dismissError, hasBatchmateRoom,
	]);

	return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
