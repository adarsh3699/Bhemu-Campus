import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { TimetableEntry, UMSLocalData, UMSSeatingPlan } from "@bhemu/shared";

const CHANNEL_ID = "academic-reminders";
const MANAGED_SOURCE = "bcampus-academic-reminder";
const EXAM_REMINDER_HOUR = 8;

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

function getReminderTime(entry: TimetableEntry, index: number): { weekday: number; hour: number; minute: number } | null {
	const startMinutes = parseTimeToMinutes(entry.startTime);
	const weekday = DAY_TO_WEEKDAY[entry.dayOfWeek.trim()];
	if (startMinutes === null || !weekday) return null;

	const reminderMinutes = startMinutes - (index === 0 ? 15 : 10);
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

function getExamReminderDate(examDate: string): Date | null {
	const parsed = parseExamDate(examDate);
	if (!parsed) return null;

	const reminderDate = new Date(parsed.year, parsed.month - 1, parsed.day, EXAM_REMINDER_HOUR, 0, 0, 0);
	reminderDate.setDate(reminderDate.getDate() - 1);
	return reminderDate > new Date() ? reminderDate : null;
}

function isManagedRequest(request: Notifications.NotificationRequest): boolean {
	const source = request.content.data?.source;
	return source === MANAGED_SOURCE;
}

async function ensureNotificationPermission(): Promise<boolean> {
	if (Platform.OS === "web") return false;

	if (Platform.OS === "android") {
		await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
			name: "Academic reminders",
			importance: Notifications.AndroidImportance.HIGH,
			sound: "default",
			vibrationPattern: [0, 250, 250, 250],
		});
	}

	const current = await Notifications.getPermissionsAsync();
	if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
		return true;
	}

	const requested = await Notifications.requestPermissionsAsync({
		ios: { allowAlert: true, allowBadge: false, allowSound: true },
		android: {},
	});
	return requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
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

async function scheduleTimetableNotifications(timetable: TimetableEntry[]): Promise<void> {
	for (const { entry, reminderIndex } of buildTimetableEntries(timetable)) {
		const reminderTime = getReminderTime(entry, reminderIndex);
		if (!reminderTime) continue;

		const minutesBefore = reminderIndex === 0 ? 15 : 10;
		try {
			await Notifications.scheduleNotificationAsync({
				content: {
					title: `Class in ${minutesBefore} minutes`,
					body: `${entry.courseCode} starts at ${entry.startTime}${entry.room ? ` • Room ${entry.room}` : ""}`,
					sound: "default",
					data: { source: MANAGED_SOURCE, type: "timetable", courseCode: entry.courseCode },
				},
				trigger: {
					type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
					weekday: reminderTime.weekday,
					hour: reminderTime.hour,
					minute: reminderTime.minute,
					repeats: true,
					channelId: CHANNEL_ID,
				},
			});
		} catch (error) {
			console.warn(`Unable to schedule reminder for ${entry.courseCode}`, error);
		}
	}
}

async function scheduleExamNotifications(seatingPlan: UMSSeatingPlan[]): Promise<void> {
	const scheduledExams = new Set<string>();
	for (const exam of seatingPlan) {
		const reminderDate = getExamReminderDate(exam.ExamDate);
		const examKey = `${exam.CourseCode}-${exam.ExamDate}-${exam.ExamType}`;
		if (!reminderDate || scheduledExams.has(examKey)) continue;
		scheduledExams.add(examKey);

		try {
			await Notifications.scheduleNotificationAsync({
				content: {
					title: "Exam tomorrow",
					body: `${exam.CourseCode}${exam.CourseName ? ` — ${exam.CourseName}` : ""}${exam.Room ? ` • Room ${exam.Room}` : ""}`,
					sound: "default",
					data: { source: MANAGED_SOURCE, type: "exam", courseCode: exam.CourseCode },
				},
				trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminderDate, channelId: CHANNEL_ID },
			});
		} catch (error) {
			console.warn(`Unable to schedule exam reminder for ${exam.CourseCode}`, error);
		}
	}
}

async function scheduleLatestNotifications(data: UMSLocalData | null): Promise<void> {
	configureNotifications();
	await cancelManagedNotifications();
	if (!data) return;
	if (!(await ensureNotificationPermission())) return;

	await scheduleTimetableNotifications(data.timetable);
	await scheduleExamNotifications(data.seatingPlan);
}

export function rescheduleUmsNotifications(data: UMSLocalData | null): Promise<void> {
	scheduleQueue = scheduleQueue.then(() => scheduleLatestNotifications(data)).catch((error) => {
		console.warn("Unable to schedule academic notifications", error);
	});
	return scheduleQueue;
}
