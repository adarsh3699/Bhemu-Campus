/**
 * Parses a time string (e.g., "13:00", "1:00 PM") to minutes from midnight.
 * @param time Time string to parse
 * @returns Minutes from midnight, or null if invalid
 */
export function parseTimeMinutes(time: string): number | null {
	const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
	if (!match) return null;

	let hours = Number(match[1]);
	const minutes = Number(match[2]);
	const meridiem = match[3]?.toUpperCase();
	if (minutes > 59) return null;

	if (meridiem) {
		if (hours < 1 || hours > 12) return null;
		hours = (hours % 12) + (meridiem === "PM" ? 12 : 0);
	} else if (hours > 23) {
		return null;
	}

	return hours * 60 + minutes;
}

/**
 * Formats minutes from midnight to a 12-hour AM/PM string (e.g., "1:00 PM").
 * @param mins Minutes from midnight
 */
export function formatMinutesToAmPm(mins: number): string {
	const hours24 = Math.floor(mins / 60);
	const m = mins % 60;
	const h12 = hours24 % 12 || 12;
	const ampm = hours24 >= 12 ? "PM" : "AM";
	return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/**
 * Formats a 24-hour time string (e.g., "13:00") or 12-hour string to a 12-hour AM/PM string (e.g., "1:00 PM").
 * @param time Time string to format
 */
export function formatTimeToAmPm(time: string): string {
	const mins = parseTimeMinutes(time);
	if (mins === null) return time;
	return formatMinutesToAmPm(mins);
}

/**
 * Formats minutes from midnight to a 12-hour string without AM/PM (e.g., "1:00").
 * @param mins Minutes from midnight
 */
export function formatMinutesTo12h(mins: number): string {
	const hours24 = Math.floor(mins / 60);
	const m = mins % 60;
	const h12 = hours24 % 12 || 12;
	return `${h12}:${String(m).padStart(2, "0")}`;
}
