import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useGpaData } from "@/hooks/GpaDataContext";
import { Subject } from "@/lib/gpaUtils";
import { useMarksAnalysis } from "@/components/MarksAnalysis/hooks/useMarksAnalysis";

export function useGpaCalculator() {
	const gpaData = useGpaData();
	const { profiles, semesters, updateSemesters, updateActiveProfile } = gpaData;
	const marksAnalysis = useMarksAnalysis();

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

	// Subject form state
	const [newSubject, setNewSubject] = useState({ subjectName: "", grade: "", credit: "" });
	const [editIndex, setEditIndex] = useState<number | string>(-1);
	// User-explicit semester selection; null = "use default"
	const [selectedSemesterId, setActiveSemester] = useState<string | number | null>(null);

	// Info modal state (grade / credit-hour info panels)
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [modalType, setModalType] = useState<"grade" | "ch" | "">("");

	// Edit-subject modal state
	const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

	// Semester delete confirmation state
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [semesterToDelete, setSemesterToDelete] = useState<{ id: string | number; name: string } | null>(null);

	// Subject delete confirmation state
	const [showSubjectDeleteConfirm, setShowSubjectDeleteConfirm] = useState(false);
	const [subjectToDelete, setSubjectToDelete] = useState<{ semesterId: string | number; subjectId: string | number; subjectName: string } | null>(null);
	// Stores the actual delete fn to call on confirm (handles both GPA and Marks tabs)
	const pendingSubjectDeleteRef = React.useRef<(() => void) | null>(null);

	// ===== ACTIVE SEMESTER SYNC =====
	const searchParams = useSearchParams();
	const semFromUrl = searchParams.get("sem");

	// Derived: URL param > user selection > last semester
	const activeSemester = useMemo(() => {
		if (semesters.length === 0) return null;
		if (semFromUrl) {
			const match = semesters.find((s) => String(s.id) === semFromUrl);
			if (match) return match.id;
		}
		if (selectedSemesterId && semesters.some((s) => s.id === selectedSemesterId)) return selectedSemesterId;
		return semesters[semesters.length - 1].id;
	}, [semFromUrl, selectedSemesterId, semesters]);

	// ===== INFO MODAL HANDLERS =====

	const handleModalToggle = useCallback((type: "grade" | "ch", event: React.MouseEvent<HTMLButtonElement>) => {
		event.stopPropagation();
		event.preventDefault();
		setModalType(type);
		setIsModalOpen(true);
	}, []);

	const handleModalClose = useCallback(() => {
		setIsModalOpen(false);
	}, []);

	// ===== SEMESTER HANDLERS =====

	const addSemester = useCallback(async () => {
		const newSemester = {
			id: Date.now().toString(),
			name: `Semester ${semesters.length + 1}`,
			subjects: [],
		};
		await updateSemesters([...semesters, newSemester]);
		setActiveSemester(newSemester.id);
	}, [semesters, updateSemesters]);

	const deleteSemester = useCallback(
		(semesterId: string | number) => {
			const updated = semesters.filter((s) => s.id !== semesterId);
			updateSemesters(updated);
			if (activeSemester === semesterId) {
				setActiveSemester(updated.length > 0 ? updated[updated.length - 1].id : null);
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

	const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
		const { name, value } = e.target;
		setNewSubject((prev) => ({ ...prev, [name]: value }));
	}, []);

	const addOrUpdateSubject = useCallback(
		(e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			if (!activeSemester) return;

			const { subjectName, grade, credit } = newSubject;
			if (!subjectName || !grade || !credit) return;

			const isNew = editIndex === -1;

			const updatedSemesters = semesters.map((semester) => {
				if (semester.id !== activeSemester) return semester;
				if (isNew) {
					const subjectData = {
						id: Date.now(),
						subjectName,
						grade: parseFloat(grade),
						credit: parseFloat(credit),
					};
					return { ...semester, subjects: [...semester.subjects, subjectData] };
				}
				return {
					...semester,
					subjects: semester.subjects.map((s) => {
						if (s.id !== editIndex) return s;
						// Preserve existing marks — only update grade/name/credit
						return { ...s, subjectName, grade: parseFloat(grade), credit: parseFloat(credit) };
					}),
				};
			});

			updateSemesters(updatedSemesters);
			setNewSubject({ subjectName: "", grade: "", credit: "" });
			setEditIndex(-1);
			setIsUpdateModalOpen(false);
		},
		[newSubject, semesters, activeSemester, editIndex, updateSemesters]
	);

	const editSubject = useCallback((semesterId: string | number, subject: Subject) => {
		setEditIndex(subject.id);
		setActiveSemester(semesterId);
		setNewSubject({
			subjectName: subject.subjectName,
			grade: subject.grade.toString(),
			credit: subject.credit.toString(),
		});
		setIsUpdateModalOpen(true);
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

	// Keep marks context in sync with the active semester
	useEffect(() => {
		if (activeSemester != null) {
			marksAnalysis.setActiveTermId(String(activeSemester));
		}
	}, [activeSemester]); // eslint-disable-line react-hooks/exhaustive-deps

	const handleSetActiveSemester = useCallback((id: string | number) => {
		setActiveSemester(id);
	}, []);

	return {
		// Pass-through from useGpaData (view needs these directly)
		...gpaData,

		// View mode toggle
		viewMode,
		setViewMode: setViewModeAndPersist,

		// Marks analysis
		marksSubjects: marksAnalysis.subjects,
		marksEditingSubjectId: marksAnalysis.editingSubjectId,
		marksForm: marksAnalysis.form,
		handleMarksFormChange: marksAnalysis.handleFormChange,
		handleMarksSave: marksAnalysis.handleSubmit,
		handleMarksEdit: marksAnalysis.startEdit,
		handleMarksCancel: marksAnalysis.cancelEdit,
		handleDeleteSubjectFromMarks: marksAnalysis.deleteSubject,
		marksShowSubjectForm: marksAnalysis.showSubjectForm,
		marksSetShowSubjectForm: marksAnalysis.setShowSubjectForm,
		marksSubjectForm: marksAnalysis.subjectForm,
		handleMarksSubjectFormChange: marksAnalysis.handleSubjectFormChange,
		handleMarksAddSubject: marksAnalysis.addSubject,

		// Info modal
		isModalOpen,
		modalType,
		handleModalToggle,
		handleModalClose,

		// Edit-subject modal
		isUpdateModalOpen,
		setIsUpdateModalOpen,

		// Semester delete confirm
		showDeleteConfirm,
		semesterToDelete,
		handleDeleteSemesterClick,
		handleConfirmDeleteSemester,
		handleCancelDeleteSemester,

		// Subject delete confirm
		showSubjectDeleteConfirm,
		subjectToDelete,
		confirmSubjectDelete,
		handleConfirmDeleteSubject,
		handleCancelDeleteSubject,

		// Subject form
		newSubject,
		setNewSubject,
		editIndex,
		activeSemester,
		setActiveSemester: handleSetActiveSemester,
		handleInputChange,
		addOrUpdateSubject,
		editSubject,
		deleteSubject,

		// Semester actions
		addSemester,

		// Unused but kept for potential future use via ...gpaData spread
		profiles,
		updateActiveProfile,
	};
}
