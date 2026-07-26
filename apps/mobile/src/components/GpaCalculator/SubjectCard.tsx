import { View, Text, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { Pencil, Trash2 } from "lucide-react-native";
import { pointToGrade, SELECTABLE_GRADES, computeGradeFromMarks } from "@bhemu/shared";
import type { GPASubject } from "@/types";
import type { CustomCutoff } from "@/types";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";
import { Inputs } from "@/styles";

// ─── Shared form state ─────────────────────────────────────────────────────

export interface SubjectEditFormState {
	subjectName: string;
	grade: string;
	credit: string;
	ca: string;
	midTerm: string;
	endTerm: string;
	attendanceMarks: string;
}

// ─── Mini primitives ───────────────────────────────────────────────────────

function Badge({ text, style: extraStyle }: { text: string; style?: object }) {
	return (
		<View style={[badge.pill, extraStyle]}>
			<Text style={badge.text}>{text}</Text>
		</View>
	);
}

function MarkField({
	label, name, value,
	onChangeText, autoFocus,
}: {
	label: string;
	name: string;
	value: string;
	onChangeText: (name: string, value: string) => void;
	autoFocus?: boolean;
}) {
	return (
		<View style={field.wrap}>
			<Text style={field.label}>{label}</Text>
			<TextInput
				style={[Inputs.field, field.input]}
				keyboardType="decimal-pad"
				value={value}
				onChangeText={(v) => onChangeText(name, v)}
				placeholder="—"
				placeholderTextColor={Colors.textSubtle}
				autoFocus={autoFocus}
			/>
		</View>
	);
}

// ─── SubjectCard ───────────────────────────────────────────────────────────

interface SubjectCardProps {
	mode: "grades" | "marks";
	subject: GPASubject;
	isEditing: boolean;
	editFormState: SubjectEditFormState;
	onFormChange: (name: string, value: string) => void;
	onEdit: (id: string | number) => void;
	onSave: (id: string | number) => void;
	onCancel: () => void;
	onDelete: (id: string | number) => void;
	isReadOnly?: boolean;
}

export default function SubjectCard({
	mode,
	subject,
	isEditing,
	editFormState,
	onFormChange,
	onEdit,
	onSave,
	onCancel,
	onDelete,
	isReadOnly = false,
}: SubjectCardProps) {
	const { marks } = subject;
	const hasMarks = marks != null;

	const displayGradePoint = subject.grade > 0 ? subject.grade : null;
	const gradeLabel = displayGradePoint !== null ? pointToGrade(displayGradePoint) : null;

	const toN = (v: string) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
	const editingTotal = isEditing && mode === "marks"
		? toN(editFormState.ca) + toN(editFormState.midTerm) + toN(editFormState.endTerm) + toN(editFormState.attendanceMarks)
		: 0;
	const totalOver = editingTotal > 100;

	const gradeOverridden = hasMarks && marks.total != null
		&& subject.grade !== computeGradeFromMarks(marks.total, marks.customCutoff as CustomCutoff | null);

	return (
		<View style={[local.card, !hasMarks && local.cardDashed]}>
			{/* Header row */}
			<View style={local.headerRow}>
				<View style={local.nameBlock}>
					<Text style={local.subjectName} numberOfLines={1}>
						{subject.subjectName.length > 22 && subject.subjectCode
							? subject.subjectCode
							: subject.subjectName}
					</Text>
					<View style={local.badgeRow}>
						{subject.credit === 0
							? <Badge text="Credits?" style={badge.warn} />
							: <Badge text={`${subject.credit} cr`} />
						}
						{hasMarks && (
							<Badge
								text={marks.source === "ums" ? "UMS" : marks.source === "manual" ? "Manual" : "Partial"}
								style={marks.source === "ums" ? badge.blue : marks.source === "manual" ? badge.teal : badge.muted}
							/>
						)}
						{gradeOverridden && <Badge text="Grade ✎" style={badge.violet} />}
						{marks?.customCutoff && <Badge text="✦ Relative" style={badge.amber} />}
					</View>
				</View>

				<View style={local.actions}>
					{isEditing ? (
						<TouchableOpacity style={local.iconBtn} onPress={onCancel}>
							<Text style={local.cancelIcon}>✕</Text>
						</TouchableOpacity>
					) : (
						<>
							<TouchableOpacity
								style={[local.iconBtn, local.editBtn, isReadOnly && local.disabledBtn]}
								onPress={() => !isReadOnly && onEdit(subject.id)}
								disabled={isReadOnly}
							>
								<Pencil size={14} color={isReadOnly ? Colors.textSubtle : Colors.secondary} />
							</TouchableOpacity>
							<TouchableOpacity
								style={[local.iconBtn, local.deleteIconBtn, isReadOnly && local.disabledBtn]}
								onPress={() => !isReadOnly && onDelete(subject.id)}
								disabled={isReadOnly}
							>
								<Trash2 size={14} color={isReadOnly ? Colors.textSubtle : Colors.destructive} />
							</TouchableOpacity>
						</>
					)}
				</View>
			</View>

			{/* Edit form */}
			{isEditing && mode === "grades" && (
				<View style={local.form}>
					<View style={local.row}>
						<TextInput
							style={[Inputs.field, { flex: 1 }]}
							value={editFormState.subjectName}
							onChangeText={(v) => onFormChange("subjectName", v)}
							placeholder="Subject name"
							placeholderTextColor={Colors.textSubtle}
							autoFocus
						/>
						<TextInput
							style={[Inputs.field, { width: 64 }]}
							value={editFormState.credit}
							onChangeText={(v) => onFormChange("credit", v)}
							placeholder="Cr"
							placeholderTextColor={Colors.textSubtle}
							keyboardType="decimal-pad"
						/>
					</View>
					<View style={local.gradeRow}>
						{SELECTABLE_GRADES.map(({ grade, gradePoint }) => {
							const selected = editFormState.grade === String(gradePoint);
							return (
								<TouchableOpacity
									key={grade}
									style={[local.gradeChip, selected && local.gradeChipSelected]}
									onPress={() => onFormChange("grade", selected ? "" : String(gradePoint))}
									activeOpacity={0.7}
								>
									<Text style={[local.gradeChipText, selected && local.gradeChipTextSelected]}>
										{grade}
									</Text>
								</TouchableOpacity>
							);
						})}
					</View>
					<TouchableOpacity
						style={[local.saveBtn, !editFormState.grade && local.saveBtnDisabled]}
						onPress={() => editFormState.grade && onSave(subject.id)}
						disabled={!editFormState.grade}
						activeOpacity={0.8}
					>
						<Text style={local.saveBtnText}>Save</Text>
					</TouchableOpacity>
				</View>
			)}

			{isEditing && mode === "marks" && (
				<View style={local.form}>
					<View style={local.marksGrid}>
						<MarkField label="Credits" name="credit" value={editFormState.credit} onChangeText={onFormChange} autoFocus />
						<MarkField label="CA" name="ca" value={editFormState.ca} onChangeText={onFormChange} />
						<MarkField label="Mid" name="midTerm" value={editFormState.midTerm} onChangeText={onFormChange} />
						<MarkField label="End" name="endTerm" value={editFormState.endTerm} onChangeText={onFormChange} />
						<MarkField label="Att." name="attendanceMarks" value={editFormState.attendanceMarks} onChangeText={onFormChange} />
					</View>
					{totalOver
						? <Text style={local.totalError}>Total ({editingTotal}) exceeds 100</Text>
						: editingTotal > 0
							? <Text style={local.totalHint}>Total: <Text style={local.totalValue}>{editingTotal}</Text> / 100</Text>
							: null
					}
					<TouchableOpacity
						style={[local.saveBtn, totalOver && local.saveBtnDisabled]}
						onPress={() => !totalOver && onSave(subject.id)}
						disabled={totalOver}
						activeOpacity={0.8}
					>
						<Text style={local.saveBtnText}>Save</Text>
					</TouchableOpacity>
				</View>
			)}

			{/* Display — grades mode */}
			{!isEditing && mode === "grades" && (
				<>
					<View style={local.statsRow}>
						{[
							{ label: "Grade", value: String(subject.grade) },
							{ label: "Credits", value: String(subject.credit) },
							{ label: "Points", value: (subject.grade * subject.credit).toFixed(1) },
						].map(({ label, value }) => (
							<View key={label} style={local.statBox}>
								<Text style={local.statVal}>{value}</Text>
								<Text style={local.statLabel}>{label}</Text>
							</View>
						))}
					</View>
					{gradeLabel && (
						<View style={local.gradeLabelRow}>
							<Text style={local.gradeDisplay}>{gradeLabel} ({displayGradePoint})</Text>
						</View>
					)}
				</>
			)}

			{/* Display — marks mode */}
			{!isEditing && mode === "marks" && (
				<>
					<View style={local.statsRow}>
						{(
							[
								["CA", marks?.ca ?? null],
								["Mid", marks?.midTerm ?? null],
								["End", marks?.endTerm ?? null],
								["Att.", marks?.attendanceMarks ?? null],
							] as [string, number | null][]
						).map(([label, value]) => (
							<View key={label} style={local.statBox}>
								<Text style={[local.statVal, value == null && local.statValMuted]}>
									{value ?? "—"}
								</Text>
								<Text style={local.statLabel}>{label}</Text>
							</View>
						))}
					</View>
					<View style={local.marksFooter}>
						<Text style={local.totalHint}>
							{hasMarks
								? <>Total: <Text style={local.totalValue}>{marks!.total ?? "—"}</Text></>
								: <Text style={{ color: Colors.textSubtle }}>No marks — tap ✎ to add</Text>
							}
						</Text>
						{gradeLabel && (
							<Text style={local.gradeDisplay}>{gradeLabel} ({displayGradePoint})</Text>
						)}
					</View>
				</>
			)}
		</View>
	);
}

// ─── Styles ────────────────────────────────────────────────────────────────

const badge = StyleSheet.create({
	pill: {
		paddingHorizontal: 7,
		paddingVertical: 2,
		borderRadius: Radius.full,
		borderWidth: 1,
		borderColor: Colors.border,
		backgroundColor: Colors.surfaceElevated,
	},
	text: { fontSize: 10, fontWeight: FontWeight.semibold, color: Colors.textMuted },
	warn: { backgroundColor: "rgba(251,146,60,0.1)", borderColor: "rgba(251,146,60,0.25)" },
	blue: { backgroundColor: "rgba(59,130,246,0.1)", borderColor: "rgba(59,130,246,0.25)" },
	teal: { backgroundColor: "rgba(20,184,166,0.1)", borderColor: "rgba(20,184,166,0.25)" },
	muted: { backgroundColor: "rgba(115,115,115,0.1)", borderColor: "rgba(115,115,115,0.25)" },
	violet: { backgroundColor: "rgba(139,92,246,0.1)", borderColor: "rgba(139,92,246,0.25)" },
	amber: { backgroundColor: "rgba(245,158,11,0.1)", borderColor: "rgba(245,158,11,0.3)" },
});

const field = StyleSheet.create({
	wrap: { flex: 1, gap: 4 },
	label: { fontSize: 9, fontWeight: FontWeight.bold, color: Colors.textSubtle, letterSpacing: 0.8, textTransform: "uppercase" },
	input: { height: 40, fontSize: FontSize.sm, paddingHorizontal: Spacing.sm },
});

const local = StyleSheet.create({
	card: {
		backgroundColor: Colors.surfaceElevated,
		borderRadius: Radius.lg,
		padding: Spacing.md,
		borderWidth: 1,
		borderColor: Colors.border,
		gap: Spacing.sm,
	},
	cardDashed: {
		borderStyle: "dashed",
		borderColor: Colors.borderLight,
	},
	headerRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
	},
	nameBlock: { flex: 1, gap: 5, paddingRight: Spacing.sm },
	subjectName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
	badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
	actions: { flexDirection: "row", gap: 6, flexShrink: 0 },
	iconBtn: {
		width: 28,
		height: 28,
		borderRadius: Radius.sm,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
		borderColor: Colors.border,
		backgroundColor: Colors.surfaceElevated,
	},
	editBtn: { borderColor: "rgba(0,194,255,0.3)", backgroundColor: "rgba(0,194,255,0.08)" },
	deleteIconBtn: { borderColor: "rgba(239,68,68,0.3)", backgroundColor: "rgba(239,68,68,0.08)" },
	disabledBtn: { opacity: 0.4 },
	cancelIcon: { fontSize: 10, fontWeight: FontWeight.bold, color: Colors.textMuted },

	// Form
	form: { gap: Spacing.sm },
	row: { flexDirection: "row", gap: Spacing.sm },
	gradeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
	gradeChip: {
		paddingHorizontal: Spacing.sm,
		paddingVertical: 5,
		borderRadius: Radius.sm,
		borderWidth: 1,
		borderColor: Colors.border,
		backgroundColor: Colors.surfaceElevated,
	},
	gradeChipSelected: {
		backgroundColor: Colors.primary,
		borderColor: Colors.primary,
	},
	gradeChipText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted },
	gradeChipTextSelected: { color: Colors.textPrimary },
	marksGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.xs },
	totalError: { fontSize: FontSize.xs, color: Colors.destructive, fontWeight: FontWeight.medium },
	totalHint: { fontSize: FontSize.xs, color: Colors.textMuted },
	totalValue: { color: Colors.textPrimary, fontWeight: FontWeight.bold },
	saveBtn: {
		paddingVertical: 8,
		borderRadius: Radius.md,
		alignItems: "center",
		backgroundColor: "rgba(20,184,166,0.15)",
		borderWidth: 1,
		borderColor: "rgba(20,184,166,0.3)",
	},
	saveBtnDisabled: { opacity: 0.4 },
	saveBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.success },

	// Stats display
	statsRow: { flexDirection: "row", gap: Spacing.sm },
	statBox: {
		flex: 1,
		alignItems: "center",
		backgroundColor: Colors.surface,
		borderRadius: Radius.sm,
		paddingVertical: Spacing.sm,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	statVal: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
	statValMuted: { color: Colors.textSubtle },
	statLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
	gradeLabelRow: { alignItems: "flex-end", paddingTop: Spacing.xs, borderTopWidth: 1, borderTopColor: Colors.border },
	gradeDisplay: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold, color: Colors.primary },
	marksFooter: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingTop: Spacing.xs,
		borderTopWidth: 1,
		borderTopColor: Colors.border,
	},
});
