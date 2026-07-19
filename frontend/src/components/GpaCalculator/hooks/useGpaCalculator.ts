import React, { useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useGpaData } from "@/contexts/GpaDataContext";
import { useMarksAnalysis } from "@/components/GpaCalculator/hooks/useMarksAnalysis";
import type { SubjectEditFormState } from "@/components/GpaCalculator/SubjectCard";

type MarksAnalysis = ReturnType<typeof useMarksAnalysis>;

const EMPTY_GRADES_FORM: SubjectEditFormState = { subjectName: "", grade: "", credit: "", ca: "", midTerm: "", endTerm: "", attendanceMarks: "" };

export function useGpaCalculator(marksAnalysis: MarksAnalysis) {
	const { semesters, updateSemesters } = useGpaData();

	// Extract stable refs to avoid re-creating callbacks when the marksAnalysis object reference changes
	const { setActiveTermId: marksSetActiveTermId, addSubject: marksAddSubject } = marksAnalysis;

	// ===== UI STATE =====
	const [viewMode, setViewMode] = useState<"gpa" | "marks">(() => {
		if (typeof window === "undefined") return "marks";
		const stored = localStorage.getItem("gpa_view_mode");
		return stored === "gpa" || stored === "marks" ? stored : "marks";
	});

	const setViewModeAndPersist = useCallback((mode: "gpa" | "marks") => {
		setViewMode(mode);
		localStorage.setItem("gpa_view_mode", mode);
	}, []);

	// Grades-tab subject edit state (add new + edit existing)
	const [gradesForm, setGradesForm] = useState<SubjectEditFormState>(EMPTY_GRADES_FORM);
	const [gradesEditingSubjectId, setGradesEditingSubjectId] = useState<string | null>(null);
	// User-explicit semester selection; null = "use default"
	const [selectedSemesterId, setSelectedSemesterId] = useState<string | number | null>(null);

	// Info modal state
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [modalType, setModalType] = useState<"grade" | "ch" | "">("");

	// Semester delete confirmation state
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [semesterToDelete, setSemesterToDelete] = useState<{ id: string | number; name: string } | null>(null);

	// Subject delete confirmation state
	const [showSubjectDeleteConfirm, setShowSubjectDeleteConfirm] = useState(false);
	const [subjectToDelete, setSubjectToDelete] = useState<{ semesterId: string | number; subjectId: string | number; subjectName: string } | null>(null);
	const pendingSubjectDeleteRef = React.useRef<(() => void) | null>(null);

	// Loading state per action
	const [addSemesterLoading, setAddSemesterLoading] = useState(false);
	const [addSubjectLoading, setAddSubjectLoading] = useState(false);

	// ===== ACTIVE SEMESTER =====
	const searchParams = useSearchParams();
	const semFromUrl = searchParams.get("sem");

	const activeSemester = useMemo(() => {
		if (semesters.length === 0) return null;
		if (semFromUrl) {
			const match = semesters.find((s) => String(s.id) === semFromUrl);
			if (match) return match.id;
		}
		if (selectedSemesterId && semesters.some((s) => s.id === selectedSemesterId)) return selectedSemesterId;
		return semesters[semesters.length - 1].id;
	}, [semFromUrl, selectedSemesterId, semesters]);

	const setActiveSemester = useCallback((id: string | number) => {
		setSelectedSemesterId(id);
		marksSetActiveTermId(String(id));
	}, [marksSetActiveTermId]);

	// ===== INFO MODAL =====
	const handleModalToggle = useCallback((type: "grade" | "ch", event: React.MouseEvent<HTMLButtonElement>) => {
		event.stopPropagation();
		event.preventDefault();
		setModalType(type);
		setIsModalOpen(true);
	}, []);

	const handleModalClose = useCallback(() => setIsModalOpen(false), []);

	// ===== SEMESTER HANDLERS =====
	const addSemester = useCallback(async () => {
		setAddSemesterLoading(true);
		try {
			const newSemester = {
				id: Date.now().toString(),
				name: `Semester ${semesters.length + 1}`,
				subjects: [],
			};
			await updateSemesters([...semesters, newSemester]);
			setActiveSemester(newSemester.id);
		} finally {
			setAddSemesterLoading(false);
		}
	}, [semesters, updateSemesters, setActiveSemester]);

	const deleteSemester = useCallback(
		(semesterId: string | number) => {
			const updated = semesters.filter((s) => s.id !== semesterId);
			updateSemesters(updated);
			if (activeSemester === semesterId) {
				setSelectedSemesterId(updated.length > 0 ? updated[updated.length - 1].id : null);
			}
		},
		[semesters, activeSemester, updateSemesters]
	);

	const handleDeleteSemesterClick = useCallback((semesterId: string | number, semesterName: string) => {
		setSemesterToDelete({ id: semesterId, name: semesterName });
		setShowDeleteConfirm(true);
	}, []);

	const handleConfirmDeleteSemester = useCallback(() => {
		if (semesterToDelete) {
			deleteSemester(semesterToDelete.id);
			setSemesterToDelete(null);
		}
		setShowDeleteConfirm(false);
	}, [semesterToDelete, deleteSemester]);

	const handleCancelDeleteSemester = useCallback(() => {
		setSemesterToDelete(null);
		setShowDeleteConfirm(false);
	}, []);

	// ===== SUBJECT HANDLERS =====
	const handleGradesFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setGradesForm((prev) => ({ ...prev, [name]: value }));
	}, []);

	const saveGradesSubject = useCallback(
		async (subjectId?: string | number) => {
			if (!activeSemester) return;
			const { subjectName, grade, credit } = gradesForm;
			if (!subjectName || !grade || !credit) return;

			const isNew = gradesEditingSubjectId === null;
			const updatedSemesters = semesters.map((semester) => {
				if (semester.id !== activeSemester) return semester;
				if (isNew) {
					return { ...semester, subjects: [{ id: Date.now(), subjectName, grade: parseFloat(grade), credit: parseFloat(credit) }, ...semester.subjects] };
				}
				const editId = subjectId != null ? String(subjectId) : gradesEditingSubjectId;
				return {
					...semester,
					subjects: semester.subjects.map((s) => {
						if (String(s.id) !== editId) return s;
						return { ...s, subjectName, grade: parseFloat(grade), credit: parseFloat(credit) };
					}),
				};
			});

			if (isNew) setAddSubjectLoading(true);
			try { await updateSemesters(updatedSemesters); }
			finally { if (isNew) setAddSubjectLoading(false); }
			setGradesForm(EMPTY_GRADES_FORM);
			setGradesEditingSubjectId(null);
		},
		[gradesForm, semesters, activeSemester, gradesEditingSubjectId, updateSemesters]
	);

	// Called by AddSubjectForm onSubmit — always adds new subject
	const addOrUpdateSubject = useCallback(async () => {
		await saveGradesSubject();
	}, [saveGradesSubject]);

	const editSubject = useCallback((subjectId: string | number) => {
		const activeSem = semesters.find((s) => s.id === activeSemester);
		const subject = activeSem?.subjects.find((s) => String(s.id) === String(subjectId));
		if (!subject) return;
		setGradesEditingSubjectId(String(subjectId));
		setGradesForm({
			subjectName: subject.subjectName,
			grade: subject.grade.toString(),
			credit: subject.credit.toString(),
			ca: "", midTerm: "", endTerm: "", attendanceMarks: "",
		});
	}, [semesters, activeSemester]);

	const cancelGradesEdit = useCallback(() => {
		setGradesEditingSubjectId(null);
		setGradesForm(EMPTY_GRADES_FORM);
	}, []);

	const deleteSubject = useCallback(
		(semesterId: string | number, subjectId: string | number) => {
			const updatedSemesters = semesters.map((s) => {
				if (s.id !== semesterId) return s;
				return { ...s, subjects: s.subjects.filter((sub) => sub.id !== subjectId) };
			});
			updateSemesters(updatedSemesters);
		},
		[semesters, updateSemesters]
	);


	const handleMarksAddSubject = useCallback(async () => {
		setAddSubjectLoading(true);
		try {
			await marksAddSubject();
		} finally {
			setAddSubjectLoading(false);
		}
	}, [marksAddSubject]);

	const confirmSubjectDelete = useCallback((subjectName: string, deleteFn: () => void) => {
		pendingSubjectDeleteRef.current = deleteFn;
		setSubjectToDelete({ semesterId: '', subjectId: '', subjectName });
		setShowSubjectDeleteConfirm(true);
	}, []);

	const handleConfirmDeleteSubject = useCallback(() => {
		pendingSubjectDeleteRef.current?.();
		pendingSubjectDeleteRef.current = null;
		setSubjectToDelete(null);
		setShowSubjectDeleteConfirm(false);
	}, []);

	const handleCancelDeleteSubject = useCallback(() => {
		pendingSubjectDeleteRef.current = null;
		setSubjectToDelete(null);
		setShowSubjectDeleteConfirm(false);
	}, []);

	return {
		// View mode
		viewMode,
		setViewMode: setViewModeAndPersist,

		// Active semester
		activeSemester,
		setActiveSemester,

		// Loading
		addSemesterLoading,
		addSubjectLoading,

		// Semester actions
		addSemester,
		handleDeleteSemesterClick,
		handleConfirmDeleteSemester,
		handleCancelDeleteSemester,
		showDeleteConfirm,
		semesterToDelete,

		// Grades-tab subject form (add new)
		gradesForm,
		handleGradesFormChange,
		addOrUpdateSubject,
		// Grades-tab inline edit
		gradesEditingSubjectId,
		editSubject,
		saveGradesSubject,
		cancelGradesEdit,
		deleteSubject,
		handleMarksAddSubject,

		// Subject delete confirm
		confirmSubjectDelete,
		handleConfirmDeleteSubject,
		handleCancelDeleteSubject,
		showSubjectDeleteConfirm,
		subjectToDelete,

		// Info modal
		isModalOpen,
		modalType,
		handleModalToggle,
		handleModalClose,
	};
}
