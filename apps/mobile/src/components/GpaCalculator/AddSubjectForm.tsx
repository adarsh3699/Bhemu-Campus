import { useState } from "react";
import {
	View, Text, StyleSheet, TouchableOpacity, TextInput,
	ActivityIndicator,
} from "react-native";
import { Plus, X, BarChart2, Calculator } from "lucide-react-native";
import { SELECTABLE_GRADES } from "@bhemu/shared";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";
import { Inputs, Buttons } from "@/styles";

export interface AddSubjectFormState {
	subjectName: string;
	credit: string;
	grade: string;
	ca: string;
	midTerm: string;
	endTerm: string;
	attendanceMarks: string;
}

interface AddSubjectFormProps {
	mode: "grades" | "marks";
	semesterName: string;
	isReadOnly: boolean;
	formState: AddSubjectFormState;
	onChange: (name: string, value: string) => void;
	onSubmit: () => void | Promise<void>;
	saving?: boolean;
	viewMode: "grades" | "marks";
	onViewModeChange: (mode: "grades" | "marks") => void;
}

export default function AddSubjectForm({
	mode,
	semesterName,
	isReadOnly,
	formState,
	onChange,
	onSubmit,
	saving = false,
	viewMode,
	onViewModeChange,
}: AddSubjectFormProps) {
	const [showForm, setShowForm] = useState(false);

	const toN = (v: string) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
	const runningTotal = toN(formState.ca) + toN(formState.midTerm) + toN(formState.endTerm) + toN(formState.attendanceMarks);
	const totalOver = runningTotal > 100;
	const canSubmit = !saving && (mode === "marks" ? !totalOver && !!formState.subjectName : !!formState.grade && !!formState.subjectName);

	const handleSubmit = async () => {
		if (!canSubmit) return;
		await onSubmit();
		setShowForm(false);
	};

	return (
		<View style={local.wrap}>
			{/* Single action row: mode toggle left, add subject right */}
			<View style={local.actionRow}>
				<View style={local.modeToggle}>
					<TouchableOpacity
						style={[local.modeBtn, viewMode === "marks" && local.modeBtnActive]}
						onPress={() => onViewModeChange("marks")}
						activeOpacity={0.8}
					>
						<BarChart2 size={13} color={viewMode === "marks" ? Colors.textPrimary : Colors.textSubtle} />
						<Text style={[local.modeBtnText, viewMode === "marks" && local.modeBtnTextActive]}>Marks</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[local.modeBtn, viewMode === "grades" && local.modeBtnActive]}
						onPress={() => onViewModeChange("grades")}
						activeOpacity={0.8}
					>
						<Calculator size={13} color={viewMode === "grades" ? Colors.textPrimary : Colors.textSubtle} />
						<Text style={[local.modeBtnText, viewMode === "grades" && local.modeBtnTextActive]}>Grades</Text>
					</TouchableOpacity>
				</View>

				<TouchableOpacity
					style={[local.toggleBtn, (isReadOnly || !semesterName) && Buttons.disabled]}
					onPress={() => !isReadOnly && semesterName && setShowForm((v) => !v)}
					disabled={isReadOnly || !semesterName}
					activeOpacity={0.8}
				>
					{showForm
						? <X size={13} color={Colors.success} />
						: <Plus size={13} color={Colors.success} />
					}
					<Text style={local.toggleBtnText}>{showForm ? "Cancel" : "Add Subject"}</Text>
				</TouchableOpacity>
			</View>

			{showForm && !isReadOnly && (
				<View style={local.formCard}>
					{/* Name + Credits */}
					<View style={local.nameRow}>
						<TextInput
							style={[Inputs.field, { flex: 1 }]}
							value={formState.subjectName}
							onChangeText={(v) => onChange("subjectName", v)}
							placeholder="Subject name *"
							placeholderTextColor={Colors.textSubtle}
							autoFocus
						/>
						<TextInput
							style={[Inputs.field, { width: 80 }]}
							value={formState.credit}
							onChangeText={(v) => onChange("credit", v)}
							placeholder="Credits *"
							placeholderTextColor={Colors.textSubtle}
							keyboardType="decimal-pad"
						/>
					</View>

					{/* Grades mode: grade picker */}
					{mode === "grades" && (
						<View style={local.section}>
							<Text style={local.sectionLabel}>Grade</Text>
							<View style={local.gradeGrid}>
								{SELECTABLE_GRADES.map(({ grade, gradePoint }) => {
									const selected = formState.grade === String(gradePoint);
									return (
										<TouchableOpacity
											key={grade}
											style={[local.gradeChip, selected && local.gradeChipSelected]}
											onPress={() => onChange("grade", selected ? "" : String(gradePoint))}
											activeOpacity={0.7}
										>
											<Text style={[local.gradeText, selected && local.gradeTextSelected]}>
												{grade}
											</Text>
											<Text style={[local.gpText, selected && local.gpTextSelected]}>
												{gradePoint}
											</Text>
										</TouchableOpacity>
									);
								})}
							</View>
						</View>
					)}

					{/* Marks mode: CA/Mid/End/Att */}
					{mode === "marks" && (
						<View style={local.section}>
							<View style={local.marksGrid}>
								{(["ca", "midTerm", "endTerm", "attendanceMarks"] as const).map((field, i) => (
									<TextInput
										key={field}
										style={[Inputs.field, local.markInput, totalOver && local.markInputError]}
										value={formState[field]}
										onChangeText={(v) => onChange(field, v)}
										placeholder={["CA /25", "Mid /20", "End /50", "Att. /5"][i]}
										placeholderTextColor={Colors.textSubtle}
										keyboardType="decimal-pad"
									/>
								))}
							</View>
							{totalOver
								? <Text style={local.totalError}>Total ({runningTotal}) exceeds 100.</Text>
								: runningTotal > 0
									? <Text style={local.totalHint}>Total: <Text style={local.totalVal}>{runningTotal}</Text> / 100</Text>
									: null
							}
						</View>
					)}

					<TouchableOpacity
						style={[local.submitBtn, !canSubmit && Buttons.disabled]}
						onPress={handleSubmit}
						disabled={!canSubmit}
						activeOpacity={0.8}
					>
						{saving && <ActivityIndicator size="small" color={Colors.success} />}
						<Text style={local.submitText}>{saving ? "Saving..." : "Add Subject"}</Text>
					</TouchableOpacity>
				</View>
			)}
		</View>
	);
}

