import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { type TimetableEntry, type UMSLocalData, type UMSSeatingPlan, parseTimeMinutes, formatTimeToAmPm } from "@bhemu/shared";
import type { NotificationSettings } from "./notificationSettings";
import { activeChatRoomIdRef, isChatOpenRef } from "@/contexts/ChatContext";
import { ACADEMIC_CHANNEL_ID as CHANNEL_ID, ensureNotificationChannels } from "./notificationChannels";

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

const DAY_ALIASES: Record<string, string> = {
	sun: "Sunday",
	sunday: "Sunday",
	mon: "Monday",
	monday: "Monday",
	tue: "Tuesday",
	tues: "Tuesday",
	tuesday: "Tuesday",
	wed: "Wednesday",
	wednesday: "Wednesday",
	thu: "Thursday",
	thur: "Thursday",
	thurs: "Thursday",
	thursday: "Thursday",
	fri: "Friday",
	friday: "Friday",
	sat: "Saturday",
	saturday: "Saturday",
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
let scheduleGeneration = 0;

export function configureNotifications(): void {
	if (configured) return;
	configured = true;
	void ensureNotificationChannels();

	Notifications.setNotificationHandler({
		handleNotification: async (notification) => {
			const data = notification.request.content.data ?? {};
			const isChatPush = data.source === "bcampus-chat";
			const chatIsOpen = isChatOpenRef.current;
			const chatRoomId = getDataString(data, "roomId");
			const shouldSuppress = isChatPush
				&& chatIsOpen
				&& chatRoomId !== null
				&& activeChatRoomIdRef.current === chatRoomId;

			return {
				shouldShowBanner: !shouldSuppress,
				shouldShowList: !shouldSuppress,
				shouldPlaySound: !shouldSuppress,
				shouldSetBadge: false,
			};
		},
	});
}

export type NotificationChatTarget = {
	roomId: string;
	messageId: string;
	roomType?: "UNIVERSITY" | "BATCHMATE";
};

export type NotificationDestination =
	| "/timetable"
	| "/seating-plan"
	| {
			pathname: "/(app)/(tabs)/chat";
			params?: Partial<NotificationChatTarget>;
		};

function getDataString(data: Record<string, unknown>, key: string): string | null {
	const value = data[key];
	return typeof value === "string" && value.length > 0 ? value : null;
}

function normalizeDay(value: string): string | null {
	const normalized = value.trim().toLowerCase().replace(/\.$/, "");
	return DAY_ALIASES[normalized] ?? null;
}

function getWeekday(value: string): number | null {
	const day = normalizeDay(value);
	return day ? DAY_TO_WEEKDAY[day] ?? null : null;
}

function getNotificationDestination(response: Notifications.NotificationResponse): NotificationDestination | null {
	if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return null;

	const content = response.notification.request.content;
	if (content.data?.source === "bcampus-chat") {
		const roomId = getDataString(content.data, "roomId");
		const messageId = getDataString(content.data, "messageId");
		const roomType = getDataString(content.data, "roomType");
		const params: Partial<NotificationChatTarget> = {
			...(roomId ? { roomId } : {}),
			...(messageId ? { messageId } : {}),
		};
		if (roomType === "UNIVERSITY" || roomType === "BATCHMATE") params.roomType = roomType;
		return {
			pathname: "/(app)/(tabs)/chat",
			params,
		};
	}
	if (content.data?.source !== MANAGED_SOURCE) return null;

	if (content.data.type === "timetable") return "/timetable";
	if (content.data.type === "exam") return "/seating-plan";
	return null;
}

/** Subscribe to navigation requests from managed academic reminders. */
export function subscribeToNotificationNavigation(onNavigate: (destination: NotificationDestination) => void): () => void {
	if (Platform.OS === "web") return () => {};

	try {
		const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
			const destination = getNotificationDestination(response);
			if (!destination) return;

			try {
				Notifications.clearLastNotificationResponse();
			} catch {
				// Clearing is best-effort; navigation can still proceed.
			}
			onNavigate(destination);
		});

		return () => subscription.remove();
	} catch {
		return () => {};
	}
}

/** Consume a cold-start notification tap exactly once. */
export function consumeLastNotificationNavigation(): NotificationDestination | null {
	if (Platform.OS === "web") return null;

	try {
		const response = Notifications.getLastNotificationResponse();
		if (!response) return null;
		const destination = getNotificationDestination(response);
		if (!destination) return null;
		Notifications.clearLastNotificationResponse();
		return destination;
	} catch {
		return null;
	}
}

