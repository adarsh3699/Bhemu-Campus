import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import {
	DEFAULT_NOTIFICATION_SETTINGS,
	getNotificationSettings,
	saveNotificationSettings,
	subscribeToNotificationSettings,
	type NotificationSettings,
} from "./notificationSettings";

export type NotificationPermissionStatus = "unknown" | "granted" | "undetermined" | "denied" | "unavailable";

export function useNotificationSettings() {
	const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
	const [loading, setLoading] = useState(true);
	const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>("unknown");
	const settingsRef = useRef(settings);

	const refreshPermission = useCallback(async () => {
		if (Platform.OS === "web") {
			setPermissionStatus("unavailable");
			return;
		}

		try {
			const permission = await Notifications.getPermissionsAsync();
			if (permission.granted || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
				setPermissionStatus("granted");
			} else if (permission.status === Notifications.PermissionStatus.UNDETERMINED) {
				setPermissionStatus("undetermined");
			} else {
				setPermissionStatus("denied");
			}
		} catch {
			// Older clients without the native notifications module keep the app preference visible.
			setPermissionStatus("unknown");
		}
	}, []);

	useEffect(() => {
		let cancelled = false;
		const unsubscribe = subscribeToNotificationSettings((next) => {
			settingsRef.current = next;
			if (!cancelled) setSettings(next);
		});

		getNotificationSettings()
			.then((saved) => {
				settingsRef.current = saved;
				if (!cancelled) setSettings(saved);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
			unsubscribe();
		};
	}, []);

	useEffect(() => {
		void refreshPermission();
		const subscription = AppState.addEventListener("change", (state) => {
			if (state === "active") void refreshPermission();
		});
		return () => subscription.remove();
	}, [refreshPermission]);

	const updateSettings = useCallback(async (patch: Partial<NotificationSettings>) => {
		const next = { ...settingsRef.current, ...patch };
		settingsRef.current = next;
		setSettings(next);
		await saveNotificationSettings(next);
	}, []);

	return { settings, loading, permissionStatus, updateSettings };
}
