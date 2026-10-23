import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const ACADEMIC_CHANNEL_ID = "academic-reminders";
export const CHAT_CHANNEL_ID = "chat-messages";

/** Android channels must exist before an FCM notification references them. */
export async function ensureNotificationChannels(): Promise<void> {
	if (Platform.OS !== "android") return;

	const results = await Promise.allSettled([
		Notifications.setNotificationChannelAsync(ACADEMIC_CHANNEL_ID, {
			name: "Academic reminders",
			importance: Notifications.AndroidImportance.HIGH,
			vibrationPattern: [0, 250, 250, 250],
		}),
		Notifications.setNotificationChannelAsync(CHAT_CHANNEL_ID, {
			name: "Chat Notifications",
			importance: Notifications.AndroidImportance.HIGH,
			vibrationPattern: [0, 250, 250, 250],
		}),
	]);

	if (results.some((result) => result.status === "rejected")) {
		console.warn("Unable to configure one or more notification channels");
	}
}
