import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "@bhemu/shared";

const NOTIFICATION_SETTINGS_KEY = STORAGE_KEYS.notificationSettings;

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
	batchmateAllMessages: false,
	timetableEnabled: true,
	examEnabled: true,
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
		const parsed = JSON.parse(raw) as Partial<NotificationSettings>;
		return {
			enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : DEFAULT_NOTIFICATION_SETTINGS.enabled,
			chatEnabled: typeof parsed.chatEnabled === "boolean" ? parsed.chatEnabled : DEFAULT_NOTIFICATION_SETTINGS.chatEnabled,
			batchmateAllMessages: typeof parsed.batchmateAllMessages === "boolean" ? parsed.batchmateAllMessages : DEFAULT_NOTIFICATION_SETTINGS.batchmateAllMessages,
			timetableEnabled:
				typeof parsed.timetableEnabled === "boolean"
					? parsed.timetableEnabled
					: DEFAULT_NOTIFICATION_SETTINGS.timetableEnabled,
			examEnabled:
				typeof parsed.examEnabled === "boolean" ? parsed.examEnabled : DEFAULT_NOTIFICATION_SETTINGS.examEnabled,
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
		return parseSettings(await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY));
	} catch {
		return DEFAULT_NOTIFICATION_SETTINGS;
	}
}

export async function saveNotificationSettings(settings: NotificationSettings): Promise<void> {
	try {
		await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
		listeners.forEach((listener) => listener(settings));
	} catch {
		// Keep notification preferences usable even if local persistence fails.
	}
}