type ReminderTime = { weekday: number; hour: number; minute: number };

export function getReminderTime(entry: TimetableEntry, minutesBefore: number): ReminderTime | null {
	if (!entry.dayOfWeek || !entry.startTime) return null;
	const weekday = getWeekday(entry.dayOfWeek);
	if (!weekday) return null;

	const entryMinutes = parseTimeMinutes(entry.startTime);
	if (entryMinutes === null) return null;

	let triggerMinutes = entryMinutes - minutesBefore;
	let adjustedWeekday = weekday;

	if (triggerMinutes < 0) {
		triggerMinutes += 24 * 60;
		adjustedWeekday = weekday === 1 ? 7 : weekday - 1;
	}

	return {
		weekday: adjustedWeekday,
		hour: Math.floor(triggerMinutes / 60),
		minute: triggerMinutes % 60,
	};
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

function buildTimetableEntries(timetable: TimetableEntry[]): Array<{ entry: TimetableEntry; reminderIndex: number }> {
	const byDay = new Map<string, TimetableEntry[]>();
	const seen = new Set<string>();
	for (const entry of timetable) {
		const weekday = getWeekday(entry.dayOfWeek);
		const startMinutes = parseTimeMinutes(entry.startTime);
		if (weekday === null || startMinutes === null) continue;

		// UMS can return duplicate rows for the same timetable slot. One course
		// at the same day/start time must produce only one reminder.
		const entryKey = [
			weekday,
			startMinutes,
			entry.courseCode,
		].map((value) => String(value ?? "").trim().toLowerCase()).join("|");
		if (seen.has(entryKey)) continue;
		seen.add(entryKey);

		const dayKey = normalizeDay(entry.dayOfWeek) ?? entry.dayOfWeek.trim();
		const entries = byDay.get(dayKey) ?? [];
		entries.push(entry);
		byDay.set(dayKey, entries);
	}

	return [...byDay.values()].flatMap((entries) => {
		entries.sort((a, b) => (parseTimeMinutes(a.startTime) ?? Number.MAX_SAFE_INTEGER) - (parseTimeMinutes(b.startTime) ?? Number.MAX_SAFE_INTEGER));
		return entries
			.filter((entry) => parseTimeMinutes(entry.startTime) !== null)
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
		await ensureNotificationChannels();
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
	let failed = 0;
	const cancellations = scheduled.filter(isManagedRequest).map((request) => async () => {
		try {
			await Notifications.cancelScheduledNotificationAsync(request.identifier);
		} catch {
			failed += 1;
		}
	});
	await runWithConcurrency(cancellations);
	if (failed > 0) {
		console.warn("Some old academic notifications could not be cancelled");
	}
}

const IOS_PENDING_NOTIFICATION_LIMIT = 64;
const NATIVE_NOTIFICATION_CONCURRENCY = 4;

async function runWithConcurrency(tasks: Array<() => Promise<void>>, concurrency = NATIVE_NOTIFICATION_CONCURRENCY): Promise<void> {
	if (tasks.length === 0) return;
	let nextTask = 0;
	const worker = async () => {
		while (nextTask < tasks.length) {
			const task = tasks[nextTask++];
			await task();
		}
	};
	await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker()));
}

type ScheduleBudget = {
	remaining: number;
	failed: number;
	skipped: number;
	scheduled: number;
};

function createScheduleBudget(remaining: number): ScheduleBudget {
	return { remaining, failed: 0, skipped: 0, scheduled: 0 };
}

async function getScheduleBudget(): Promise<ScheduleBudget> {
	if (Platform.OS !== "ios") return createScheduleBudget(Number.POSITIVE_INFINITY);

	const scheduled = await Notifications.getAllScheduledNotificationsAsync();
	const unmanagedCount = scheduled.filter((request) => !isManagedRequest(request)).length;
	return createScheduleBudget(Math.max(0, IOS_PENDING_NOTIFICATION_LIMIT - unmanagedCount));
}

function reserveScheduleSlot(budget: ScheduleBudget): boolean {
	if (budget.remaining <= 0) {
		budget.skipped += 1;
		return false;
	}
	if (Number.isFinite(budget.remaining)) budget.remaining -= 1;
	return true;
}

/** Cancel reminders that belong to this app when the local session ends. */
export function clearManagedNotifications(): Promise<void> {
	scheduleGeneration += 1;
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
	profileId: string | number,
	budget: ScheduleBudget,
	isCurrentRequest: () => boolean,
): Promise<void> {
	const schedules = buildTimetableEntries(timetable).map(({ entry, reminderIndex }) => async () => {
		if (!isCurrentRequest()) return;
		const minutesBefore = reminderIndex === 0 ? settings.firstClassMinutes : settings.otherClassMinutes;
		const reminderTime = getReminderTime(entry, minutesBefore);
		if (!reminderTime) return;
		if (!reserveScheduleSlot(budget)) return;

		try {
			await Notifications.scheduleNotificationAsync({
				content: {
					subtitle: profileName,
					title: `Class in ${minutesBefore} minutes`,
					body: `${entry.courseCode} starts at ${formatTimeToAmPm(entry.startTime)}${entry.room ? ` • Room ${entry.room}` : ""}`,
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
			budget.scheduled += 1;
		} catch (error) {
			budget.failed += 1;
			console.warn(`Unable to schedule reminder for ${entry.courseCode}`, error);
		}
	});
	await runWithConcurrency(schedules);
}

async function scheduleExamNotifications(
	seatingPlan: UMSSeatingPlan[],
	settings: NotificationSettings,
	profileName: string,
	profileId: string | number,
	budget: ScheduleBudget,
	isCurrentRequest: () => boolean,
): Promise<void> {
	const scheduledExams = new Set<string>();
	const schedules = seatingPlan
		.map((exam) => ({ exam, reminderDate: getExamReminderDate(exam.ExamDate, settings.examDaysBefore, settings.examReminderHour) }))
		.filter((item): item is { exam: UMSSeatingPlan; reminderDate: Date } => item.reminderDate !== null)
		.sort((a, b) => a.reminderDate.getTime() - b.reminderDate.getTime())
		.map(({ exam, reminderDate }) => async () => {
			if (!isCurrentRequest()) return;
			const examKey = `${exam.CourseCode}-${exam.ExamDate}-${exam.ExamType}`;
			if (scheduledExams.has(examKey)) return;
			scheduledExams.add(examKey);
			if (!reserveScheduleSlot(budget)) return;

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
				budget.scheduled += 1;
			} catch (error) {
				budget.failed += 1;
				console.warn(`Unable to schedule exam reminder for ${exam.CourseCode}`, error);
			}
		});
	await runWithConcurrency(schedules);
}

async function scheduleLatestNotifications(
	activeProfile: NotificationProfileData | null,
	allProfiles: NotificationProfileData[],
	settings: NotificationSettings,
	allowPermissionPrompt: boolean,
	requestGeneration: number,
): Promise<void> {
	const isCurrentRequest = () => requestGeneration === scheduleGeneration;
	if (!isCurrentRequest()) return;
	configureNotifications();
	await cancelManagedNotifications();
	if (!isCurrentRequest()) return;
	if (!settings.enabled) return;
	if (!settings.timetableEnabled && !settings.examEnabled) return;
	if (!(await ensureNotificationPermission(allowPermissionPrompt))) return;
	if (!isCurrentRequest()) return;
	const budget = await getScheduleBudget();

	// Timetable reminders intentionally follow only the currently selected
	// profile. Exam reminders are scheduled for every available profile below.
	if (settings.timetableEnabled && activeProfile?.data) {
		await scheduleTimetableNotifications(
			activeProfile.data.timetable,
			settings,
			activeProfile.profileName,
			activeProfile.profileId,
			budget,
			isCurrentRequest,
		);
	}

	if (settings.examEnabled) {
		for (const profile of allProfiles) {
			if (!isCurrentRequest()) break;
			if (!profile.data) continue;
			await scheduleExamNotifications(
				profile.data.seatingPlan,
				settings,
				profile.profileName,
				profile.profileId,
				budget,
				isCurrentRequest,
			);
		}
	}

	if (budget.failed > 0 || budget.skipped > 0) {
		console.warn(
			`Academic notification scheduling completed with ${budget.scheduled} scheduled, ${budget.failed} failed, and ${budget.skipped} skipped reminders.`
		);
	}
}

export function rescheduleUmsNotifications(
	activeProfile: NotificationProfileData | null,
	allProfiles: NotificationProfileData[],
	settings: NotificationSettings,
	allowPermissionPrompt = true
): Promise<void> {
	const requestGeneration = ++scheduleGeneration;
	scheduleQueue = scheduleQueue
		.then(() => scheduleLatestNotifications(activeProfile, allProfiles, settings, allowPermissionPrompt, requestGeneration))
		.catch((error) => {
			console.warn("Unable to schedule academic notifications", error);
		});
	return scheduleQueue;
}
