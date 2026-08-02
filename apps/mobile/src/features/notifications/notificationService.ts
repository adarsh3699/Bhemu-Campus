import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { TimetableEntry, UMSLocalData, UMSSeatingPlan } from "@bhemu/shared";
import type { NotificationSettings } from "./notificationSettings";

const CHANNEL_ID = "academic-reminders";
const MANAGED_SOURCE = "bcampus-academic-reminder";

export type NotificationProfileData = {
	profileId: string | number;
	profileName: string;
	data: UMSLocalData | null;
};

const DAY_TO_WEEKDAY: Record<string, number> = {
	Sunday: 1,
	Monday: 2,
	Tuesday: 3,
	Wednesday: 4,
	Thursday: 5,
	Friday: 6,
	Saturday: 7,
};

const MONTHS: Record<string, number> = {
	jan: 1,
	feb: 2,
	mar: 3,
	apr: 4,
	may: 5,
	jun: 6,
	jul: 7,
	aug: 8,
	sep: 9,
	oct: 10,
	nov: 11,
	dec: 12,
};

let configured = false;
let scheduleQueue = Promise.resolve();

export function configureNotifications(): void {
	if (configured) return;
	configured = true;

	Notifications.setNotificationHandler({
		handleNotification: async () => ({
			shouldShowBanner: true,
			shouldShowList: true,
			shouldPlaySound: true,
			shouldSetBadge: false,
		}),
	});
}

export function parseTimeToMinutes(value: string): number | null {
	const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
	if (!match) return null;

	let hours = Number(match[1]);
	const minutes = Number(match[2]);
	const meridiem = match[3]?.toUpperCase();
	if (minutes > 59) return null;

	if (meridiem) {
		if (hours < 1 || hours > 12) return null;
		hours = hours % 12 + (meridiem === "PM" ? 12 : 0);
	} else if (hours > 23) {
		return null;
	}

	return hours * 60 + minutes;
}

function parseExamDate(value: string): { year: number; month: number; day: number } | null {
	const parts = value
		.trim()
		.replace(/,/g, " ")
		.replace(/[/-]/g, " ")
		.split(/\s+/)
		.filter(Boolean);
	if (parts.length < 3) return null;

	let year: number;
	let month: number;
	let day: number;
	if (/^\d{4}$/.test(parts[0])) {
		year = Number(parts[0]);
		month = parseMonth(parts[1]);
		day = Number(parts[2]);
	} else {
		year = Number(parts[2]);
		if (!/^\d{4}$/.test(parts[2])) return null;
		if (/^\d+$/.test(parts[1])) {
			day = Number(parts[0]);
			month = Number(parts[1]);
		} else {
			month = parseMonth(parts[0]);
			day = Number(parts[1]);
		}
	}

	if (!year || !month || !day) return null;
	const date = new Date(year, month - 1, day);
	if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
	return { year, month, day };
}

function parseMonth(value: string): number {
	if (/^\d+$/.test(value)) return Number(value);
	return MONTHS[value.slice(0, 3).toLowerCase()] ?? 0;
}

function getReminderTime(
	entry: TimetableEntry,
	minutesBefore: number
): { weekday: number; hour: number; minute: number } | null {
	const startMinutes = parseTimeToMinutes(entry.startTime);
	const weekday = DAY_TO_WEEKDAY[entry.dayOfWeek.trim()];
	if (startMinutes === null || !weekday) return null;

	const reminderMinutes = startMinutes - minutesBefore;
	const adjustedMinutes = reminderMinutes >= 0 ? reminderMinutes : reminderMinutes + 24 * 60;
	return {
		weekday: reminderMinutes >= 0 ? weekday : weekday === 1 ? 7 : weekday - 1,
		hour: Math.floor(adjustedMinutes / 60),
		minute: adjustedMinutes % 60,
	};
}

