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
import {
	doc,
	setDoc,
	arrayUnion,
	arrayRemove,
	serverTimestamp,
} from "firebase/firestore";
import { db } from "@/firebase/config";

/** Gets the raw FCM device push token (Android only). */
async function getDevicePushToken(): Promise<string | null> {
	if (Platform.OS !== "android") return null;

	try {
		const { granted } = await Notifications.getPermissionsAsync();
		if (!granted) {
			const { granted: newGrant } = await Notifications.requestPermissionsAsync();
			if (!newGrant) return null;
		}

		const tokenData = await Notifications.getDevicePushTokenAsync();
		return tokenData.data ?? null;
	} catch (error) {
		console.warn("[FCM] Failed to get device push token:", error);
		return null;
	}
}

/**
 * Registers the device FCM token in Firestore under the user's account.
 * Safe to call on every login — it upserts, not duplicates.
 *
 * @param uid  Firebase Auth user UID
 * @param groupKey  Optional batchmate room group key (e.g. "2024_P132")
 */
export async function registerFcmToken(uid: string, groupKey?: string | null): Promise<void> {
	if (Platform.OS !== "android") return;

	try {
		const token = await getDevicePushToken();
		if (!token) return;

		const userRef = doc(db, "users", uid);
		const data: Record<string, unknown> = {
			fcmTokens: arrayUnion(token),
			updatedAt: serverTimestamp(),
		};
		if (groupKey !== undefined) {
			data.currentGroupKey = groupKey ?? null;
		}
		
		await setDoc(userRef, data, { merge: true });
	} catch (error) {
		// Token registration is best-effort — never block login flow.
		console.warn("[FCM] Failed to register token:", error);
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
		const token = await getDevicePushToken();
		if (!token) return;

		const userRef = doc(db, "users", uid);
		await setDoc(userRef, { fcmTokens: arrayRemove(token) }, { merge: true });
	} catch (error) {
		// Unregistration is best-effort — never block logout.
		console.warn("[FCM] Failed to unregister token:", error);
	}
}
