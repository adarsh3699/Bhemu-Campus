import { View, Text, StyleSheet } from "react-native";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";
import type { TimetableEntry } from "@bhemu/shared";

interface Props {
	day: string;
	entries: TimetableEntry[];
}

export default function TimetableDay({ day, entries }: Props) {
	return (
		<View style={local.container}>
			<Text style={local.dayLabel}>{day}</Text>
			<View style={local.slots}>
				{entries.map((entry, i) => (
					<View key={`${entry.courseCode}-${entry.timeSlot}-${i}`} style={local.slot}>
						<View style={local.timeCol}>
							<Text style={local.time}>{entry.startTime}</Text>
							<Text style={local.timeSep}>-</Text>
							<Text style={local.time}>{entry.endTime}</Text>
						</View>
						<View style={local.infoCol}>
							<Text style={local.courseName} numberOfLines={1}>
								{entry.courseName || entry.courseCode}
							</Text>
							<Text style={local.meta}>
								{entry.courseCode}
								{entry.room ? ` • ${entry.room}` : ""}
							</Text>
							{entry.faculty ? (
								<Text style={local.faculty} numberOfLines={1}>{entry.faculty}</Text>
							) : null}
						</View>
					</View>
				))}
			</View>
		</View>
	);
}

const local = StyleSheet.create({
	container: {
		gap: Spacing.sm,
	},
	dayLabel: {
		fontSize: FontSize.md,
		fontWeight: FontWeight.bold,
		color: Colors.textPrimary,
		marginBottom: Spacing.xs,
	},
	slots: {
		gap: Spacing.sm,
	},
	slot: {
		flexDirection: "row",
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		borderWidth: 1,
		borderColor: Colors.border,
		padding: Spacing.md,
		gap: Spacing.md,
	},
	timeCol: {
		alignItems: "center",
		justifyContent: "center",
		minWidth: 50,
	},
	time: {
		fontSize: FontSize.xs,
		fontWeight: FontWeight.semibold,
		color: Colors.primary,
	},
	timeSep: {
		fontSize: FontSize.xs,
		color: Colors.textSubtle,
	},
	infoCol: {
		flex: 1,
		gap: 2,
	},
	courseName: {
		fontSize: FontSize.sm,
		fontWeight: FontWeight.semibold,
		color: Colors.textPrimary,
	},
	meta: {
		fontSize: FontSize.xs,
		color: Colors.textMuted,
	},
	faculty: {
		fontSize: FontSize.xs,
		color: Colors.textSubtle,
	},
});
