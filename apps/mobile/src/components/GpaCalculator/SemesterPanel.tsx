import { View, Text, StyleSheet } from "react-native";
import { calculateGPA } from "@bhemu/shared";
import SubjectCard, { SubjectEditFormState } from "@/components/GpaCalculator/SubjectCard";
import type { GPASubject } from "@/types";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";

interface SemesterPanelProps {
	mode: "grades" | "marks";
	semesterName: string;
	subjects: GPASubject[];
	editingSubjectId: string | null;
	editFormState: SubjectEditFormState;
	onFormChange: (name: string, value: string) => void;
	onEdit: (id: string | number) => void;
	onSave: (id: string | number) => void;
	onCancel: () => void;
	onDelete: (id: string | number) => void;
	isReadOnly?: boolean;
}

export default function SemesterPanel({
	mode,
	semesterName,
	subjects,
	editingSubjectId,
	editFormState,
	onFormChange,
	onEdit,
	onSave,
	onCancel,
	onDelete,
	isReadOnly = false,
}: SemesterPanelProps) {
	const totalCredits = subjects.reduce((acc, s) => acc + s.credit, 0);

	return (
		<View style={local.card}>
			{/* Header */}
			<View style={local.header}>
				<View style={local.headerLeft}>
					<Text style={local.semName}>{semesterName}</Text>
					<View style={local.pills}>
						<View style={local.pill}>
							<Text style={local.pillText}>{subjects.length} subjects</Text>
						</View>
						<View style={local.pill}>
							<Text style={local.pillText}>{totalCredits} credits</Text>
						</View>
					</View>
				</View>
				<View style={local.sgpaBlock}>
					<Text style={local.sgpaValue}>{calculateGPA(subjects)}</Text>
					<Text style={local.sgpaLabel}>SGPA</Text>
				</View>
			</View>

			{/* Subject list */}
			{subjects.length === 0 ? (
				<View style={local.emptyState}>
					<Text style={local.emptyText}>No subjects yet — tap <Text style={local.emptyHighlight}>Add Subject</Text> above.</Text>
				</View>
			) : (
				<View style={local.subjectList}>
					{subjects.map((subject) => (
						<SubjectCard
							key={String(subject.id)}
							mode={mode}
							subject={subject}
							isEditing={editingSubjectId === String(subject.id)}
							editFormState={editFormState}
							onFormChange={onFormChange}
							onEdit={onEdit}
							onSave={onSave}
							onCancel={onCancel}
							onDelete={onDelete}
							isReadOnly={isReadOnly}
						/>
					))}
				</View>
			)}
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
		gap: Spacing.lg,
		// Top shimmer line like web
		overflow: "hidden",
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		paddingBottom: Spacing.lg,
		borderBottomWidth: 1,
		borderBottomColor: Colors.border,
	},
	headerLeft: { flex: 1, gap: 6, paddingRight: Spacing.sm },
	semName: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
	pills: { flexDirection: "row", gap: Spacing.xs },
	pill: {
		paddingHorizontal: Spacing.sm,
		paddingVertical: 2,
		borderRadius: Radius.full,
		backgroundColor: Colors.surfaceElevated,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	pillText: { fontSize: 10, fontWeight: FontWeight.medium, color: Colors.textMuted },
	sgpaBlock: { alignItems: "flex-end", gap: 2 },
	sgpaValue: { fontSize: 32, fontWeight: FontWeight.extrabold, color: Colors.primary, lineHeight: 36 },
	sgpaLabel: { fontSize: 9, fontWeight: FontWeight.semibold, color: Colors.textMuted, letterSpacing: 1.2, textTransform: "uppercase" },
	subjectList: { gap: Spacing.sm },
	emptyState: { paddingVertical: Spacing.xxl, alignItems: "center" },
	emptyText: { fontSize: FontSize.sm, color: Colors.textSubtle, textAlign: "center" },
	emptyHighlight: { color: Colors.success, fontWeight: FontWeight.semibold },
});
