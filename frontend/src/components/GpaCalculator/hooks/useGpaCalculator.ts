import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useGpaData } from "@/hooks/GpaDataContext";
import { GPAProfile } from "@/firebase/gpaService";
import { Subject } from "@/lib/gpaUtils";
import { useMarksAnalysis } from "@/components/MarksAnalysis/hooks/useMarksAnalysis";

export function useGpaCalculator() {
	const gpaData = useGpaData();
	const { profiles, semesters, updateSemesters, shareProfileWithUser, updateActiveProfile } = gpaData;
	const marksAnalysis = useMarksAnalysis();

	// ===== UI STATE =====
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [viewMode, setViewMode] = useState<"gpa" | "marks">(() => {
		if (typeof window === "undefined") return "marks";
		return (localStorage.getItem("gpa_view_mode") as "gpa" | "marks") ?? "marks";
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

	// Share modal state
	const [isShareModalOpen, setIsShareModalOpen] = useState(false);
	const [profileToShare, setProfileToShare] = useState<GPAProfile | null>(null);

	// Semester delete confirmation state
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [semesterToDelete, setSemesterToDelete] = useState<{ id: string | number; name: string } | null>(null);

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

	// ===== DRAWER / PROFILE HANDLERS =====

	const toggleDrawer = useCallback(() => {
		setDrawerOpen((open) => !open);
	}, []);

	const handleUpdateActiveProfile = useCallback(
		(id: string | number) => {
			updateActiveProfile(id);
			setDrawerOpen(false);
		},
		[updateActiveProfile]
	);

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

	// ===== SHARE HANDLERS =====

	const handleShareProfile = useCallback(
		(profileId: string | number) => {
			const profile = profiles.find((p) => p.id === profileId);
			if (profile) {
				setProfileToShare(profile);
				setIsShareModalOpen(true);
			}
		},
		[profiles]
	);

	const handleShareWithUser = useCallback(
		async (emailOrAction: string, permission: string, action = "share") => {
			if (profileToShare) {
				await shareProfileWithUser(profileToShare, emailOrAction, permission as "read" | "edit", action);
			}
		},
		[shareProfileWithUser, profileToShare]
	);

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
			const subjectData = {
				id: isNew ? Date.now() : (editIndex as number),
				subjectName,
				grade: parseFloat(grade),
				credit: parseFloat(credit),
			};

			const updatedSemesters = semesters.map((semester) => {
				if (semester.id !== activeSemester) return semester;
				if (isNew) {
					return { ...semester, subjects: [...semester.subjects, subjectData] };
				}
				return {
					...semester,
					subjects: semester.subjects.map((s) => (s.id === editIndex ? subjectData : s)),
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

		// Marks analysis (spread all marks state/actions)
		marksSubjects: marksAnalysis.subjects,
		marksEditingSubjectId: marksAnalysis.editingSubjectId,
		marksForm: marksAnalysis.form,
		handleMarksFormChange: marksAnalysis.handleFormChange,
		handleMarksSave: marksAnalysis.handleSubmit,
		handleMarksEdit: marksAnalysis.startEdit,
		handleMarksCancel: marksAnalysis.cancelEdit,
		handleDeleteSubjectFromMarks: marksAnalysis.deleteSubject,
		// Add-subject form in marks view
		marksShowSubjectForm: marksAnalysis.showSubjectForm,
		marksSetShowSubjectForm: marksAnalysis.setShowSubjectForm,
		marksSubjectForm: marksAnalysis.subjectForm,
		handleMarksSubjectFormChange: marksAnalysis.handleSubjectFormChange,
		handleMarksAddSubject: marksAnalysis.addSubject,

		// Drawer
		drawerOpen,
		setDrawerOpen,
		toggleDrawer,
		handleUpdateActiveProfile,

		// Info modal
		isModalOpen,
		modalType,
		handleModalToggle,
		handleModalClose,

		// Edit-subject modal
		isUpdateModalOpen,
		setIsUpdateModalOpen,

		// Share modal
		isShareModalOpen,
		setIsShareModalOpen,
		profileToShare,
		setProfileToShare,
		handleShareProfile,
		handleShareWithUser,

		// Semester delete confirm
		showDeleteConfirm,
		semesterToDelete,
		handleDeleteSemesterClick,
		handleConfirmDeleteSemester,
		handleCancelDeleteSemester,

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
	};
}
