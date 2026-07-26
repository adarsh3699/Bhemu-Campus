import { useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGpaData } from "@/contexts/GpaDataContext";
import { useMarksData } from "@/contexts/MarksDataContext";
import { useViewMode } from "@/components/GpaCalculator/hooks/useViewMode";
import GpaStatsBar from "@/components/GpaCalculator/GpaStatsBar";
import SemesterTabs from "@/components/GpaCalculator/SemesterTabs";
import SemesterPanel from "@/components/GpaCalculator/SemesterPanel";
import AddSubjectForm, { AddSubjectFormState } from "@/components/GpaCalculator/AddSubjectForm";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { Colors, Spacing, FontSize, FontWeight } from "@/constants/Theme";
import { Layout } from "@/styles";
import { SELECTABLE_GRADES, computeGradeFromMarks, computeTotal } from "@bhemu/shared";
import type { GPASemester } from "@bhemu/shared";
import type { SubjectEditFormState } from "@/components/GpaCalculator/SubjectCard";

const EMPTY_FORM = {
	subjectName: "",
	credit: "",
	grade: "",
	ca: "",
	midTerm: "",
	endTerm: "",
	attendanceMarks: "",
};

export default function GpaTab() {
	const { semesters, loading, isReadOnlyProfile, updateSemesters } = useGpaData();
	const { activeTermId, setActiveTermId, subjects, saveMarks } = useMarksData();
	const { viewMode, setViewMode } = useViewMode();
	// ─── Semester state ──────────────────────────────────────────────────────
	const [addSemesterLoading, setAddSemesterLoading] = useState(false);
	const [deleteSemesterModal, setDeleteSemesterModal] = useState<{
		open: boolean;
		id: string | number;
		name: string;
	}>({ open: false, id: "", name: "" });

	const activeSemesterName = useMemo(
		() => semesters.find((s) => String(s.id) === String(activeTermId))?.name ?? "",
		[semesters, activeTermId]
	);

	const addSemester = useCallback(async () => {
		setAddSemesterLoading(true);
		try {
			const nextNum = semesters.length + 1;
			const newSem: GPASemester = {
				id: Date.now().toString(),
				name: `Semester ${nextNum}`,
				subjects: [],
			};
			await updateSemesters([...semesters, newSem]);
			setActiveTermId(String(newSem.id));
		} finally {
			setAddSemesterLoading(false);
		}
	}, [semesters, updateSemesters, setActiveTermId]);

	const handleDeleteSemesterClick = (id: string | number, name: string) => {
		setDeleteSemesterModal({ open: true, id, name });
	};

	const confirmDeleteSemester = async () => {
		const { id } = deleteSemesterModal;
		setDeleteSemesterModal({ open: false, id: "", name: "" });
		const updated = semesters.filter((s) => String(s.id) !== String(id));
		await updateSemesters(updated);
		if (String(activeTermId) === String(id) && updated.length > 0) {
			setActiveTermId(String(updated[updated.length - 1].id));
		}
	};

	// ─── Subject — grades mode ───────────────────────────────────────────────
	const [addForm, setAddForm] = useState<AddSubjectFormState>(EMPTY_FORM);
	const [addSubjectLoading, setAddSubjectLoading] = useState(false);
	const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
	const [editForm, setEditForm] = useState<SubjectEditFormState>(EMPTY_FORM);
	const [deleteSubjectModal, setDeleteSubjectModal] = useState<{
		open: boolean;
		id: string | number;
		name: string;
	}>({ open: false, id: "", name: "" });

	const handleAddFormChange = useCallback((name: string, value: string) => {
		setAddForm((prev) => ({ ...prev, [name]: value }));
	}, []);

	const handleEditFormChange = useCallback((name: string, value: string) => {
		setEditForm((prev) => ({ ...prev, [name]: value }));
	}, []);


	const addOrUpdateSubject = useCallback(async () => {
		if (!activeTermId || !addForm.subjectName || !addForm.grade || !addForm.credit) return;
		setAddSubjectLoading(true);
		try {
			const gradePoint = parseFloat(addForm.grade);
			const credit = parseFloat(addForm.credit) || 0;
			const newSubject = {
				id: Date.now(),
				subjectName: addForm.subjectName.trim(),
				credit,
				grade: gradePoint,
			};
			const updated = semesters.map((s) =>
				String(s.id) === String(activeTermId) ? { ...s, subjects: [newSubject, ...s.subjects] } : s
			);
			await updateSemesters(updated);
			setAddForm(EMPTY_FORM);
		} finally {
			setAddSubjectLoading(false);
		}
	}, [activeTermId, addForm, semesters, updateSemesters]);

	const handleMarksAddSubject = useCallback(async () => {
		if (!activeTermId || !addForm.subjectName || !addForm.credit) return;
		setAddSubjectLoading(true);
		try {
			const credit = parseFloat(addForm.credit) || 0;
			const toN = (v: string) => {
				const n = parseFloat(v);
				return isNaN(n) ? null : n;
			};
			const ca = toN(addForm.ca);
			const midTerm = toN(addForm.midTerm);
			const endTerm = toN(addForm.endTerm);
			const attendanceMarks = toN(addForm.attendanceMarks);
			const total = computeTotal(ca, midTerm, endTerm, attendanceMarks);
			const hasMarks = total !== null;

			const marks = hasMarks
				? { ca, midTerm, endTerm, attendanceMarks, total, source: "manual" as const, umsGradePoint: null, customCutoff: null }
				: undefined;

			const computedGrade = total !== null ? computeGradeFromMarks(total) : 0;

			const newSubject = {
				id: Date.now(),
				subjectName: addForm.subjectName.trim(),
				credit,
				grade: computedGrade,
				...(marks ? { marks } : {}),
			};

			const updated = semesters.map((s) =>
				String(s.id) === String(activeTermId) ? { ...s, subjects: [newSubject, ...s.subjects] } : s
			);
			await updateSemesters(updated);
			setAddForm(EMPTY_FORM);
		} finally {
			setAddSubjectLoading(false);
		}
	}, [activeTermId, addForm, semesters, updateSemesters]);

	const editSubject = (id: string | number) => {
		const sub = subjects.find((s) => String(s.id) === String(id));
		if (!sub) return;
		const gradeEntry = SELECTABLE_GRADES.find((g) => g.gradePoint === sub.grade);
		setEditForm({
			subjectName: sub.subjectName,
			credit: String(sub.credit),
			grade: gradeEntry ? String(gradeEntry.gradePoint) : "",
			ca: String(sub.marks?.ca ?? ""),
			midTerm: String(sub.marks?.midTerm ?? ""),
			endTerm: String(sub.marks?.endTerm ?? ""),
			attendanceMarks: String(sub.marks?.attendanceMarks ?? ""),
		});
		setEditingSubjectId(String(id));
	};

	const saveGradesSubject = async (id: string | number) => {
		if (!activeTermId || !editForm.grade) return;
		const gradePoint = parseFloat(editForm.grade);
		const credit = parseFloat(editForm.credit) || 0;
		const updated = semesters.map((s) =>
			String(s.id) === String(activeTermId)
				? {
						...s,
						subjects: s.subjects.map((sub) =>
							String(sub.id) === String(id)
								? { ...sub, subjectName: editForm.subjectName, credit, grade: gradePoint }
								: sub
						),
					}
				: s
		);
		await updateSemesters(updated);
		setEditingSubjectId(null);
		setEditForm(EMPTY_FORM);
	};

	const saveMarksSubject = async (id: string | number) => {
		if (!activeTermId) return;
		const credit = parseFloat(editForm.credit) || undefined;
		const toN = (v: string) => {
			const n = parseFloat(v);
			return isNaN(n) ? null : n;
		};
		await saveMarks(
			id,
			{
				ca: toN(editForm.ca),
				midTerm: toN(editForm.midTerm),
				endTerm: toN(editForm.endTerm),
				attendanceMarks: toN(editForm.attendanceMarks),
				source: "manual",
			},
			credit
		);
		// Also update subjectName if changed
		const sub = subjects.find((s) => String(s.id) === String(id));
		if (sub && editForm.subjectName !== sub.subjectName) {
			const updated = semesters.map((s) =>
				String(s.id) === String(activeTermId)
					? {
							...s,
							subjects: s.subjects.map((su) =>
								String(su.id) === String(id) ? { ...su, subjectName: editForm.subjectName } : su
							),
						}
					: s
			);
			await updateSemesters(updated);
		}
		setEditingSubjectId(null);
		setEditForm(EMPTY_FORM);
	};

	const handleSaveSubject = (id: string | number) => {
		if (viewMode === "grades") saveGradesSubject(id);
		else saveMarksSubject(id);
	};

	const confirmSubjectDelete = useCallback((id: string | number, name: string) => {
		setDeleteSubjectModal({ open: true, id, name });
	}, []);

	const handleCancelEdit = useCallback(() => {
		setEditingSubjectId(null);
		setEditForm(EMPTY_FORM);
	}, []);

	const handleDeleteSubjectRequest = useCallback((id: string | number) => {
		const sub = subjects.find((s) => String(s.id) === String(id));
		confirmSubjectDelete(id, sub?.subjectName ?? "this subject");
	}, [subjects, confirmSubjectDelete]);

	const handleDeleteSubject = async () => {
		const { id } = deleteSubjectModal;
		setDeleteSubjectModal({ open: false, id: "", name: "" });
		const updated = semesters.map((s) =>
			String(s.id) === String(activeTermId)
				? { ...s, subjects: s.subjects.filter((sub) => String(sub.id) !== String(id)) }
				: s
		);
		await updateSemesters(updated);
	};

	// ─── Render ──────────────────────────────────────────────────────────────

	if (loading) {
		return (
			<View style={[Layout.flex, local.loadingCenter]}>
				<ActivityIndicator size="large" color={Colors.primary} />
				<Text style={local.loadingText}>Loading GPA data...</Text>
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
				{/* Compact toolbar */}
				<View style={local.toolbar}>
					<Text style={local.toolbarTitle}>GPA Calculator</Text>
				</View>

				<GpaStatsBar semesters={semesters} />

				<SemesterTabs
					semesters={semesters}
					activeSemester={activeTermId}
					isReadOnly={isReadOnlyProfile}
					addSemesterLoading={addSemesterLoading}
					onSelectSemester={(id) => setActiveTermId(String(id))}
					onAddSemester={addSemester}
					onDeleteSemester={handleDeleteSemesterClick}
				/>

				{activeTermId && (
					<AddSubjectForm
						semesterName={activeSemesterName}
						isReadOnly={isReadOnlyProfile}
						formState={addForm}
						onChange={handleAddFormChange}
						onSubmit={viewMode === "grades" ? addOrUpdateSubject : handleMarksAddSubject}
						saving={addSubjectLoading}
						viewMode={viewMode}
						onViewModeChange={setViewMode}
					/>
				)}

				{activeTermId && (
					<SemesterPanel
						mode={viewMode}
						semesterName={activeSemesterName}
						subjects={subjects}
						editingSubjectId={editingSubjectId}
						editFormState={editForm}
						onFormChange={handleEditFormChange}
						onEdit={editSubject}
						onSave={handleSaveSubject}
						onCancel={handleCancelEdit}
						onDelete={handleDeleteSubjectRequest}
						isReadOnly={isReadOnlyProfile}
					/>
				)}

				{semesters.length === 0 && (
					<View style={local.emptyState}>
						<Text style={local.emptyTitle}>No semesters yet</Text>
						<Text style={local.emptyBody}>Tap "Add Semester" to get started!</Text>
					</View>
				)}
			</KeyboardAwareScrollView>

			<ConfirmModal
				isOpen={deleteSemesterModal.open}
				onClose={() => setDeleteSemesterModal({ open: false, id: "", name: "" })}
				onConfirm={confirmDeleteSemester}
				title="Delete Semester"
				message={`Delete "${deleteSemesterModal.name}"? This will permanently remove all subjects.`}
				confirmText="Delete"
				type="danger"
			/>

			<ConfirmModal
				isOpen={deleteSubjectModal.open}
				onClose={() => setDeleteSubjectModal({ open: false, id: "", name: "" })}
				onConfirm={handleDeleteSubject}
				title="Delete Subject"
				message={`Delete "${deleteSubjectModal.name}"? This cannot be undone.`}
				confirmText="Delete"
				type="danger"
			/>
		</SafeAreaView>
	);
}

const local = StyleSheet.create({
	scroll: { padding: Spacing.lg, paddingTop: Spacing.md, paddingBottom: 80, gap: Spacing.xl },
	toolbar: {
		flexDirection: "row",
		alignItems: "center",
	},
	toolbarTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
	loadingCenter: { alignItems: "center", justifyContent: "center", gap: Spacing.md },
	loadingText: { fontSize: FontSize.base, color: Colors.textMuted },
	emptyState: { alignItems: "center", paddingVertical: Spacing.xxxl },
	emptyTitle: {
		fontSize: FontSize.xxl,
		fontWeight: FontWeight.bold,
		color: Colors.primary,
		marginBottom: Spacing.xs,
	},
	emptyBody: { fontSize: FontSize.sm, color: Colors.textSubtle },
});
