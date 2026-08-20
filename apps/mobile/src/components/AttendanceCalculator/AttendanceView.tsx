import { useState, useCallback, useMemo } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useAttendanceData } from "@/contexts/AttendanceDataContext";
import AttendanceSummaryCard from "@/components/AttendanceCalculator/AttendanceSummaryCard";
import AttendanceSubjectForm, { type AttendanceFormState } from "@/components/AttendanceCalculator/AttendanceSubjectForm";
import AttendanceSubjectList from "@/components/AttendanceCalculator/AttendanceSubjectList";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { Colors, Spacing, FontSize } from "@/constants/Theme";
import { Layout } from "@/styles";
import type { AttendanceSubject } from "@bhemu/shared";

const EMPTY_FORM: AttendanceFormState = { id: "", name: "", totalClasses: "", attended: "", threshold: "" };

export default function AttendanceView() {
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
		const totalClasses = subjects.reduce((acc, subject) => acc + subject.totalClasses, 0);
		const totalAttended = subjects.reduce((acc, subject) => acc + subject.attended, 0);
		return totalClasses > 0 ? Math.ceil((totalAttended / totalClasses) * 100) : null;
	}, [subjects]);

	const belowThresholdCount = useMemo(
		() =>
			subjects.filter((subject) => {
				const percentage = subject.totalClasses > 0 ? Math.ceil((subject.attended / subject.totalClasses) * 100) : 0;
				return percentage < (subject.threshold ?? defaultThreshold);
			}).length,
		[subjects, defaultThreshold]
	);

	const handleChange = useCallback((name: string, value: string) => {
		setForm((previous) => ({ ...previous, [name]: value }));
	}, []);

	const handleSubmit = useCallback(async () => {
		const totalClasses = Number(form.totalClasses);
		const attended = Number(form.attended);
		const parsedThreshold = Number(form.threshold);
		const threshold = !isNaN(parsedThreshold) && form.threshold.trim() !== "" ? parsedThreshold : defaultThreshold;
		if (!form.name.trim() || isNaN(totalClasses) || isNaN(attended) || attended > totalClasses) return;

		const subject: AttendanceSubject = {
			id: editingId ?? `att_${Date.now()}`,
			name: form.name.trim(),
			totalClasses,
			attended,
			threshold,
			createdAt: Date.now(),
		};
		await addOrUpdateSubject(subject);
		setForm(EMPTY_FORM);
		setEditingId(null);
	}, [addOrUpdateSubject, defaultThreshold, editingId, form]);

	const startEdit = useCallback((subject: AttendanceSubject) => {
		setForm({
			id: subject.id,
			name: subject.name,
			totalClasses: String(subject.totalClasses),
			attended: String(subject.attended),
			threshold: subject.threshold !== undefined && !isNaN(subject.threshold) ? String(subject.threshold) : "",
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
		<>
			<KeyboardAwareScrollView
				style={Layout.flex}
				bottomOffset={20}
				contentContainerStyle={local.scroll}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
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
		</>
	);
}

const local = StyleSheet.create({
	scroll: { padding: Spacing.lg, paddingTop: Spacing.md, paddingBottom: 80, gap: Spacing.xl },
	loadingCenter: { alignItems: "center", justifyContent: "center", gap: Spacing.md },
	loadingText: { fontSize: FontSize.base, color: Colors.textMuted },
});
