import { View, Text, StyleSheet } from "react-native";
import { MapPin, UserRound } from "lucide-react-native";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";
import type { TimetableEntry } from "@bhemu/shared";

interface Props {
	day: string;
	entries: TimetableEntry[];
	showLabel?: boolean;
}

// LPU timetable field mapping: R=room, C=courseCode, S=section, G=group, Teacher=faculty
function to12h(time: string): string {
	const [hrs, mins] = time.split(":");
	const h = parseInt(hrs, 10);
	const h12 = h % 12 || 12;
	return `${h12}:${mins} ${h >= 12 ? "PM" : "AM"}`;
}

export default function TimetableDay({ day, entries, showLabel = true }: Props) {
	return (
		<View style={local.container}>
			{showLabel && <Text style={local.dayLabel}>{day}</Text>}
			<View style={local.slots}>
				{entries.map((entry, i) => {
					const courseCode = entry.courseCode;
					const room = entry.room || null;
					return (
						<View key={`${entry.courseCode}-${entry.timeSlot}-${i}`} style={local.slot}>
							<View style={local.timeCol}>
								<Text style={local.timeText}>{to12h(entry.startTime)}</Text>
								<View style={local.timeDivider} />
								<Text style={local.timeText}>{to12h(entry.endTime)}</Text>
							</View>

							<View style={local.dividerV} />

							<View style={local.infoCol}>
								<Text style={local.courseName} numberOfLines={2}>
									{courseCode}
								</Text>

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
	courseName: {
		fontSize: FontSize.base,
		fontWeight: FontWeight.bold,
		color: Colors.textPrimary,
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
