/**
 * timelineUtils — pure functions for the Today's Timeline feature.
 *
 * Merges timetable classes + seating-plan exams into a single chronological
 * sequence and classifies them as previous / current / next based on the
 * current time. Also provides attendance matching and computation helpers.
 */

import { parseTimeMinutes, type TimetableEntry, type UMSSeatingPlan } from "@bhemu/shared";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TimelineItem {
	type: "class" | "exam";
	courseCode: string;
	label: string; // display name (courseCode for class, CourseName for exam)
	startMinutes: number; // minutes from midnight
	endMinutes: number; // minutes from midnight
	room: string;
	// One of the two will be present
	entry?: TimetableEntry;
	exam?: UMSSeatingPlan;
	// Upcoming details (for displaying "Tomorrow" or specific dates)
	upcomingDayOffset?: number; // 1 for tomorrow, etc.
	upcomingDate?: Date; // parsed exam date
}

export interface ClassifiedTimeline {
	previous: TimelineItem | null;
	current: TimelineItem | null;
	next: TimelineItem | null;
}

// ─── Time helpers ───────────────────────────────────────────────────────────

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ─── Exam date parsing ──────────────────────────────────────────────────────

const MONTH_MAP: Record<string, number> = {
	Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
	Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

/** Check if an ExamDate string represents today. Handles common formats. */
function isExamToday(dateStr: string): boolean {
	if (!dateStr) return false;
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

	// Try native Date parsing first
	const parsed = new Date(dateStr);
	if (!isNaN(parsed.getTime())) {
		const parsedDay = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
		return parsedDay.getTime() === today.getTime();
	}

	// Try "DD Mon YYYY" format (e.g., "05 Aug 2026")
	const parts = dateStr.trim().split(/[\s,]+/);
	for (let i = 0; i < parts.length - 1; i++) {
		const month = MONTH_MAP[parts[i]];
		if (month !== undefined) {
			const day = parseInt(parts[i - 1], 10) || parseInt(parts[i + 1], 10);
			const year = parseInt(parts[parts.length - 1], 10);
			if (day && year) {
				const examDate = new Date(year, month, day);
				return examDate.getTime() === today.getTime();
			}
		}
	}

	return false;
}

/** Parse an exam date string into a Date object, or null if unparseable. */
function parseExamDate(dateStr: string): Date | null {
	if (!dateStr) return null;

	// Try native first
	const parsed = new Date(dateStr);
	if (!isNaN(parsed.getTime())) return parsed;

	// Try "DD Mon YYYY"
	const parts = dateStr.trim().split(/[\s,]+/);
	for (let i = 0; i < parts.length - 1; i++) {
		const month = MONTH_MAP[parts[i]];
		if (month !== undefined) {
			const day = parseInt(parts[i - 1], 10) || parseInt(parts[i + 1], 10);
			const year = parseInt(parts[parts.length - 1], 10);
			if (day && year) return new Date(year, month, day);
		}
	}

	return null;
}

// ─── Timeline building ─────────────────────────────────────────────────────

/** Get today's timetable classes, sorted by start time. */
export function getTodayClasses(timetable: TimetableEntry[]): TimelineItem[] {
	const todayName = DAY_NAMES[new Date().getDay()];
	const items: TimelineItem[] = [];
	for (const e of timetable) {
		if (e.dayOfWeek !== todayName) continue;
		const start = parseTimeMinutes(e.startTime);
		const end = parseTimeMinutes(e.endTime);
		if (start === null || end === null) continue;
		items.push({
			type: "class",
			courseCode: e.courseCode,
			label: e.courseCode,
			startMinutes: start,
			endMinutes: end,
			room: e.room || "",
			entry: e,
		});
	}
	return items.sort((a, b) => a.startMinutes - b.startMinutes);
}

/** Get today's exams from seating plan. */
export function getTodayExams(seatingPlan: UMSSeatingPlan[]): TimelineItem[] {
	return seatingPlan
		.filter((exam) => isExamToday(exam.ExamDate))
		.map((exam) => ({
			type: "exam" as const,
			courseCode: exam.CourseCode,
			label: exam.CourseName || exam.CourseCode,
			// Exams typically don't have exact time; place them at start of day
			startMinutes: 0,
			endMinutes: 24 * 60,
			room: exam.Room || "",
			exam,
		}));
}

/** Get the nearest upcoming item (class from next days, or future exam). */
export function getNextUpcomingItem(
	timetable: TimetableEntry[],
	seatingPlan: UMSSeatingPlan[]
): TimelineItem | null {
	const now = new Date();
	const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const todayIndex = now.getDay();

	let nextClass: TimelineItem | null = null;
	let nextClassDate: Date | null = null;

	// Check next 7 days for classes
	for (let offset = 1; offset <= 7; offset++) {
		const targetDayIndex = (todayIndex + offset) % 7;
		const targetName = DAY_NAMES[targetDayIndex];
		const dayClasses: TimelineItem[] = [];

		for (const e of timetable) {
			if (e.dayOfWeek !== targetName) continue;
			const start = parseTimeMinutes(e.startTime);
			const end = parseTimeMinutes(e.endTime);
			if (start === null || end === null) continue;
			dayClasses.push({
				type: "class",
				courseCode: e.courseCode,
				label: e.courseCode,
				startMinutes: start,
				endMinutes: end,
				room: e.room || "",
				entry: e,
				upcomingDayOffset: offset,
			});
		}

		if (dayClasses.length > 0) {
			dayClasses.sort((a, b) => a.startMinutes - b.startMinutes);
			nextClass = dayClasses[0];
			nextClassDate = new Date(todayStart.getTime() + offset * 24 * 60 * 60 * 1000);
			break;
		}
	}

	let nextExam: TimelineItem | null = null;
	let nextExamDate: Date | null = null;

	// Check future exams
	for (const exam of seatingPlan) {
		const date = parseExamDate(exam.ExamDate);
		if (!date || date.getTime() <= todayStart.getTime()) continue;
		if (!nextExamDate || date.getTime() < nextExamDate.getTime()) {
			nextExam = {
				type: "exam" as const,
				courseCode: exam.CourseCode,
				label: exam.CourseName || exam.CourseCode,
				startMinutes: 0,
				endMinutes: 24 * 60,
				room: exam.Room || "",
				exam,
				upcomingDate: date,
			};
			nextExamDate = date;
		}
	}

	if (nextClass && nextExam && nextClassDate && nextExamDate) {
		if (nextClassDate.getTime() <= nextExamDate.getTime()) {
			return nextClass;
		} else {
			return nextExam;
		}
	}

	return nextClass || nextExam || null;
}

/**
 * Build a merged timeline of today's classes + today's exams, sorted by time.
 */
export function buildTimeline(
	timetable: TimetableEntry[],
	seatingPlan: UMSSeatingPlan[]
): TimelineItem[] {
	const classes = getTodayClasses(timetable);
	const todayExams = getTodayExams(seatingPlan);

	// Merge and sort
	return [...classes, ...todayExams].sort((a, b) => a.startMinutes - b.startMinutes);
}

/**
 * Classify timeline items into previous / current / next based on current time.
 */
export function classifyTimeline(
	items: TimelineItem[],
	currentTimeMinutes: number
): ClassifiedTimeline {
	if (items.length === 0) {
		return { previous: null, current: null, next: null };
	}

	let currentIdx = -1;

	// Find the class/exam that's happening now
	for (let i = 0; i < items.length; i++) {
		if (currentTimeMinutes >= items[i].startMinutes && currentTimeMinutes < items[i].endMinutes) {
			currentIdx = i;
			break;
		}
	}

	// If no current, find where we are in the timeline
	if (currentIdx === -1) {
		// Check if all classes are done
		const allDone = items.every((item) => currentTimeMinutes >= item.endMinutes);
		if (allDone) {
			// All done — return last item as previous, current is null
			return {
				previous: items[items.length - 1],
				current: null,
				next: null,
			};
		}

		// We're between classes — find the next one
		const nextIdx = items.findIndex((item) => currentTimeMinutes < item.startMinutes);
		if (nextIdx === -1) {
			return { previous: items[items.length - 1], current: null, next: null };
		}

		// The next upcoming class becomes "next", previous one becomes "previous"
		return {
			previous: nextIdx > 0 ? items[nextIdx - 1] : null,
			current: null,
			next: items[nextIdx],
		};
	}

	return {
		previous: currentIdx > 0 ? items[currentIdx - 1] : null,
		current: items[currentIdx],
		next: currentIdx < items.length - 1 ? items[currentIdx + 1] : null,
	};
}
