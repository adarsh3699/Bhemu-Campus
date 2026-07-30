import { View, Text, StyleSheet } from "react-native";
import { MapPin, UserRound } from "lucide-react-native";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";
import type { TimetableEntry } from "@bhemu/shared";

interface Props {
	day: string;
	entries: TimetableEntry[];
	showLabel?: boolean;
	currentDay?: string;
	currentTimeMinutes?: number;
}

// LPU timetable field mapping: R=room, C=courseCode, S=section, G=group, Teacher=faculty
function to12h(time: string): string {
	const minutes = toMinutes(time);
	if (minutes === null) return time;
	const hours24 = Math.floor(minutes / 60);
	const h12 = hours24 % 12 || 12;
	return `${h12}:${String(minutes % 60).padStart(2, "0")} ${hours24 >= 12 ? "PM" : "AM"}`;
}

function toMinutes(time: string): number | null {
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

export default function TimetableDay({ day, entries, showLabel = true, currentDay, currentTimeMinutes }: Props) {
	return (
		<View style={local.container}>
			{showLabel && <Text style={local.dayLabel}>{day}</Text>}
			<View style={local.slots}>
				{entries.map((entry, i) => {
					const courseCode = entry.courseCode;
					const room = entry.room || null;
					const startMinutes = toMinutes(entry.startTime);
					const endMinutes = toMinutes(entry.endTime);
					const isCurrent =
						day === currentDay &&
						startMinutes !== null &&
						endMinutes !== null &&
						currentTimeMinutes !== undefined &&
						currentTimeMinutes >= startMinutes &&
						currentTimeMinutes < endMinutes;
					return (
						<View
							key={`${entry.courseCode}-${entry.timeSlot}-${i}`}
							style={[local.slot, isCurrent && local.slotCurrent]}
						>
							<View style={local.timeCol}>
								<Text style={local.timeText}>{to12h(entry.startTime)}</Text>
								<View style={local.timeDivider} />
								<Text style={local.timeText}>{to12h(entry.endTime)}</Text>
							</View>

							<View style={local.dividerV} />

							<View style={local.infoCol}>
								<View style={local.courseHeader}>
									<Text style={local.courseName} numberOfLines={2}>
										{courseCode}
									</Text>
									{isCurrent && (
										<View style={local.liveBadge}>
											<View style={local.liveDot} />
											<Text style={local.liveText}>LIVE NOW</Text>
										</View>
									)}
								</View>

								<View style={local.chipRow}>
									{!!room && (
										<View style={local.infoRow}>
											<MapPin size={11} color={Colors.secondary} />
											<Text style={local.infoText}>{room}</Text>
										</View>
									)}
									{!!entry.faculty && (
										<View style={local.infoRow}>
											<UserRound size={11} color={Colors.textMuted} />
											<Text style={local.infoText} numberOfLines={1}>
												{entry.faculty}
											</Text>
										</View>
									)}
								</View>

								{(!!entry.section || !!entry.group) && (
									<View style={local.chipRow}>
										{!!entry.section && (
											<View style={local.chip}>
												<Text style={local.chipLabel}>Sec </Text>
												<Text style={local.chipText}>{entry.section}</Text>
											</View>
										)}
										{!!entry.group && (
											<View style={local.chip}>
												<Text style={local.chipLabel}>Grp </Text>
												<Text style={local.chipText}>{entry.group}</Text>
											</View>
										)}
									</View>
								)}
							</View>
						</View>
					);
				})}
			</View>
		</View>
	);
}

const local = StyleSheet.create({
	container: { gap: Spacing.sm },
	dayLabel: {
		fontSize: FontSize.md,
		fontWeight: FontWeight.bold,
		color: Colors.textPrimary,
		marginBottom: Spacing.xs,
	},
	slots: { gap: Spacing.sm },
	slot: {
		flexDirection: "row",
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		borderWidth: 1,
		borderColor: Colors.border,
		padding: Spacing.md,
		gap: Spacing.md,
		alignItems: "center",
	},
	slotCurrent: {
		backgroundColor: Colors.secondary + "12",
		borderColor: Colors.secondary,
	},
	timeCol: {
		alignItems: "center",
		gap: 3,
		minWidth: 68,
	},
	timeText: {
		fontSize: FontSize.sm,
		fontWeight: FontWeight.bold,
		color: Colors.secondary,
	},
	timeDivider: {
		width: 18,
		height: 1,
		backgroundColor: Colors.border,
	},
	dividerV: {
		width: 1,
		alignSelf: "stretch",
		backgroundColor: Colors.border,
	},
	infoCol: {
		flex: 1,
		gap: Spacing.xs,
	},
	courseHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: Spacing.sm,
	},
	courseName: {
		fontSize: FontSize.base,
		fontWeight: FontWeight.bold,
		color: Colors.textPrimary,
		flex: 1,
	},
	liveBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		backgroundColor: Colors.secondary + "22",
		borderRadius: Radius.full,
		paddingHorizontal: Spacing.xs + 2,
		paddingVertical: 3,
	},
	liveDot: {
		width: 5,
		height: 5,
		borderRadius: Radius.full,
		backgroundColor: Colors.secondary,
	},
	liveText: {
		fontSize: 9,
		fontWeight: FontWeight.bold,
		color: Colors.secondary,
	},
	infoRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 3,
	},
	infoText: {
		fontSize: FontSize.xs,
		color: Colors.textPrimary,
		fontWeight: FontWeight.semibold,
	},
	chipRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		alignItems: "center",
		gap: Spacing.sm,
	},
	chip: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: Colors.surfaceElevated,
		borderRadius: Radius.sm,
		paddingHorizontal: Spacing.xs + 2,
		paddingVertical: 2,
	},
	chipLabel: {
		fontSize: FontSize.xs,
		color: Colors.textSubtle,
		fontWeight: FontWeight.medium,
	},
	chipText: {
		fontSize: FontSize.xs,
		fontWeight: FontWeight.semibold,
		color: Colors.textBody,
	},
});
