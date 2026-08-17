import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "@bhemu/shared";
import { clearGpaCache, disableGpaCacheWrites } from "@/features/gpa-data/cache";

// Keep this list limited to bCampus-owned storage. Firebase Auth also uses
// AsyncStorage, so clearing the entire store would make auth restoration
// unreliable and could affect other libraries in the app.
const GLOBAL_APP_KEYS = [
	STORAGE_KEYS.activeProfileId,
	STORAGE_KEYS.gpaViewMode,
	STORAGE_KEYS.accountDeleting,
	STORAGE_KEYS.launchUser,
	STORAGE_KEYS.notificationSettings,
	STORAGE_KEYS.umsLastSync,
] as const;

const APP_KEY_PREFIXES = [
	`${STORAGE_KEYS.gpaCache}:`,
	`${STORAGE_KEYS.umsLocalData}_`,
	`${STORAGE_KEYS.umsMessagesLastSeen}_`,
] as const;

/**
 * Removes all local account/session data while leaving Firebase Auth's own
 * persistence keys alone. The disabled launch marker prevents an older cache
 * from being used before the next account explicitly signs in.
 */
export async function clearLocalSessionData(): Promise<void> {
	// Set the guard first so an already-mounted provider cannot write a cache
	// again while logout is removing account-scoped storage.
	disableGpaCacheWrites();
	await AsyncStorage.setItem(STORAGE_KEYS.launchUserDisabled, "1").catch(() => {});
	const keysToRemove = new Set<string>(GLOBAL_APP_KEYS);
	const cacheUids = new Set<string>();

	try {
		const allKeys = await AsyncStorage.getAllKeys();
		allKeys
			.filter((key) => key.startsWith(`${STORAGE_KEYS.gpaCache}:`))
			.forEach((key) => cacheUids.add(key.slice(`${STORAGE_KEYS.gpaCache}:`.length)));
		allKeys
			.filter((key) => APP_KEY_PREFIXES.some((prefix) => key.startsWith(prefix)) && !key.startsWith(`${STORAGE_KEYS.gpaCache}:`))
			.forEach((key) => keysToRemove.add(key));
	} catch {
		// The known keys below are still removed if enumerating storage fails.
	}

	// `removeItem` is the stable API across all supported AsyncStorage
	// implementations. Removing in parallel also keeps logout fast without
	// depending on the optional `multiRemove` type surface.
	await Promise.all([...keysToRemove].map((key) => AsyncStorage.removeItem(key))).catch(() => {});
	await Promise.all([...cacheUids].map((uid) => clearGpaCache(uid)));
}
