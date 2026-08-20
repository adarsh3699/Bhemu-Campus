import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useIsFocused } from "expo-router";
import {
	apiCreateChatSession,
	apiDeleteMessage,
	apiEditMessage,
	apiGetBatchmateRoom,
	apiGetMessages,
	apiGetRoomEvents,
	apiGetUniversityRoom,
	apiRemoveReaction,
	apiReportMessage,
	apiSetReaction,
	ChatApiError,
	CHAT_API_BASE,
	WS_EVENTS,
} from "@bhemu/chat";
import type { ChatDisplayMessage, ChatMessage, ChatRoom, PresenceUser, ReportReason, WsEnvelope } from "@bhemu/shared";
import { CHAT_OPTIMISTIC_PREFIX, createChatClientMessageId, MAX_CHAT_MESSAGE_LENGTH, mergeChatMessages, normalizeChatDisplayName } from "@bhemu/shared";
import { useAuth } from "@/contexts/AuthContext";
import { useGpaProfiles } from "@/contexts/GpaDataContext";
import {
	readChatMessagesCache,
	readChatRoomSequence,
	readChatRoomCache,
	writeChatMessagesCache,
	writeChatRoomSequence,
	writeChatRoomCache,
} from "@/features/chat/cache";

export type ActiveRoom = "university" | "batchmate";

