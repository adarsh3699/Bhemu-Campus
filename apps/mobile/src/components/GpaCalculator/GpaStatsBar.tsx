import { View, Text, StyleSheet } from "react-native";
import { calculateCGPA } from "@bhemu/shared";
import type { GPASemester } from "@bhemu/shared";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";

interface GpaStatsBarProps {
	semesters: GPASemester[];
}

export default function GpaStatsBar({ semesters }: GpaStatsBarProps) {
	const cgpa = calculateCGPA(semesters);

	const avgMarks = (() => {
		const all = semesters.flatMap((s) => s.subjects ?? []).filter((s) => s.marks?.total != null);
		if (all.length === 0) return "—";
		return String(Math.round((all.reduce((acc, s) => acc + (s.marks!.total ?? 0), 0) / all.length) * 10) / 10);
	})();

	const stats = [
		{ label: "Semesters", value: String(semesters.length) },
		{ label: "Subjects", value: String(semesters.reduce((acc, s) => acc + (s.subjects?.length || 0), 0)) },
		{ label: "Credits", value: String(semesters.reduce((acc, s) => acc + (s.subjects?.reduce((a, sub) => a + (sub.credit || 0), 0) || 0), 0)) },
		{ label: "Avg. Marks", value: avgMarks },
	];

	return (
		<View style={local.card}>
			{/* CGPA hero */}
			<View style={local.cgpaRow}>
				<Text style={local.cgpaValue}>{cgpa}</Text>
				<Text style={local.cgpaLabel}>CUMULATIVE GPA</Text>
			</View>

			<View style={local.divider} />

			{/* Stats row */}
			<View style={local.statsRow}>
				{stats.map(({ label, value }, i) => (
					<View key={label} style={[local.statItem, i < stats.length - 1 && local.statItemBorder]}>
						<Text style={local.statValue}>{value}</Text>
						<Text style={local.statLabel}>{label}</Text>
					</View>
				))}
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
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.lg,
		marginBottom: Spacing.xl,
	},
	cgpaRow: {
		alignItems: "center",
		paddingBottom: Spacing.md,
	},
	cgpaValue: {
		fontSize: 52,
		fontWeight: FontWeight.extrabold,
		color: Colors.primary,
		lineHeight: 56,
	},
	cgpaLabel: {
		fontSize: 9,
		fontWeight: FontWeight.bold,
		color: Colors.textSubtle,
		letterSpacing: 1.5,
		marginTop: 2,
	},
	divider: {
		height: 1,
		backgroundColor: Colors.border,
		marginVertical: Spacing.md,
	},
	statsRow: {
		flexDirection: "row",
		justifyContent: "space-around",
	},
	statItem: {
		flex: 1,
		alignItems: "center",
		paddingVertical: Spacing.xs,
	},
	statItemBorder: {
		borderRightWidth: 1,
		borderRightColor: Colors.border,
	},
	statValue: {
		fontSize: FontSize.xl,
		fontWeight: FontWeight.bold,
		color: Colors.textPrimary,
		lineHeight: 26,
	},
	statLabel: {
		fontSize: FontSize.xs,
		color: Colors.textMuted,
		marginTop: 2,
		textAlign: "center",
	},
});