function buildTimetableEntries(timetable: TimetableEntry[]): Array<{ entry: TimetableEntry; reminderIndex: number }> {
	const byDay = new Map<string, TimetableEntry[]>();
	for (const entry of timetable) {
		const entries = byDay.get(entry.dayOfWeek) ?? [];
		entries.push(entry);
		byDay.set(entry.dayOfWeek, entries);
	}

	return [...byDay.values()].flatMap((entries) => {
		entries.sort((a, b) => (parseTimeToMinutes(a.startTime) ?? Number.MAX_SAFE_INTEGER) - (parseTimeToMinutes(b.startTime) ?? Number.MAX_SAFE_INTEGER));
		return entries
			.filter((entry) => parseTimeToMinutes(entry.startTime) !== null)
			.map((entry, index) => ({ entry, reminderIndex: index }));
	});
}

function getExamReminderDate(examDate: string, daysBefore: number, hour: number): Date | null {
	const parsed = parseExamDate(examDate);
	if (!parsed) return null;

	const reminderDate = new Date(parsed.year, parsed.month - 1, parsed.day, hour, 0, 0, 0);
	reminderDate.setDate(reminderDate.getDate() - daysBefore);
	return reminderDate > new Date() ? reminderDate : null;
}

function isManagedRequest(request: Notifications.NotificationRequest): boolean {
	const source = request.content.data?.source;
	return source === MANAGED_SOURCE;
}

async function ensureNotificationPermission(allowPrompt = true): Promise<boolean> {
	if (Platform.OS === "web") return false;

	if (Platform.OS === "android") {
		await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
			name: "Academic reminders",
			importance: Notifications.AndroidImportance.HIGH,
			vibrationPattern: [0, 250, 250, 250],
		});
	}

	const current = await Notifications.getPermissionsAsync();
	if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
		return true;
	}
	if (!allowPrompt) return false;
	if (!current.canAskAgain) return false;

	const requested = await Notifications.requestPermissionsAsync({
		ios: { allowAlert: true, allowBadge: false, allowSound: true },
		android: {},
	});
	return requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

/** Send an immediate local notification so users can verify device permissions. */
export async function sendTestNotification(profileName = "Current profile"): Promise<boolean> {
	configureNotifications();
	if (!(await ensureNotificationPermission(true))) return false;
	const displayProfileName = profileName.trim() || "Current profile";

	try {
		await Notifications.scheduleNotificationAsync({
			content: {
				subtitle: displayProfileName,
				title: "Test notification",
				body: "Notifications are working correctly on this device.",
				data: { source: MANAGED_SOURCE, type: "test", profileName: displayProfileName },
			},
			trigger: null,
		});
		return true;
	} catch (error) {
		console.warn("Unable to send test notification", error);
		return false;
	}
}

async function cancelManagedNotifications(): Promise<void> {
	const scheduled = await Notifications.getAllScheduledNotificationsAsync();
	const cancellations = await Promise.allSettled(
		scheduled.filter(isManagedRequest).map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier))
	);
	if (cancellations.some((result) => result.status === "rejected")) {
		console.warn("Some old academic notifications could not be cancelled");
	}
}

/** Cancel reminders that belong to this app when the local session ends. */
export function clearManagedNotifications(): Promise<void> {
	scheduleQueue = scheduleQueue
		.then(() => cancelManagedNotifications())
		.catch((error) => {
			console.warn("Unable to clear academic notifications", error);
		});
	return scheduleQueue;
}