const local = StyleSheet.create({
	wrap: {},
	actionRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: Spacing.sm,
	},

	// Mode toggle (left side of action row)
	modeToggle: {
		flexDirection: "row",
		borderRadius: Radius.xl,
		borderWidth: 1,
		borderColor: Colors.border,
		backgroundColor: Colors.surfaceElevated,
		padding: 3,
		gap: 3,
	},
	modeBtn: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		paddingHorizontal: Spacing.sm,
		paddingVertical: 6,
		borderRadius: Radius.lg,
	},
	modeBtnActive: {
		backgroundColor: Colors.primary,
		shadowColor: Colors.primary,
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.4,
		shadowRadius: 6,
		elevation: 3,
	},
	modeBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textSubtle },
	modeBtnTextActive: { color: Colors.textPrimary },

	// Add Subject button (right side of action row)
	toggleBtn: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.xs,
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.sm,
		borderRadius: Radius.lg,
		borderWidth: 1,
		borderColor: "rgba(20,184,166,0.35)",
		backgroundColor: "rgba(20,184,166,0.07)",
	},
	toggleBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.success },

	formCard: {
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		borderWidth: 1,
		borderColor: Colors.border,
		padding: Spacing.lg,
		gap: Spacing.md,
		marginBottom: Spacing.sm,
	},
	nameRow: { flexDirection: "row", gap: Spacing.sm },

	section: { gap: Spacing.sm },
	sectionLabel: {
		fontSize: FontSize.xs,
		fontWeight: FontWeight.bold,
		color: Colors.textMuted,
		textTransform: "uppercase",
		letterSpacing: 0.8,
	},
	gradeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
	gradeChip: {
		paddingHorizontal: Spacing.sm,
		paddingVertical: 6,
		borderRadius: Radius.sm,
		borderWidth: 1,
		borderColor: Colors.border,
		backgroundColor: Colors.surfaceElevated,
		alignItems: "center",
		minWidth: 44,
	},
	gradeChipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
	gradeText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textMuted },
	gradeTextSelected: { color: Colors.textPrimary },
	gpText: { fontSize: 9, color: Colors.textSubtle, marginTop: 1 },
	gpTextSelected: { color: "rgba(255,255,255,0.7)" },

	marksGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
	markInput: { flex: 1, minWidth: "40%" },
	markInputError: { borderColor: Colors.destructive },
	totalError: { fontSize: FontSize.xs, color: Colors.destructive, fontWeight: FontWeight.medium },
	totalHint: { fontSize: FontSize.xs, color: Colors.textMuted },
	totalVal: { color: Colors.textPrimary, fontWeight: FontWeight.bold },

	submitBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: Spacing.sm,
		paddingVertical: Spacing.sm + 2,
		borderRadius: Radius.md,
		backgroundColor: "rgba(20,184,166,0.12)",
		borderWidth: 1,
		borderColor: "rgba(20,184,166,0.3)",
	},
	submitText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.success },
});