interface ChatContextValue {
	universityRoom: ChatRoom | null;
	batchmateRoom: ChatRoom | null;
	activeRoom: ActiveRoom;
	setActiveRoom: (room: ActiveRoom) => void;
	currentRoom: ChatRoom | null;
	currentUserId: string | null;
	messages: ChatDisplayMessage[];
	hasMore: boolean;
	loadingMessages: boolean;
	loadOlderMessages: () => Promise<void>;
	sendText: (content: string, replyToId?: string) => Promise<void>;
	editMessage: (messageId: string, content: string) => Promise<void>;
	deleteMessage: (messageId: string) => Promise<void>;
	retryMessage: (messageId: string) => Promise<void>;
	react: (messageId: string, emoji: string) => Promise<void>;
	unreact: (messageId: string) => Promise<void>;
	report: (messageId: string, reason: ReportReason, description?: string) => Promise<void>;
	onlineUsers: PresenceUser[];
	connected: boolean;
	error: string | null;
	dismissError: () => void;
	hasBatchmateRoom: boolean;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export function useChat(): ChatContextValue {
	const context = useContext(ChatContext);
	if (!context) throw new Error("useChat must be used inside ChatProvider");
	return context;
}

interface PendingSocketSend {
	resolve: (message: ChatMessage) => void;
	reject: (error: ChatApiError) => void;
	timer: ReturnType<typeof setTimeout>;
}

interface RoomSyncedPayload {
	roomId: string;
	onlineUsers: PresenceUser[];
}

const HEARTBEAT_MS = 25_000;
const HEARTBEAT_TIMEOUT_MS = 10_000;
const MESSAGE_SOCKET_READY_TIMEOUT_MS = 5_000;
const MESSAGE_SOCKET_TIMEOUT_MS = 15_000;
const RECONNECT_BASE_DELAY_MS = 1_000;
const RECONNECT_MAX_DELAY_MS = 30_000;
const TOKEN_REFRESH_SKEW_MS = 60_000;
const SESSION_REFRESH_SKEW_MS = 60_000;
function isRecoverableAuthError(error: unknown): error is ChatApiError {
	return (
		error instanceof ChatApiError &&
		error.status === 401 &&
		(error.code === "CHAT_SESSION_REQUIRED" || error.code === "INVALID_TOKEN")
	);
}

function upsertMessages(current: ChatDisplayMessage[], incoming: ChatDisplayMessage): ChatDisplayMessage[] {
	return mergeChatMessages(current, [incoming]);
}

function chatErrorMessage(error: unknown, fallback: string): string {
	return error instanceof ChatApiError ? error.message : fallback;
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
	const { currentUser } = useAuth();
	const { currentProfile } = useGpaProfiles();
	const isFocused = useIsFocused();
	const groupKey = (currentProfile as (typeof currentProfile & { groupKey?: string | null }) | undefined)?.groupKey ?? null;

	const [universityRoom, setUniversityRoom] = useState<ChatRoom | null>(null);
	const [batchmateRoom, setBatchmateRoom] = useState<ChatRoom | null>(null);
	const [activeRoom, setActiveRoomState] = useState<ActiveRoom>("university");
	const [messages, setMessages] = useState<ChatDisplayMessage[]>([]);
	const [hasMore, setHasMore] = useState(false);
	const [loadingMessages, setLoadingMessages] = useState(false);
	const [connected, setConnected] = useState(false);
	const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
	const [error, setError] = useState<string | null>(null);

	const wsRef = useRef<WebSocket | null>(null);
	const currentRoomIdRef = useRef<string | null>(null);
	const connectWsRef = useRef<((roomId: string) => Promise<void>) | null>(null);
	const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const heartbeatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const reconnectAttemptsRef = useRef(0);
	const connectionGenerationRef = useRef(0);
	const pendingSendsRef = useRef(new Map<string, PendingSocketSend>());
	const messagesRef = useRef<ChatDisplayMessage[]>([]);
	const cursorRef = useRef<string | null>(null);
	const loadingOlderRef = useRef(false);
	const messageRequestRef = useRef(0);
	const tokenCacheRef = useRef<{ token: string; expiresAt: number } | null>(null);
	const sessionCacheRef = useRef<{ token: string; expiresAt: number; uid: string } | null>(null);
	const sessionBootstrapRef = useRef<Promise<string | null> | null>(null);
	const roomSequencesRef = useRef(new Map<string, number>());
	const roomEventSyncRef = useRef(new Map<string, Promise<void>>());
	const syncRoomEventsRef = useRef<((roomId: string, after?: number) => Promise<void>) | null>(null);
	const syncLatestMessagesRef = useRef<((roomId: string) => Promise<void>) | null>(null);
	const syncingRoomRef = useRef<string | null>(null);

	const getFirebaseToken = useCallback(
		async (forceRefresh = false): Promise<string | null> => {
			if (!currentUser) return null;
			const cached = tokenCacheRef.current;
			if (!forceRefresh && cached && Date.now() + TOKEN_REFRESH_SKEW_MS < cached.expiresAt) return cached.token;

			try {
				const result = await currentUser.getIdTokenResult(forceRefresh);
				const expiresAt = Date.parse(result.expirationTime);
				if (!result.token || !Number.isFinite(expiresAt)) return null;
				tokenCacheRef.current = { token: result.token, expiresAt };
				return result.token;
			} catch {
				return null;
			}
		},
		[currentUser],
	);

	const getChatToken = useCallback(
		async (forceRefresh = false): Promise<string | null> => {
			if (!currentUser) return null;
			const cached = sessionCacheRef.current;
			if (!forceRefresh && cached && cached.uid === currentUser.uid && Date.now() + SESSION_REFRESH_SKEW_MS < cached.expiresAt) {
				return cached.token;
			}
			if (sessionBootstrapRef.current) return sessionBootstrapRef.current;
			if (forceRefresh) sessionCacheRef.current = null;

			const bootstrap = (async () => {
				const firebaseToken = await getFirebaseToken(forceRefresh);
				if (!firebaseToken) return null;

				try {
					let session;
					try {
						session = await apiCreateChatSession(firebaseToken);
					} catch (sessionError) {
						if (!isRecoverableAuthError(sessionError)) throw sessionError;
						tokenCacheRef.current = null;
						const refreshedFirebaseToken = await getFirebaseToken(true);
						if (!refreshedFirebaseToken) return null;
						session = await apiCreateChatSession(refreshedFirebaseToken);
					}

					const expiresAt = Date.parse(session.expiresAt);
					if (!Number.isFinite(expiresAt)) throw new Error("Chat session response had an invalid expiry.");
					sessionCacheRef.current = { token: session.token, expiresAt, uid: currentUser.uid };
					return session.token;
				} catch (authenticationError) {
					setError(chatErrorMessage(authenticationError, "Chat authentication is temporarily unavailable."));
					return null;
				}
			})();

			sessionBootstrapRef.current = bootstrap;
		try {
			return await bootstrap;
		} finally {
			if (sessionBootstrapRef.current === bootstrap) sessionBootstrapRef.current = null;
		}
		},
		[currentUser, getFirebaseToken],
	);

	const requestWithChatAuth = useCallback(
		async <T,>(request: (token: string) => Promise<T>): Promise<T | null> => {
			let token = await getChatToken();
			if (!token) return null;

			try {
				return await request(token);
			} catch (requestError) {
				if (!isRecoverableAuthError(requestError)) throw requestError;
				token = await getChatToken(true);
				if (!token) return null;
				return request(token);
			}
		},
		[getChatToken],
	);

	useEffect(() => {
		tokenCacheRef.current = null;
		sessionCacheRef.current = null;
		sessionBootstrapRef.current = null;
	}, [currentUser?.uid]);

	const dismissError = useCallback(() => setError(null), []);

	useEffect(() => {
		messagesRef.current = messages;
	}, [messages]);

	const disconnectWs = useCallback(() => {
		connectionGenerationRef.current += 1;
		if (heartbeatRef.current) clearInterval(heartbeatRef.current);
		if (heartbeatTimeoutRef.current) clearTimeout(heartbeatTimeoutRef.current);
		if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
		heartbeatRef.current = null;
		heartbeatTimeoutRef.current = null;
		reconnectTimerRef.current = null;

		if (wsRef.current) {
			wsRef.current.onclose = null;
			wsRef.current.onerror = null;
			wsRef.current.close(1000, "screen inactive");
			wsRef.current = null;
		}

		for (const [id, pending] of pendingSendsRef.current) {
			clearTimeout(pending.timer);
			pending.reject(new ChatApiError("MESSAGE_SOCKET_CLOSED", "Message connection closed.", 503));
			pendingSendsRef.current.delete(id);
		}

		setConnected(false);
	}, []);

	const upsertMessage = useCallback((message: ChatDisplayMessage) => {
		setMessages((current) => upsertMessages(current, message));
	}, []);

	const getRoomSequence = useCallback((roomId: string): number => {
		return roomSequencesRef.current.get(roomId) ?? 0;
	}, []);

	const setRoomSequence = useCallback((roomId: string, sequence: number): void => {
		if (!Number.isSafeInteger(sequence) || sequence <= getRoomSequence(roomId)) return;
		roomSequencesRef.current.set(roomId, sequence);
		if (currentUser) void writeChatRoomSequence(currentUser.uid, roomId, sequence);
	}, [currentUser, getRoomSequence]);

	/** Replays durable events after reconnect or a detected sequence gap. */
	const syncRoomEvents = useCallback(async (roomId: string, afterOverride?: number) => {
		const existing = roomEventSyncRef.current.get(roomId);
		if (existing) return existing;

		const startAfter = afterOverride ?? getRoomSequence(roomId);
		const syncPromise = (async () => {
			let after = startAfter;
			while (true) {
				const page = await requestWithChatAuth((token) => apiGetRoomEvents(token, roomId, after, 100));
				if (!page || currentRoomIdRef.current !== roomId) return;
				if (page.resyncRequired) {
					await syncLatestMessagesRef.current?.(roomId);
					if (page.highWater > after) setRoomSequence(roomId, page.highWater);
					return;
				}

				for (const event of page.events) {
					const message = event.payload?.message;
					if (message?.id && message.roomId === roomId) {
						upsertMessage({ ...message, eventId: event.eventId, roomSeq: event.roomSeq });
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
			if (roomEventSyncRef.current.get(roomId) === syncPromise) roomEventSyncRef.current.delete(roomId);
		}
	}, [getRoomSequence, requestWithChatAuth, setRoomSequence, upsertMessage]);

	const syncLatestMessages = useCallback(async (roomId: string) => {
		if (currentRoomIdRef.current !== roomId || syncingRoomRef.current === roomId) return;
		syncingRoomRef.current = roomId;
		try {
			const knownServerIds = new Set(
				messagesRef.current
					.filter((message) => message.roomId === roomId && !message.id.startsWith(CHAT_OPTIMISTIC_PREFIX))
					.map((message) => message.id),
			);
			const recovered: ChatDisplayMessage[] = [];
			let cursor: string | undefined;

			while (true) {
				const page = await requestWithChatAuth((token) => apiGetMessages(token, roomId, cursor, 100));
				if (!page || currentRoomIdRef.current !== roomId) return;
				recovered.push(...page.items);

				const foundAnchor = page.items.some((message) => knownServerIds.has(message.id));
				if (!knownServerIds.size || foundAnchor || !page.hasMore || !page.nextCursor) break;
				cursor = page.nextCursor;
			}

			if (recovered.length > 0 && currentRoomIdRef.current === roomId) {
				setMessages((current) => mergeChatMessages(current, recovered));
			}
		} finally {
			if (syncingRoomRef.current === roomId) syncingRoomRef.current = null;
		}
	}, [requestWithChatAuth]);

	useEffect(() => {
		syncRoomEventsRef.current = syncRoomEvents;
		return () => {
			syncRoomEventsRef.current = null;
		};
	}, [syncRoomEvents]);

	useEffect(() => {
		syncLatestMessagesRef.current = syncLatestMessages;
		return () => {
			syncLatestMessagesRef.current = null;
		};
	}, [syncLatestMessages]);

	const loadMessages = useCallback(
		async (roomId: string, reset = false) => {
			const requestId = ++messageRequestRef.current;
			setLoadingMessages(true);
			try {
				const result = await requestWithChatAuth((token) => apiGetMessages(token, roomId, reset ? undefined : cursorRef.current ?? undefined, 50));
				if (!result || requestId !== messageRequestRef.current || currentRoomIdRef.current !== roomId) return;

				const ordered = [...result.items].reverse();
				setMessages((current) => mergeChatMessages(current, ordered));
				setHasMore(result.hasMore);
				cursorRef.current = result.nextCursor;
			} catch (loadError) {
				if (requestId === messageRequestRef.current) setError(chatErrorMessage(loadError, "Messages could not be loaded."));
			} finally {
				if (requestId === messageRequestRef.current) setLoadingMessages(false);
			}
		},
		[requestWithChatAuth],
	);

	const handleWsEvent = useCallback(
		(envelope: WsEnvelope) => {
			if (envelope.type === WS_EVENTS.ROOM_SYNCED) {
				const payload = envelope.payload as RoomSyncedPayload;
				if (payload.roomId !== currentRoomIdRef.current) return;
				setConnected(true);
				setError(null);
				setOnlineUsers(payload.onlineUsers ?? []);
				void syncRoomEventsRef.current?.(payload.roomId).catch(() => {
					void syncLatestMessagesRef.current?.(payload.roomId);
				});
				return;
			}

			if (envelope.type === WS_EVENTS.MESSAGE_ACK) {
				const payload = envelope.payload as { clientMessageId?: string; message?: ChatMessage; roomSeq?: number };
				if (!payload.clientMessageId || !payload.message) return;
				const sequence = Number(payload.roomSeq);
				if (Number.isSafeInteger(sequence) && sequence > 0) {
					setRoomSequence(payload.message.roomId, sequence);
				}
				const confirmedMessage: ChatDisplayMessage = Number.isSafeInteger(sequence) && sequence > 0
					? { ...payload.message, roomSeq: sequence }
					: payload.message;
				const pending = pendingSendsRef.current.get(payload.clientMessageId);
				if (pending) {
					clearTimeout(pending.timer);
					pendingSendsRef.current.delete(payload.clientMessageId);
					pending.resolve(confirmedMessage);
				}
				upsertMessage({ ...confirmedMessage, idempotencyKey: payload.clientMessageId });
				return;
			}

			if (envelope.type === WS_EVENTS.MESSAGE_ERROR) {
				const payload = envelope.payload as { clientMessageId?: string; message?: string; code?: string };
				const sendError = new ChatApiError(payload.code ?? "MESSAGE_SEND_FAILED", payload.message ?? "Message could not be sent.", 400);
				if (payload.clientMessageId) {
					const pending = pendingSendsRef.current.get(payload.clientMessageId);
					if (pending) {
						clearTimeout(pending.timer);
						pendingSendsRef.current.delete(payload.clientMessageId);
						pending.reject(sendError);
					}
					else setError(sendError.message);
				}
				else setError(sendError.message);
				return;
			}

			if (envelope.type === WS_EVENTS.MESSAGE_CREATED || envelope.type === WS_EVENTS.ANNOUNCEMENT_CREATED || envelope.type === WS_EVENTS.MESSAGE_UPDATED) {
				const message = envelope.payload as ChatDisplayMessage;
				if (message?.roomId !== currentRoomIdRef.current) return;
				const sequence = Number(message.roomSeq);
				if (envelope.type !== WS_EVENTS.MESSAGE_UPDATED && Number.isSafeInteger(sequence) && sequence > 0) {
					const previous = getRoomSequence(message.roomId);
					if (sequence > previous + 1) {
						void syncRoomEventsRef.current?.(message.roomId, previous).catch(() => {
							void syncLatestMessagesRef.current?.(message.roomId);
						});
					}
					setRoomSequence(message.roomId, sequence);
				}
				upsertMessage(message);
				return;
			}

			if (envelope.type === WS_EVENTS.MESSAGE_DELETED) {
				const payload = envelope.payload as { messageId?: string };
				if (!payload.messageId) return;
				setMessages((current) => current.map((message) => message.id === payload.messageId ? { ...message, visibility: "DELETED", content: "" } : message));
				return;
			}

			if (envelope.type === WS_EVENTS.REACTION_UPDATED) {
				const payload = envelope.payload as { messageId?: string; userUid?: string; emoji?: string | null };
				if (!payload.messageId || !payload.userUid) return;
				const messageId = payload.messageId;
				const userUid = payload.userUid;
				setMessages((current) => current.map((message) => {
					if (message.id !== messageId) return message;
					const reactions = (message.reactions ?? []).filter((reaction) => reaction.userUid !== userUid);
					if (payload.emoji) {
						reactions.push({
							messageId,
							userUid,
							emoji: payload.emoji,
							createdAt: envelope.timestamp,
						});
					}
					return { ...message, reactions };
				}));
				return;
			}

			if (envelope.type === WS_EVENTS.PRESENCE_JOINED) {
				const payload = envelope.payload as { uid?: string; role?: PresenceUser["role"]; connectedAt?: number };
				if (!payload.uid) return;
				const uid = payload.uid;
				setOnlineUsers((current) => current.some((user) => user.uid === uid)
					? current
					: [...current, { uid, role: payload.role ?? "STUDENT", connectedAt: payload.connectedAt ?? Date.now() }]);
				return;
			}

			if (envelope.type === WS_EVENTS.PRESENCE_LEFT) {
				const payload = envelope.payload as { uid?: string };
				if (payload.uid) setOnlineUsers((current) => current.filter((user) => user.uid !== payload.uid));
			}
		},
		[getRoomSequence, setRoomSequence, upsertMessage],
	);

	const connectWs = useCallback(
		async (roomId: string) => {
			disconnectWs();
			const generation = connectionGenerationRef.current;
			const token = await getChatToken();
			if (!token || generation !== connectionGenerationRef.current || currentRoomIdRef.current !== roomId) return;

			const wsBase = CHAT_API_BASE.replace("https://", "wss://").replace("http://", "ws://");
			const socket = new WebSocket(`${wsBase}/ws/${roomId}?token=${encodeURIComponent(token)}`);
			wsRef.current = socket;
			const isCurrentSocket = () => wsRef.current === socket && generation === connectionGenerationRef.current && currentRoomIdRef.current === roomId;

			socket.onopen = () => {
				if (!isCurrentSocket()) {
					socket.close(1000, "superseded");
					return;
				}
				reconnectAttemptsRef.current = 0;
				setConnected(true);
				const sendHeartbeat = () => {
					if (!isCurrentSocket() || socket.readyState !== WebSocket.OPEN) return;
					try {
						socket.send(JSON.stringify({ type: "heartbeat" }));
						if (heartbeatTimeoutRef.current) clearTimeout(heartbeatTimeoutRef.current);
						heartbeatTimeoutRef.current = setTimeout(() => {
							if (isCurrentSocket()) socket.close(4000, "heartbeat timeout");
						}, HEARTBEAT_TIMEOUT_MS);
					} catch {
						socket.close(4000, "heartbeat failed");
					}
				};
				sendHeartbeat();
				heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_MS);
			};

			socket.onmessage = (event) => {
				if (!isCurrentSocket()) return;
				try {
					const envelope = JSON.parse(event.data) as WsEnvelope;
					if (envelope.type === WS_EVENTS.HEARTBEAT_ACK) {
						if (heartbeatTimeoutRef.current) clearTimeout(heartbeatTimeoutRef.current);
						const serverSequence = Number((envelope.payload as { roomSeq?: number })?.roomSeq);
						const localRoomId = currentRoomIdRef.current;
						if (localRoomId && Number.isSafeInteger(serverSequence) && serverSequence > getRoomSequence(localRoomId)) {
							void syncRoomEventsRef.current?.(localRoomId, getRoomSequence(localRoomId)).catch(() => {
								void syncLatestMessagesRef.current?.(localRoomId);
							});
						}
						return;
					}
					handleWsEvent(envelope);
				} catch {
					// Ignore malformed frames and keep the connection alive.
				}
			};

			socket.onerror = () => {
				if (isCurrentSocket()) setError("Live connection interrupted. Reconnecting…");
			};

			socket.onclose = (event) => {
				if (!isCurrentSocket()) return;
				wsRef.current = null;
				setConnected(false);
				for (const [id, pending] of pendingSendsRef.current) {
					clearTimeout(pending.timer);
					pendingSendsRef.current.delete(id);
					pending.reject(new ChatApiError("MESSAGE_SOCKET_CLOSED", "Message connection closed.", 503));
				}
				if (heartbeatRef.current) clearInterval(heartbeatRef.current);
				if (heartbeatTimeoutRef.current) clearTimeout(heartbeatTimeoutRef.current);
				if (event.code === 1000 || !isFocused) return;

				reconnectAttemptsRef.current += 1;
				const delay = Math.min(RECONNECT_MAX_DELAY_MS, RECONNECT_BASE_DELAY_MS * 2 ** Math.min(reconnectAttemptsRef.current - 1, 5));
				reconnectTimerRef.current = setTimeout(() => {
					if (currentRoomIdRef.current === roomId) void connectWsRef.current?.(roomId);
				}, delay);
			};
		},
		[disconnectWs, getChatToken, getRoomSequence, handleWsEvent, isFocused],
	);

	useEffect(() => {
		connectWsRef.current = connectWs;
		return () => {
			connectWsRef.current = null;
		};
	}, [connectWs]);

	useEffect(() => {
		if (!isFocused || !currentUser) return;
		let cancelled = false;

		void (async () => {
			try {
				const [cachedUniversity, cachedBatchmate] = await Promise.all([
					readChatRoomCache(currentUser.uid, "university"),
					groupKey ? readChatRoomCache(currentUser.uid, `batchmate:${groupKey}`) : Promise.resolve(null),
				]);
				if (cancelled) return;
				if (cachedUniversity) setUniversityRoom(cachedUniversity);
				if (cachedBatchmate) setBatchmateRoom(cachedBatchmate);

				const [university, batchmate] = await Promise.all([
					requestWithChatAuth(apiGetUniversityRoom),
					groupKey ? requestWithChatAuth((token) => apiGetBatchmateRoom(token, groupKey)) : Promise.resolve(null),
				]);
				if (cancelled) return;
				if (university) {
					setUniversityRoom(university);
					void writeChatRoomCache(currentUser.uid, "university", university);
				} else if (!cachedUniversity) {
					setUniversityRoom(null);
				}
				if (batchmate && groupKey) {
					setBatchmateRoom(batchmate);
					void writeChatRoomCache(currentUser.uid, `batchmate:${groupKey}`, batchmate);
				} else if (!cachedBatchmate) {
					setBatchmateRoom(null);
				}
				if (!batchmate && !cachedBatchmate) setActiveRoomState((current) => current === "batchmate" ? "university" : current);
			} catch (loadError) {
				if (!cancelled) setError(chatErrorMessage(loadError, "Chat rooms could not be loaded."));
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [currentUser, groupKey, isFocused, requestWithChatAuth]);

	const currentRoom = activeRoom === "university" ? universityRoom : batchmateRoom;
	const currentRoomId = currentRoom?.id ?? null;

	useEffect(() => {
		if (!isFocused || !currentRoomId) {
			currentRoomIdRef.current = null;
			cursorRef.current = null;
			// This effect owns the external WebSocket lifecycle for the focused room.
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setMessages([]);
			setHasMore(false);
			setOnlineUsers([]);
			setLoadingMessages(false);
			disconnectWs();
			return;
		}

		currentRoomIdRef.current = currentRoomId;
		cursorRef.current = null;
		setMessages([]);
		setOnlineUsers([]);
		setHasMore(false);
		setLoadingMessages(true);
		let cancelled = false;
		void (async () => {
			let cachedMessages: ChatDisplayMessage[] = [];
			let cachedSequence = 0;
			if (currentUser) {
				[cachedMessages, cachedSequence] = await Promise.all([
					readChatMessagesCache(currentUser.uid, currentRoomId),
					readChatRoomSequence(currentUser.uid, currentRoomId),
				]);
			}
			if (cancelled || currentRoomIdRef.current !== currentRoomId) return;
			roomSequencesRef.current.set(currentRoomId, Math.max(getRoomSequence(currentRoomId), cachedSequence));
			if (cachedMessages.length > 0) setMessages((current) => mergeChatMessages(current, cachedMessages));
			void loadMessages(currentRoomId, true);
			void connectWs(currentRoomId);
		})();

		return () => {
			cancelled = true;
			if (currentRoomIdRef.current === currentRoomId) currentRoomIdRef.current = null;
			disconnectWs();
		};
	}, [connectWs, currentRoomId, currentUser, disconnectWs, getRoomSequence, isFocused, loadMessages]);

	useEffect(() => () => disconnectWs(), [disconnectWs]);

	useEffect(() => {
		if (!currentUser || !currentRoomId || messages.length === 0) return;
		const timer = setTimeout(() => {
			void writeChatMessagesCache(currentUser.uid, currentRoomId, messages);
		}, 500);
		return () => clearTimeout(timer);
	}, [currentRoomId, currentUser, messages]);

	const setActiveRoom = useCallback((room: ActiveRoom) => {
		if (room === "batchmate" && !batchmateRoom) return;
		setActiveRoomState(room);
	}, [batchmateRoom]);

	const loadOlderMessages = useCallback(async () => {
		if (!currentRoomId || !hasMore || loadingMessages || loadingOlderRef.current) return;
		loadingOlderRef.current = true;
		try {
			await loadMessages(currentRoomId);
		} finally {
			loadingOlderRef.current = false;
		}
	}, [currentRoomId, hasMore, loadMessages, loadingMessages]);

	const sendMessageOverSocket = useCallback(
		(roomId: string, content: string, replyToId: string | undefined, idempotencyKey: string) =>
			new Promise<ChatMessage>((resolve, reject) => {
				const socket = wsRef.current;
				if (!socket || socket.readyState !== WebSocket.OPEN) {
					reject(new ChatApiError("MESSAGE_SOCKET_UNAVAILABLE", "Live connection is unavailable.", 503));
					return;
				}

				const timer = setTimeout(() => {
					pendingSendsRef.current.delete(idempotencyKey);
					reject(new ChatApiError("MESSAGE_SOCKET_TIMEOUT", "Message delivery timed out.", 504));
				}, MESSAGE_SOCKET_TIMEOUT_MS);
				pendingSendsRef.current.set(idempotencyKey, { resolve, reject, timer });

				try {
					socket.send(JSON.stringify({
						type: "message.send",
						payload: { roomId, content, replyToMessageId: replyToId ?? null, idempotencyKey },
					}));
				} catch {
					clearTimeout(timer);
					pendingSendsRef.current.delete(idempotencyKey);
					reject(new ChatApiError("MESSAGE_SOCKET_UNAVAILABLE", "Live connection is unavailable.", 503));
				}
			}),
		[],
	);

	const waitForSocket = useCallback(async (roomId: string) => {
		const deadline = Date.now() + MESSAGE_SOCKET_READY_TIMEOUT_MS;
		while (Date.now() < deadline) {
			if (currentRoomIdRef.current === roomId && wsRef.current?.readyState === WebSocket.OPEN) return;
			await new Promise((resolve) => setTimeout(resolve, 50));
		}
		throw new ChatApiError("MESSAGE_SOCKET_UNAVAILABLE", "Live connection is unavailable.", 503);
	}, []);

	const confirmPendingMessage = useCallback((roomId: string, messageId: string) => {
		setError("Message delivery is being confirmed…");
		void syncRoomEvents(roomId)
			.catch(() => syncLatestMessagesRef.current?.(roomId))
			.finally(() => {
				setMessages((current) => {
					const index = current.findIndex((message) => message.id === messageId);
					if (index < 0 || current[index].id !== messageId) return current;
					const next = [...current];
					next[index] = { ...next[index], failed: true };
					return next;
				});
			});
	}, [syncRoomEvents]);

	const sendText = useCallback(
		async (content: string, replyToId?: string) => {
			const roomId = currentRoomIdRef.current;
			if (!currentUser || !roomId) return;
			const trimmed = content.trim();
			if (!trimmed) return;
			if (trimmed.length > MAX_CHAT_MESSAGE_LENGTH) {
				setError(`Message exceeds ${MAX_CHAT_MESSAGE_LENGTH} characters.`);
				return;
			}

			const idempotencyKey = createChatClientMessageId();
			const now = new Date().toISOString();
			const optimisticMessage: ChatDisplayMessage = {
				id: idempotencyKey,
				idempotencyKey,
				roomId,
				authorUid: currentUser.uid,
				authorName: normalizeChatDisplayName(currentUser.displayName),
				replyToMessageId: replyToId ?? null,
				type: "TEXT",
				visibility: "VISIBLE",
				content: trimmed,
				editedAt: null,
				deletedAt: null,
				attachments: [],
				createdAt: now,
				updatedAt: now,
			};
			setMessages((current) => upsertMessages(current, optimisticMessage));

			try {
				await waitForSocket(roomId);
				await sendMessageOverSocket(roomId, trimmed, replyToId, idempotencyKey);
			} catch (sendError) {
				if (
					sendError instanceof ChatApiError &&
					(sendError.code === "MESSAGE_SOCKET_TIMEOUT" || sendError.code === "MESSAGE_SOCKET_CLOSED")
				) {
					confirmPendingMessage(roomId, idempotencyKey);
					return;
				}
				setMessages((current) => current.filter((message) => message.id !== idempotencyKey));
				setError(chatErrorMessage(sendError, "Message could not be sent."));
			}
		},
		[currentUser, confirmPendingMessage, sendMessageOverSocket, waitForSocket],
	);

	const retryMessage = useCallback(async (messageId: string) => {
		const message = messagesRef.current.find((item) => item.id === messageId);
		if (!message?.failed) return;

		setMessages((current) => current.map((item) => item.id === messageId
			? { ...item, failed: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
			: item));

		try {
			await waitForSocket(message.roomId);
			await sendMessageOverSocket(message.roomId, message.content, message.replyToMessageId ?? undefined, message.idempotencyKey ?? message.id);
		} catch (retryError) {
			if (
				retryError instanceof ChatApiError &&
				(retryError.code === "MESSAGE_SOCKET_TIMEOUT" || retryError.code === "MESSAGE_SOCKET_CLOSED")
			) {
				confirmPendingMessage(message.roomId, messageId);
				return;
			}
			setMessages((current) => current.filter((item) => item.id !== messageId));
			setError(chatErrorMessage(retryError, "Message could not be sent."));
		}
	}, [confirmPendingMessage, sendMessageOverSocket, waitForSocket]);

	const editMessage = useCallback(async (messageId: string, content: string) => {
		const trimmed = content.trim();
		if (!trimmed) {
			setError("Message cannot be empty.");
			return;
		}
		if (trimmed.length > MAX_CHAT_MESSAGE_LENGTH) {
			setError(`Message exceeds ${MAX_CHAT_MESSAGE_LENGTH} characters.`);
			return;
		}

		setMessages((current) => current.map((message) => message.id === messageId
			? { ...message, content: trimmed, editedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
			: message));
		try {
			await requestWithChatAuth((token) => apiEditMessage(token, messageId, trimmed));
		} catch (editError) {
			setError(chatErrorMessage(editError, "Message could not be edited."));
		}
	}, [requestWithChatAuth]);

	const deleteMessage = useCallback(async (messageId: string) => {
		setMessages((current) => current.map((message) => message.id === messageId
			? { ...message, visibility: "DELETED", content: "", deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
			: message));
		try {
			await requestWithChatAuth((token) => apiDeleteMessage(token, messageId));
		} catch (deleteError) {
			setError(chatErrorMessage(deleteError, "Message could not be deleted."));
		}
	}, [requestWithChatAuth]);

	const react = useCallback(async (messageId: string, emoji: string) => {
		const uid = currentUser?.uid;
		if (!uid) return;
		setMessages((current) => current.map((message) => {
			if (message.id !== messageId) return message;
			const reactions = (message.reactions ?? []).filter((reaction) => reaction.userUid !== uid);
			reactions.push({ messageId, userUid: uid, emoji, createdAt: new Date().toISOString() });
			return { ...message, reactions };
		}));
		try {
			await requestWithChatAuth((token) => apiSetReaction(token, messageId, emoji));
		} catch (reactionError) {
			setError(chatErrorMessage(reactionError, "Reaction could not be added."));
		}
	}, [currentUser?.uid, requestWithChatAuth]);

	const unreact = useCallback(async (messageId: string) => {
		const uid = currentUser?.uid;
		if (!uid) return;
		setMessages((current) => current.map((message) => message.id === messageId
			? { ...message, reactions: (message.reactions ?? []).filter((reaction) => reaction.userUid !== uid) }
			: message));
		try {
			await requestWithChatAuth((token) => apiRemoveReaction(token, messageId));
		} catch (reactionError) {
			setError(chatErrorMessage(reactionError, "Reaction could not be removed."));
		}
	}, [currentUser?.uid, requestWithChatAuth]);

	const report = useCallback(async (messageId: string, reason: ReportReason, description?: string) => {
		try {
			await requestWithChatAuth((token) => apiReportMessage(token, messageId, reason, description));
		} catch (reportError) {
			setError(chatErrorMessage(reportError, "Message could not be reported."));
		}
	}, [requestWithChatAuth]);

	const value = useMemo<ChatContextValue>(() => ({
		universityRoom,
		batchmateRoom,
		activeRoom,
		setActiveRoom,
		currentRoom,
		currentUserId: currentUser?.uid ?? null,
		messages,
		hasMore,
		loadingMessages,
		loadOlderMessages,
		sendText,
		editMessage,
		deleteMessage,
		retryMessage,
		react,
		unreact,
		report,
		onlineUsers,
		connected,
		error,
		dismissError,
		hasBatchmateRoom: Boolean(batchmateRoom),
	}), [
		activeRoom,
		batchmateRoom,
		connected,
		currentRoom,
		currentUser,
		dismissError,
		error,
		hasMore,
		loadOlderMessages,
		loadingMessages,
		messages,
		onlineUsers,
		sendText,
		editMessage,
		deleteMessage,
		retryMessage,
		react,
		unreact,
		report,
		setActiveRoom,
		universityRoom,
	]);

	return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
