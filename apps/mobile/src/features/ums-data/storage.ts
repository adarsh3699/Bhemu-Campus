import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "@bhemu/shared";
import type { UMSLocalData } from "@bhemu/shared";

const dataKey = (profileId: string | number) => `${STORAGE_KEYS.umsLocalData}_${profileId}`;
const seenKey = (profileId: string | number) => `${STORAGE_KEYS.umsMessagesLastSeen}_${profileId}`;

type UmsDataListener = (data: UMSLocalData) => void;
const listenersByProfile = new Map<string, Set<UmsDataListener>>();

export function subscribeToUmsData(profileId: string | number, listener: UmsDataListener): () => void {
	const key = dataKey(profileId);
	const listeners = listenersByProfile.get(key) ?? new Set<UmsDataListener>();
	listeners.add(listener);
	listenersByProfile.set(key, listeners);

	return () => {
		listeners.delete(listener);
		if (listeners.size === 0) listenersByProfile.delete(key);
	};
}

export async function saveUmsData(data: UMSLocalData, profileId: string | number): Promise<void> {
	try {
		await AsyncStorage.setItem(dataKey(profileId), JSON.stringify(data));
		listenersByProfile.get(dataKey(profileId))?.forEach((listener) => listener(data));
	} catch {
		// Keep storage failures non-fatal for the sync flow.
	}
}

export async function getUmsData(profileId: string | number): Promise<UMSLocalData | null> {
	try {
		const raw = await AsyncStorage.getItem(dataKey(profileId));
		return raw ? (JSON.parse(raw) as UMSLocalData) : null;
	} catch {
		return null;
	}
}

export async function clearUmsData(profileId: string | number): Promise<void> {
	await AsyncStorage.removeItem(dataKey(profileId)).catch(() => {});
}

export async function getMessagesLastSeenCount(profileId: string | number): Promise<number> {
	try {
		const val = await AsyncStorage.getItem(seenKey(profileId));
		return val ? parseInt(val, 10) || 0 : 0;
	} catch {
		return 0;
	}
}

export async function setMessagesLastSeenCount(count: number, profileId: string | number): Promise<void> {
	await AsyncStorage.setItem(seenKey(profileId), String(count)).catch(() => {});
}
