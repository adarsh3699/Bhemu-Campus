import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "@bhemu/shared";

const NOTIFICATION_SETTINGS_KEY = STORAGE_KEYS.notificationSettings;
const NOTIFICATION_SETTINGS_VERSION = 3;

export const REMINDER_MINUTES = [5, 10, 15, 20, 30] as const;
export const EXAM_DAYS_BEFORE = [1, 2, 3] as const;
export const EXAM_REMINDER_HOURS = [6, 8, 10, 12, 18] as const;

export type NotificationSettings = {
	enabled: boolean;
	chatEnabled: boolean;
	batchmateAllMessages: boolean;
	timetableEnabled: boolean;
	examEnabled: boolean;
	firstClassMinutes: (typeof REMINDER_MINUTES)[number];
	otherClassMinutes: (typeof REMINDER_MINUTES)[number];
	examDaysBefore: (typeof EXAM_DAYS_BEFORE)[number];
	examReminderHour: (typeof EXAM_REMINDER_HOURS)[number];
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
	enabled: true,
	chatEnabled: true,
	batchmateAllMessages: true,
	timetableEnabled: true,
	examEnabled: false,
	firstClassMinutes: 15,
	otherClassMinutes: 10,
	examDaysBefore: 1,
	examReminderHour: 8,
};

type NotificationSettingsListener = (settings: NotificationSettings) => void;
const listeners = new Set<NotificationSettingsListener>();

function isAllowedNumber<T extends readonly number[]>(value: unknown, values: T): value is T[number] {
	return typeof value === "number" && values.includes(value as T[number]);
}

function parseSettings(raw: string | null): NotificationSettings {
	if (!raw) return DEFAULT_NOTIFICATION_SETTINGS;

	try {
		const parsed = JSON.parse(raw) as Partial<NotificationSettings> & { version?: number };
		const shouldEnableLegacyBatchmateNotifications =
			parsed.version !== NOTIFICATION_SETTINGS_VERSION && parsed.batchmateAllMessages === false;
		const shouldDisableLegacyExamNotifications = parsed.version !== NOTIFICATION_SETTINGS_VERSION;
		return {
			enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : DEFAULT_NOTIFICATION_SETTINGS.enabled,
			chatEnabled: typeof parsed.chatEnabled === "boolean" ? parsed.chatEnabled : DEFAULT_NOTIFICATION_SETTINGS.chatEnabled,
			batchmateAllMessages:
				shouldEnableLegacyBatchmateNotifications
					? true
					: typeof parsed.batchmateAllMessages === "boolean"
					? parsed.batchmateAllMessages
					: DEFAULT_NOTIFICATION_SETTINGS.batchmateAllMessages,
			timetableEnabled:
				typeof parsed.timetableEnabled === "boolean"
					? parsed.timetableEnabled
					: DEFAULT_NOTIFICATION_SETTINGS.timetableEnabled,
			examEnabled: shouldDisableLegacyExamNotifications
				? false
				: typeof parsed.examEnabled === "boolean"
					? parsed.examEnabled
					: DEFAULT_NOTIFICATION_SETTINGS.examEnabled,
			firstClassMinutes: isAllowedNumber(parsed.firstClassMinutes, REMINDER_MINUTES)
				? parsed.firstClassMinutes
				: DEFAULT_NOTIFICATION_SETTINGS.firstClassMinutes,
			otherClassMinutes: isAllowedNumber(parsed.otherClassMinutes, REMINDER_MINUTES)
				? parsed.otherClassMinutes
				: DEFAULT_NOTIFICATION_SETTINGS.otherClassMinutes,
			examDaysBefore: isAllowedNumber(parsed.examDaysBefore, EXAM_DAYS_BEFORE)
				? parsed.examDaysBefore
				: DEFAULT_NOTIFICATION_SETTINGS.examDaysBefore,
			examReminderHour: isAllowedNumber(parsed.examReminderHour, EXAM_REMINDER_HOURS)
				? parsed.examReminderHour
				: DEFAULT_NOTIFICATION_SETTINGS.examReminderHour,
		};
	} catch {
		return DEFAULT_NOTIFICATION_SETTINGS;
	}
}

export function subscribeToNotificationSettings(listener: NotificationSettingsListener): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
	try {
		const raw = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
		const settings = parseSettings(raw);
		if (raw) {
			try {
				const parsed = JSON.parse(raw) as { version?: number };
				if (parsed.version !== NOTIFICATION_SETTINGS_VERSION) {
					await AsyncStorage.setItem(
						NOTIFICATION_SETTINGS_KEY,
						JSON.stringify({ ...settings, version: NOTIFICATION_SETTINGS_VERSION }),
					);
				}
			} catch {
				// Invalid legacy storage is handled by parseSettings defaults.
			}
		}
		return settings;
	} catch {
		return DEFAULT_NOTIFICATION_SETTINGS;
	}
}

export async function saveNotificationSettings(settings: NotificationSettings): Promise<void> {
	try {
		await AsyncStorage.setItem(
			NOTIFICATION_SETTINGS_KEY,
			JSON.stringify({ ...settings, version: NOTIFICATION_SETTINGS_VERSION }),
		);
		listeners.forEach((listener) => listener(settings));
	} catch {
		// Keep notification preferences usable even if local persistence fails.
	}
}
