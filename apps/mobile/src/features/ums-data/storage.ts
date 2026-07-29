import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "@bhemu/shared";
import type { UMSLocalData } from "@bhemu/shared";

const dataKey = (profileId: string | number) => `${STORAGE_KEYS.umsLocalData}_${profileId}`;
const seenKey = (profileId: string | number) => `${STORAGE_KEYS.umsMessagesLastSeen}_${profileId}`;

export async function saveUmsData(data: UMSLocalData, profileId: string | number): Promise<void> {
	await AsyncStorage.setItem(dataKey(profileId), JSON.stringify(data)).catch(() => {});
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