async function scheduleTimetableNotifications(
	timetable: TimetableEntry[],
	settings: NotificationSettings,
	profileName: string,
	profileId: string | number
): Promise<void> {
	const schedules = buildTimetableEntries(timetable).map(async ({ entry, reminderIndex }) => {
		const minutesBefore = reminderIndex === 0 ? settings.firstClassMinutes : settings.otherClassMinutes;
		const reminderTime = getReminderTime(entry, minutesBefore);
		if (!reminderTime) return;

		try {
			await Notifications.scheduleNotificationAsync({
				content: {
					subtitle: profileName,
					title: `Class in ${minutesBefore} minutes`,
					body: `${entry.courseCode} starts at ${entry.startTime}${entry.room ? ` • Room ${entry.room}` : ""}`,
					data: {
						source: MANAGED_SOURCE,
						type: "timetable",
						profileId: String(profileId),
						profileName,
						courseCode: entry.courseCode,
					},
				},
				trigger:
					Platform.OS === "android"
						? {
								type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
								weekday: reminderTime.weekday,
								hour: reminderTime.hour,
								minute: reminderTime.minute,
								channelId: CHANNEL_ID,
							}
						: {
								type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
								weekday: reminderTime.weekday,
								hour: reminderTime.hour,
								minute: reminderTime.minute,
								repeats: true,
							},
			});
		} catch (error) {
			console.warn(`Unable to schedule reminder for ${entry.courseCode}`, error);
		}
	});
	await Promise.all(schedules);
}

async function scheduleExamNotifications(
	seatingPlan: UMSSeatingPlan[],
	settings: NotificationSettings,
	profileName: string,
	profileId: string | number
): Promise<void> {
	const scheduledExams = new Set<string>();
	const schedules = seatingPlan.map(async (exam) => {
		const reminderDate = getExamReminderDate(exam.ExamDate, settings.examDaysBefore, settings.examReminderHour);
		const examKey = `${exam.CourseCode}-${exam.ExamDate}-${exam.ExamType}`;
		if (!reminderDate || scheduledExams.has(examKey)) return;
		scheduledExams.add(examKey);

		try {
			await Notifications.scheduleNotificationAsync({
				content: {
					subtitle: profileName,
					title: `Exam in ${settings.examDaysBefore} day${settings.examDaysBefore === 1 ? "" : "s"}`,
					body: `${exam.CourseCode}${exam.CourseName ? ` — ${exam.CourseName}` : ""}${exam.Room ? ` • Room ${exam.Room}` : ""}`,
					data: {
						source: MANAGED_SOURCE,
						type: "exam",
						profileId: String(profileId),
						profileName,
						courseCode: exam.CourseCode,
					},
				},
				trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminderDate, channelId: CHANNEL_ID },
			});
		} catch (error) {
			console.warn(`Unable to schedule exam reminder for ${exam.CourseCode}`, error);
		}
	});
	await Promise.all(schedules);
}

async function scheduleLatestNotifications(
	activeProfile: NotificationProfileData | null,
	allProfiles: NotificationProfileData[],
	settings: NotificationSettings,
	allowPermissionPrompt: boolean
): Promise<void> {
	configureNotifications();
	await cancelManagedNotifications();
	if (!settings.enabled) return;
	if (!settings.timetableEnabled && !settings.examEnabled) return;
	if (!(await ensureNotificationPermission(allowPermissionPrompt))) return;

	// Timetable reminders intentionally follow only the currently selected
	// profile. Exam reminders are scheduled for every available profile below.
	if (settings.timetableEnabled && activeProfile?.data) {
		await scheduleTimetableNotifications(
			activeProfile.data.timetable,
			settings,
			activeProfile.profileName,
			activeProfile.profileId
		);
	}

	if (settings.examEnabled) {
		await Promise.all(
			allProfiles
				.filter((profile): profile is NotificationProfileData & { data: UMSLocalData } => profile.data !== null)
				.map((profile) =>
					scheduleExamNotifications(profile.data.seatingPlan, settings, profile.profileName, profile.profileId)
				)
		);
	}
}

export function rescheduleUmsNotifications(
	activeProfile: NotificationProfileData | null,
	allProfiles: NotificationProfileData[],
	settings: NotificationSettings,
	allowPermissionPrompt = true
): Promise<void> {
	scheduleQueue = scheduleQueue
		.then(() => scheduleLatestNotifications(activeProfile, allProfiles, settings, allowPermissionPrompt))
		.catch((error) => {
			console.warn("Unable to schedule academic notifications", error);
		});
	return scheduleQueue;
}
