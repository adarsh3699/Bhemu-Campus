import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "@bhemu/shared";
import type { UMSLocalData } from "@bhemu/shared";

export async function saveUmsData(data: UMSLocalData): Promise<void> {
	await AsyncStorage.setItem(STORAGE_KEYS.umsLocalData, JSON.stringify(data)).catch(() => {});
}

export async function getUmsData(): Promise<UMSLocalData | null> {
	try {
		const raw = await AsyncStorage.getItem(STORAGE_KEYS.umsLocalData);
		return raw ? (JSON.parse(raw) as UMSLocalData) : null;
	} catch {
		return null;
	}
}

export async function clearUmsData(): Promise<void> {
	await AsyncStorage.removeItem(STORAGE_KEYS.umsLocalData).catch(() => {});
}

export async function getMessagesLastSeenCount(): Promise<number> {
	try {
		const val = await AsyncStorage.getItem(STORAGE_KEYS.umsMessagesLastSeen);
		return val ? parseInt(val, 10) || 0 : 0;
	} catch {
		return 0;
	}
}

export async function setMessagesLastSeenCount(count: number): Promise<void> {
	await AsyncStorage.setItem(STORAGE_KEYS.umsMessagesLastSeen, String(count)).catch(() => {});
}
