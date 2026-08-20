import AsyncStorage from "@react-native-async-storage/async-storage";
import { MAX_CHAT_CACHED_MESSAGES, sortChatMessages, STORAGE_KEYS } from "@bhemu/shared";
import type { ChatDisplayMessage, ChatRoom } from "@bhemu/shared";

const CACHE_VERSION = 1;
const pendingWrites = new Map<string, Promise<void>>();
let chatCacheWritesDisabled = false;

export function disableChatCacheWrites(): void {
	chatCacheWritesDisabled = true;
}

export function enableChatCacheWrites(): void {
	chatCacheWritesDisabled = false;
}

export async function waitForChatCacheWrites(): Promise<void> {
	await Promise.all([...pendingWrites.values()].map((write) => write.catch(() => {})));
}

function cacheKey(uid: string, scope: string): string {
	return `${STORAGE_KEYS.chatCache}:${uid}:${scope}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isChatRoom(value: unknown): value is ChatRoom {
	return isRecord(value)
		&& typeof value.id === "string"
		&& typeof value.type === "string"
		&& typeof value.name === "string";
}

function isChatMessage(value: unknown): value is ChatDisplayMessage {
	return isRecord(value)
		&& typeof value.id === "string"
		&& typeof value.roomId === "string"
		&& typeof value.authorUid === "string"
		&& typeof value.authorName === "string"
		&& (value.replyToMessageId === null || typeof value.replyToMessageId === "string")
		&& typeof value.type === "string"
		&& typeof value.visibility === "string"
		&& typeof value.content === "string"
		&& (value.editedAt === null || typeof value.editedAt === "string")
		&& (value.deletedAt === null || typeof value.deletedAt === "string")
		&& Array.isArray(value.attachments)
		&& typeof value.createdAt === "string"
		&& typeof value.updatedAt === "string";
}

function parseCache<T>(raw: string | null, isValue: (value: unknown) => value is T): T | null {
	if (!raw) return null;
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!isRecord(parsed) || parsed.version !== CACHE_VERSION || !isValue(parsed.value)) return null;
		return parsed.value;
	} catch {
		return null;
	}
}

async function writeCacheValue<T>(key: string, value: T): Promise<void> {
	const previousWrite = pendingWrites.get(key) ?? Promise.resolve();
	const write = previousWrite.catch(() => {}).then(async () => {
		if (chatCacheWritesDisabled) return;
		try {
			await AsyncStorage.setItem(key, JSON.stringify({ version: CACHE_VERSION, value }));
		} catch {
			// Cache failures must never affect the live chat flow.
		}
	});
	pendingWrites.set(key, write);
	try {
		await write;
	} finally {
		if (pendingWrites.get(key) === write) pendingWrites.delete(key);
	}
}

export async function readChatRoomCache(uid: string, roomKey: string): Promise<ChatRoom | null> {
	try {
		return parseCache(await AsyncStorage.getItem(cacheKey(uid, `room:${roomKey}`)), isChatRoom);
	} catch {
		return null;
	}
}

export async function writeChatRoomCache(uid: string, roomKey: string, room: ChatRoom): Promise<void> {
	await writeCacheValue(cacheKey(uid, `room:${roomKey}`), room);
}

export async function readChatMessagesCache(uid: string, roomId: string): Promise<ChatDisplayMessage[]> {
	try {
		const cached = parseCache(await AsyncStorage.getItem(cacheKey(uid, `messages:${roomId}`)), (value): value is ChatDisplayMessage[] => (
			Array.isArray(value) && value.every(isChatMessage)
		));
		return cached ? sortChatMessages(cached) : [];
	} catch {
		return [];
	}
}

export async function writeChatMessagesCache(uid: string, roomId: string, messages: ChatDisplayMessage[]): Promise<void> {
	const value = sortChatMessages(messages).slice(-MAX_CHAT_CACHED_MESSAGES);
	await writeCacheValue(cacheKey(uid, `messages:${roomId}`), value);
}

export async function readChatRoomSequence(uid: string, roomId: string): Promise<number> {
	try {
		const sequence = parseCache(
			await AsyncStorage.getItem(cacheKey(uid, `sequence:${roomId}`)),
			(value): value is number => typeof value === "number",
		) ?? 0;
		return Number.isSafeInteger(sequence) && sequence >= 0 ? sequence : 0;
	} catch {
		return 0;
	}
}

export async function writeChatRoomSequence(uid: string, roomId: string, sequence: number): Promise<void> {
	if (!Number.isSafeInteger(sequence) || sequence < 0) return;
	await writeCacheValue(cacheKey(uid, `sequence:${roomId}`), sequence);
}
