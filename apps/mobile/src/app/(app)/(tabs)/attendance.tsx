import { useState, useCallback, useMemo } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useAttendanceData } from "@/contexts/AttendanceDataContext";
import AttendanceSummaryCard from "@/components/AttendanceCalculator/AttendanceSummaryCard";
import AttendanceSubjectForm, { type AttendanceFormState } from "@/components/AttendanceCalculator/AttendanceSubjectForm";
import AttendanceSubjectList from "@/components/AttendanceCalculator/AttendanceSubjectList";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { Colors, Spacing, FontSize, FontWeight } from "@/constants/Theme";
import { Layout } from "@/styles";
import type { AttendanceSubject } from "@bhemu/shared";

const EMPTY_FORM: AttendanceFormState = { id: "", name: "", totalClasses: "", attended: "", threshold: "" };

export default function AttendanceScreen() {
	const { attendanceData, loading, saving, addOrUpdateSubject, deleteSubject, updateDefaultThreshold } =
		useAttendanceData();

	const [form, setForm] = useState<AttendanceFormState>(EMPTY_FORM);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [focusField, setFocusField] = useState<"name" | "total" | undefined>();
	const [deleteModal, setDeleteModal] = useState<{ open: boolean; subject: AttendanceSubject | null }>({
		open: false,
		subject: null,
	});

	const subjects = useMemo(
		() =>
			attendanceData
				? Object.values(attendanceData.subjects).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
				: [],
		[attendanceData]
	);
	const defaultThreshold = attendanceData?.defaultThreshold ?? 75;

	const overallAttendance = useMemo(() => {
		if (!subjects.length) return null;
		const totalClasses = subjects.reduce((acc, s) => acc + s.totalClasses, 0);
		const totalAttended = subjects.reduce((acc, s) => acc + s.attended, 0);
		return totalClasses > 0 ? Math.ceil((totalAttended / totalClasses) * 100) : null;
	}, [subjects]);

	const belowThresholdCount = useMemo(
		() =>
			subjects.filter((s) => {
				const pct = s.totalClasses > 0 ? Math.ceil((s.attended / s.totalClasses) * 100) : 0;
				return pct < (s.threshold ?? defaultThreshold);
			}).length,
		[subjects, defaultThreshold]
	);

	const handleChange = useCallback((name: string, value: string) => {
		setForm((prev) => ({ ...prev, [name]: value }));
	}, []);

	const handleSubmit = useCallback(async () => {
		const totalClasses = Number(form.totalClasses);
		const attended = Number(form.attended);
		const thresholdVal = form.threshold !== "" ? Number(form.threshold) : defaultThreshold;
		if (!form.name.trim() || isNaN(totalClasses) || isNaN(attended) || attended > totalClasses) return;

		const subject: AttendanceSubject = {
			id: editingId ?? `att_${Date.now()}`,
			name: form.name.trim(),
			totalClasses,
			attended,
			threshold: thresholdVal,
			createdAt: Date.now(),
		};
		await addOrUpdateSubject(subject);
		setForm(EMPTY_FORM);
		setEditingId(null);
	}, [form, editingId, defaultThreshold, addOrUpdateSubject]);

	const startEdit = useCallback((subject: AttendanceSubject) => {
		setForm({
			id: subject.id,
			name: subject.name,
			totalClasses: String(subject.totalClasses),
			attended: String(subject.attended),
			threshold: String(subject.threshold),
		});
		setEditingId(subject.id);
		setFocusField("total");
	}, []);

	const cancelEdit = useCallback(() => {
		setForm(EMPTY_FORM);
		setEditingId(null);
		setFocusField(undefined);
	}, []);

	const handleDeleteClick = useCallback((subject: AttendanceSubject) => {
		setDeleteModal({ open: true, subject });
	}, []);

	const handleConfirmDelete = useCallback(async () => {
		if (!deleteModal.subject) return;
		await deleteSubject(deleteModal.subject.id);
		setDeleteModal({ open: false, subject: null });
	}, [deleteModal.subject, deleteSubject]);

	if (loading) {
		return (
			<View style={[Layout.flex, local.loadingCenter]}>
				<ActivityIndicator size="large" color={Colors.primary} />
				<Text style={local.loadingText}>Loading attendance...</Text>
			</View>
		);
	}

	return (
		<SafeAreaView style={Layout.flex} edges={["top"]}>
			<KeyboardAwareScrollView
				bottomOffset={20}
				contentContainerStyle={local.scroll}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				<View style={local.toolbar}>
					<Text style={local.toolbarTitle}>Attendance</Text>
				</View>

				<AttendanceSummaryCard
					overallAttendance={overallAttendance}
					subjectCount={subjects.length}
					belowThresholdCount={belowThresholdCount}
					defaultThreshold={defaultThreshold}
					onUpdateThreshold={updateDefaultThreshold}
				/>

				<AttendanceSubjectForm
					form={form}
					editingId={editingId}
					saving={saving}
					onChange={handleChange}
					onSubmit={handleSubmit}
					onCancel={cancelEdit}
					focusField={focusField}
				/>

				<AttendanceSubjectList
					subjects={subjects}
					defaultThreshold={defaultThreshold}
					onEdit={startEdit}
					onDelete={handleDeleteClick}
				/>
			</KeyboardAwareScrollView>

			<ConfirmModal
				isOpen={deleteModal.open}
				onClose={() => setDeleteModal({ open: false, subject: null })}
				onConfirm={handleConfirmDelete}
				title="Delete Subject"
				message={
					deleteModal.subject
						? `Delete "${deleteModal.subject.name}"? This cannot be undone.`
						: "Delete this subject?"
				}
				confirmText="Delete"
				type="danger"
			/>
		</SafeAreaView>
	);
}

const local = StyleSheet.create({
	scroll: { padding: Spacing.lg, paddingTop: Spacing.md, paddingBottom: 80, gap: Spacing.xl },
	loadingCenter: { alignItems: "center", justifyContent: "center", gap: Spacing.md },
	loadingText: { fontSize: FontSize.base, color: Colors.textMuted },
	toolbar: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	toolbarTitle: {
		fontSize: FontSize.xl,
		fontWeight: FontWeight.bold,
		color: Colors.textPrimary,
	},
});
