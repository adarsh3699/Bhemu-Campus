import { View, Text, StyleSheet } from "react-native";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";
import type { UMSSeatingPlan } from "@bhemu/shared";

interface Props {
	item: UMSSeatingPlan;
}

export default function SeatingCard({ item }: Props) {
	return (
		<View style={local.card}>
			<View style={local.row}>
				<Text style={local.code}>{item.CourseCode}</Text>
				{item.ExamType ? <Text style={local.type}>{item.ExamType}</Text> : null}
			</View>
			<Text style={local.name} numberOfLines={2}>{item.CourseName}</Text>
			<View style={local.details}>
				{item.ExamDate ? (
					<Text style={local.detail}>Date: {item.ExamDate}</Text>
				) : null}
				{item.Room ? (
					<Text style={local.detail}>Room: {item.Room}</Text>
				) : null}
				{item.Status ? (
					<Text style={local.detail}>Status: {item.Status}</Text>
				) : null}
			</View>
		</View>
	);
}

const local = StyleSheet.create({
	card: {
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		borderWidth: 1,
		borderColor: Colors.border,
		padding: Spacing.lg,
		gap: Spacing.xs,
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	code: {
		fontSize: FontSize.base,
		fontWeight: FontWeight.bold,
		color: Colors.primary,
	},
	type: {
		fontSize: FontSize.xs,
		fontWeight: FontWeight.medium,
		color: Colors.warning,
		backgroundColor: Colors.warning + "20",
		paddingHorizontal: Spacing.sm,
		paddingVertical: 2,
		borderRadius: Radius.sm,
	},
	name: {
		fontSize: FontSize.sm,
		color: Colors.textPrimary,
	},
	details: {
		gap: 2,
		marginTop: Spacing.xs,
	},
	detail: {
		fontSize: FontSize.xs,
		color: Colors.textMuted,
	},
});
