// ============================================================
// bCampus Mobile — FCM Token Service
// ============================================================
// Registers / unregisters the Android FCM push token in Firestore
// so the chat-worker can target this device for push notifications.
//
// Firestore path: users/{uid}
// Updated fields: { fcmTokens: string[], currentGroupKey: string | null }
//
// currentGroupKey is stored directly on the user doc so the worker can 
// target batchmate-room notifications only to students with the matching groupKey.

import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
	doc,
	setDoc,
	arrayUnion,
	arrayRemove,
	serverTimestamp,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { ensureNotificationChannels } from "./notificationChannels";

const DEVICE_TOKEN_CACHE_KEY = "@bcampus/fcm-device-token";

export type FcmRegistrationResult =
	| { status: "unsupported" }
	| { status: "permission-denied" }
	| { status: "registered" }
	| { status: "failed"; error: string };

let cachedDeviceToken: string | null = null;
const pendingRegistrations = new Map<string, Promise<FcmRegistrationResult>>();

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

async function cacheDeviceToken(token: string): Promise<void> {
	cachedDeviceToken = token;
	try {
		await AsyncStorage.setItem(DEVICE_TOKEN_CACHE_KEY, token);
	} catch (error) {
		// The Firestore registration is still authoritative if local caching fails.
		console.warn("[FCM] Failed to cache device token:", error);
	}
}

async function getCachedDeviceToken(): Promise<string | null> {
	if (cachedDeviceToken) return cachedDeviceToken;
	try {
		const token = await AsyncStorage.getItem(DEVICE_TOKEN_CACHE_KEY);
		if (token) cachedDeviceToken = token;
		return token;
	} catch (error) {
		console.warn("[FCM] Failed to read cached device token:", error);
		return null;
	}
}

/** Gets the raw FCM device push token (Android only). */
async function getDevicePushToken(requestPermission: boolean): Promise<string | null> {
	if (Platform.OS !== "android") return null;

	// Expo requires the Android channel to exist before requesting the native
	// FCM token. This is especially important on a fresh install.
	await ensureNotificationChannels();
	const current = await Notifications.getPermissionsAsync();
	if (!current.granted) {
		if (!requestPermission || !current.canAskAgain) return null;
		const requested = await Notifications.requestPermissionsAsync();
		if (!requested.granted) return null;
	}

	const tokenData = await Notifications.getDevicePushTokenAsync();
	const token = typeof tokenData.data === "string" ? tokenData.data.trim() : "";
	if (!token) return null;
	await cacheDeviceToken(token);
	return token;
}

async function storeFcmToken(
	uid: string,
	token: string,
	groupKey?: string | null,
	previousToken?: string | null,
): Promise<void> {
	const userRef = doc(db, "users", uid);
	const data: Record<string, unknown> = {
		fcmTokens: arrayUnion(token),
		updatedAt: serverTimestamp(),
	};
	if (groupKey !== undefined) data.currentGroupKey = groupKey ?? null;
	await setDoc(userRef, data, { merge: true });
	if (previousToken && previousToken !== token) {
		await setDoc(userRef, { fcmTokens: arrayRemove(previousToken) }, { merge: true });
	}
}

/**
 * Registers the device FCM token in Firestore under the user's account.
 * Safe to call on every login — it upserts, not duplicates.
 *
 * @param uid  Firebase Auth user UID
 * @param groupKey  Optional batchmate room group key (e.g. "2024_P132")
 */
export async function registerFcmToken(uid: string, groupKey?: string | null): Promise<FcmRegistrationResult> {
	if (Platform.OS !== "android") return { status: "unsupported" };

	const pending = pendingRegistrations.get(uid);
	if (pending) return pending;

	const registration = (async (): Promise<FcmRegistrationResult> => {
		try {
			const previousToken = await getCachedDeviceToken();
			const token = await getDevicePushToken(true);
			if (!token) {
				console.warn("[FCM] Registration skipped because notification permission is not granted.");
				return { status: "permission-denied" };
			}
			await storeFcmToken(uid, token, groupKey, previousToken);
			return { status: "registered" };
		} catch (error) {
			const message = errorMessage(error);
			console.warn("[FCM] Failed to register token:", message);
			return { status: "failed", error: message };
		}
	})();

	pendingRegistrations.set(uid, registration);
	void registration.finally(() => {
		if (pendingRegistrations.get(uid) === registration) pendingRegistrations.delete(uid);
	});
	return registration;
}

/** Keep Firestore in sync when Android rotates the native FCM token. */
export function subscribeToFcmToken(uid: string, groupKey?: string | null): () => void {
	if (Platform.OS !== "android") return () => {};

	try {
		const subscription = Notifications.addPushTokenListener((token) => {
			const nextToken = typeof token.data === "string" ? token.data.trim() : "";
			if (!nextToken) return;
			const previousToken = cachedDeviceToken;
			void cacheDeviceToken(nextToken)
				.then(() => storeFcmToken(uid, nextToken, groupKey, previousToken))
				.catch((error) => {
					console.warn("[FCM] Failed to persist rotated device token:", errorMessage(error));
				});
		});
		return () => subscription.remove();
	} catch (error) {
		console.warn("[FCM] Failed to subscribe to device token updates:", error);
		return () => {};
	}
}

/**
 * Updates the groupKey on the stored FCM token.
 * Called when the user switches their active profile (and thus groupKey changes).
 *
 * @param uid  Firebase Auth user UID
 * @param groupKey  New group key, or null if profile has none
 */
export async function updateFcmTokenGroupKey(uid: string, groupKey: string | null): Promise<void> {
	if (Platform.OS !== "android") return;

	try {
		const userRef = doc(db, "users", uid);
		await setDoc(
			userRef,
			{ currentGroupKey: groupKey ?? null, updatedAt: serverTimestamp() },
			{ merge: true },
		);
	} catch (error) {
		console.warn("[FCM] Failed to update token groupKey:", error);
	}
}

/**
 * Removes THIS DEVICE'S FCM token for this user.
 * Called on logout so this device stops receiving push notifications.
 *
 * @param uid  Firebase Auth user UID
 */
export async function unregisterFcmToken(uid: string): Promise<void> {
	if (Platform.OS !== "android") return;

	try {
		// Never request permission while disabling notifications or logging out.
		// Use the cached token first; the native lookup is only a no-prompt fallback
		// for installs that predate the local token cache.
		const token = (await getCachedDeviceToken()) ?? (await getDevicePushToken(false));
		if (!token) return;

		const userRef = doc(db, "users", uid);
		await setDoc(userRef, { fcmTokens: arrayRemove(token) }, { merge: true });
	} catch (error) {
		// Unregistration is best-effort — never block logout.
		console.warn("[FCM] Failed to unregister token:", errorMessage(error));
	}
}
