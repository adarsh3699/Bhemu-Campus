import { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { Calculator } from "lucide-react-native";
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
import { SELECTABLE_GRADES } from "@bhemu/shared";
import type { GPASemester } from "@bhemu/shared";
import type { SubjectEditFormState } from "@/components/GpaCalculator/SubjectCard";

const EMPTY_ADD_FORM: AddSubjectFormState = {
	subjectName: "",
	credit: "",
	grade: "",
	ca: "",
	midTerm: "",
	endTerm: "",
	attendanceMarks: "",
};

const EMPTY_EDIT_FORM: SubjectEditFormState = {
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

	const activeSemesterId = activeTermId;
	const activeSemesterName = semesters.find((s) => String(s.id) === String(activeSemesterId))?.name ?? "";

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
		if (String(activeSemesterId) === String(id) && updated.length > 0) {
			setActiveTermId(String(updated[updated.length - 1].id));
		}
	};

	// ─── Subject — grades mode ───────────────────────────────────────────────
	const [addForm, setAddForm] = useState<AddSubjectFormState>(EMPTY_ADD_FORM);
	const [addSubjectLoading, setAddSubjectLoading] = useState(false);
	const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
	const [editForm, setEditForm] = useState<SubjectEditFormState>(EMPTY_EDIT_FORM);
	const [deleteSubjectModal, setDeleteSubjectModal] = useState<{
		open: boolean;
		id: string | number;
		name: string;
	}>({ open: false, id: "", name: "" });

	const handleAddFormChange = (name: string, value: string) => {
		setAddForm((prev) => ({ ...prev, [name]: value }));
	};

	const handleEditFormChange = (name: string, value: string) => {
		setEditForm((prev) => ({ ...prev, [name]: value }));
	};

	const addOrUpdateSubject = useCallback(async () => {
		if (!activeSemesterId || !addForm.subjectName || !addForm.grade) return;
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
				String(s.id) === String(activeSemesterId) ? { ...s, subjects: [...s.subjects, newSubject] } : s
			);
			await updateSemesters(updated);
			setAddForm(EMPTY_ADD_FORM);
		} finally {
			setAddSubjectLoading(false);
		}
	}, [activeSemesterId, addForm, semesters, updateSemesters]);

	const handleMarksAddSubject = useCallback(async () => {
		if (!activeSemesterId || !addForm.subjectName) return;
		setAddSubjectLoading(true);
		try {
			const credit = parseFloat(addForm.credit) || 0;
			const newSubject = { id: Date.now(), subjectName: addForm.subjectName.trim(), credit, grade: 0 };
			const semWithSubject = semesters.map((s) =>
				String(s.id) === String(activeSemesterId) ? { ...s, subjects: [...s.subjects, newSubject] } : s
			);
			await updateSemesters(semWithSubject);
			// Save marks in one call if any were entered
			const toN = (v: string) => {
				const n = parseFloat(v);
				return isNaN(n) ? null : n;
			};
			const ca = toN(addForm.ca);
			const midTerm = toN(addForm.midTerm);
			const endTerm = toN(addForm.endTerm);
			const attendanceMarks = toN(addForm.attendanceMarks);
			if (ca !== null || midTerm !== null || endTerm !== null || attendanceMarks !== null) {
				await saveMarks(newSubject.id, { ca, midTerm, endTerm, attendanceMarks, source: "manual" }, credit);
			}
			setAddForm(EMPTY_ADD_FORM);
		} finally {
			setAddSubjectLoading(false);
		}
	}, [activeSemesterId, addForm, semesters, updateSemesters, saveMarks]);

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
		if (!activeSemesterId || !editForm.grade) return;
		const gradePoint = parseFloat(editForm.grade);
		const credit = parseFloat(editForm.credit) || 0;
		const updated = semesters.map((s) =>
			String(s.id) === String(activeSemesterId)
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
		setEditForm(EMPTY_EDIT_FORM);
	};

	const saveMarksSubject = async (id: string | number) => {
		if (!activeSemesterId) return;
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
				String(s.id) === String(activeSemesterId)
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
		setEditForm(EMPTY_EDIT_FORM);
	};

	const handleSaveSubject = (id: string | number) => {
		if (viewMode === "grades") saveGradesSubject(id);
		else saveMarksSubject(id);
	};

	const confirmSubjectDelete = (id: string | number, name: string) => {
		setDeleteSubjectModal({ open: true, id, name });
	};

	const handleDeleteSubject = async () => {
		const { id } = deleteSubjectModal;
		setDeleteSubjectModal({ open: false, id: "", name: "" });
		const updated = semesters.map((s) =>
			String(s.id) === String(activeSemesterId)
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
			<ScrollView
				contentContainerStyle={local.scroll}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				<View style={local.pageHeader}>
					<View style={local.pageTitleRow}>
						<View style={local.pageIconBox}>
							<Calculator size={20} color={Colors.primary} />
						</View>
						<View>
							<Text style={local.pageTitle}>GPA Calculator</Text>
							<Text style={local.pageSubtitle}>Calculate your semester GPA and cumulative CGPA</Text>
						</View>
					</View>
				</View>

				<GpaStatsBar semesters={semesters} />

				<SemesterTabs
					semesters={semesters}
					activeSemester={activeSemesterId}
					isReadOnly={isReadOnlyProfile}
					addSemesterLoading={addSemesterLoading}
					onSelectSemester={(id) => setActiveTermId(String(id))}
					onAddSemester={addSemester}
					onDeleteSemester={handleDeleteSemesterClick}
				/>

				{activeSemesterId && (
					<AddSubjectForm
						mode={viewMode === "grades" ? "grades" : "marks"}
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

				{activeSemesterId && (
					<SemesterPanel
						mode={viewMode === "grades" ? "grades" : "marks"}
						semesterName={activeSemesterName}
						subjects={subjects}
						editingSubjectId={editingSubjectId}
						editFormState={editForm}
						onFormChange={handleEditFormChange}
						onEdit={editSubject}
						onSave={handleSaveSubject}
						onCancel={() => {
							setEditingSubjectId(null);
							setEditForm(EMPTY_EDIT_FORM);
						}}
						onDelete={(id) => {
							const sub = subjects.find((s) => String(s.id) === String(id));
							confirmSubjectDelete(id, sub?.subjectName ?? "this subject");
						}}
						isReadOnly={isReadOnlyProfile}
					/>
				)}

				{semesters.length === 0 && (
					<View style={local.emptyState}>
						<Text style={local.emptyTitle}>No semesters yet</Text>
						<Text style={local.emptyBody}>Tap "Add Semester" to get started!</Text>
					</View>
				)}
			</ScrollView>

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
	scroll: { padding: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xl, gap: Spacing.xl },
	pageHeader: {},
	pageTitleRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
	pageIconBox: {
		width: 44,
		height: 44,
		borderRadius: 12,
		backgroundColor: Colors.surfaceElevated,
		borderWidth: 1,
		borderColor: Colors.border,
		alignItems: "center",
		justifyContent: "center",
	},
	pageTitle: {
		fontSize: FontSize.lg,
		fontWeight: FontWeight.bold,
		color: Colors.textPrimary,
	},
	pageSubtitle: {
		fontSize: FontSize.xs,
		color: Colors.textMuted,
		marginTop: 2,
	},
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
