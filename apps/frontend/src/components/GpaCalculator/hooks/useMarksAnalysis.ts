import React, { useState, useCallback } from "react";
import { useMarksData } from "@/contexts/MarksDataContext";
import { useGpaData } from "@/contexts/GpaDataContext";
import { computeTotal, computeGradeFromMarks } from "@bhemu/shared";
import type { SubjectEditFormState } from "@/components/GpaCalculator/SubjectCard";

// Keep these exports for any remaining consumers
export type MarksFormState = SubjectEditFormState;
export interface SubjectFormState {
	subjectName: string;
	credit: string;
	ca: string;
	midTerm: string;
	endTerm: string;
	attendanceMarks: string;
}

const EMPTY_MARKS_FORM: SubjectEditFormState = { subjectName: "", grade: "", credit: "", ca: "", midTerm: "", endTerm: "", attendanceMarks: "" };
const EMPTY_SUBJECT_FORM: SubjectFormState = { subjectName: "", credit: "", ca: "", midTerm: "", endTerm: "", attendanceMarks: "" };

function toNum(val: string): number | null {
	if (val === "") return null;
	const n = parseFloat(val);
	return isNaN(n) ? null : n;
}

export function useMarksAnalysis() {
	const marksCtx = useMarksData();
	const { semesters, updateSemesters, isReadOnlyProfile } = useGpaData();

	// Marks editing state
	const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
	const [form, setForm] = useState<MarksFormState>(EMPTY_MARKS_FORM);

	// Subject add form state
	const [subjectForm, setSubjectForm] = useState<SubjectFormState>(EMPTY_SUBJECT_FORM);

	const handleFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setForm((prev) => ({ ...prev, [name]: value }));
	}, []);

	const handleSubjectFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setSubjectForm((prev) => ({ ...prev, [name]: value }));
	}, []);

	const startEdit = useCallback(
		(subjectId: string | number) => {
			const id = String(subjectId);
			const subject = marksCtx.subjects.find((s) => String(s.id) === id);
			const m = subject?.marks;
			setEditingSubjectId(id);
			setForm({
				subjectName: subject?.subjectName ?? "",
				grade: subject?.grade != null ? String(subject.grade) : "",
				credit: subject?.credit != null ? String(subject.credit) : "",
				ca: m?.ca != null ? String(m.ca) : "",
				midTerm: m?.midTerm != null ? String(m.midTerm) : "",
				endTerm: m?.endTerm != null ? String(m.endTerm) : "",
				attendanceMarks: m?.attendanceMarks != null ? String(m.attendanceMarks) : "",
			});
		},
		[marksCtx.subjects]
	);

	const cancelEdit = useCallback(() => {
		setEditingSubjectId(null);
		setForm(EMPTY_MARKS_FORM);
	}, []);

	const handleSubmit = useCallback(
		async (subjectId: string | number) => {
			const creditNum = form.credit !== "" ? parseFloat(form.credit) : undefined;
			await marksCtx.saveMarks(
				subjectId,
				{
					ca: toNum(form.ca),
					midTerm: toNum(form.midTerm),
					endTerm: toNum(form.endTerm),
					attendanceMarks: toNum(form.attendanceMarks),
				},
				!isNaN(creditNum ?? NaN) ? creditNum : undefined
			);
			setEditingSubjectId(null);
			setForm(EMPTY_MARKS_FORM);
		},
		[form, marksCtx]
	);

	// ===== SEMESTER MANAGEMENT =====

	const [semesterToDelete, setSemesterToDelete] = useState<{ id: string; name: string } | null>(null);

	const confirmDeleteSemester = useCallback(async () => {
		if (!semesterToDelete) return;
		const updated = semesters.filter((s) => String(s.id) !== semesterToDelete.id);
		await updateSemesters(updated);
		if (marksCtx.activeTermId === semesterToDelete.id) {
			marksCtx.setActiveTermId(updated.length > 0 ? String(updated[updated.length - 1].id) : "");
		}
		setSemesterToDelete(null);
	}, [semesterToDelete, semesters, updateSemesters, marksCtx]);

	// ===== SUBJECT MANAGEMENT =====

	const addSubject = useCallback(async () => {
		const { subjectName, credit, ca, midTerm, endTerm, attendanceMarks } = subjectForm;
		if (isReadOnlyProfile) return;
		if (!marksCtx.activeTermId || !subjectName.trim() || !credit) return;

		const caNum = toNum(ca);
		const midNum = toNum(midTerm);
		const endNum = toNum(endTerm);
		const attNum = toNum(attendanceMarks);
		const total = computeTotal(caNum, midNum, endNum, attNum);
		const hasMarks = total !== null;

		const marks = hasMarks
			? {
					ca: caNum,
					midTerm: midNum,
					endTerm: endNum,
					attendanceMarks: attNum,
					total,
					source: "manual" as const,
					umsGradePoint: null,
					customCutoff: null,
			  }
			: undefined;

		const computedGrade = total !== null ? computeGradeFromMarks(total) : 0;

		const newSubject = {
			id: Date.now(),
			subjectName: subjectName.trim(),
			credit: parseFloat(credit),
			grade: computedGrade,
			...(marks ? { marks } : {}),
		};

		const updated = semesters.map((sem) => {
			if (String(sem.id) !== marksCtx.activeTermId) return sem;
			return { ...sem, subjects: [newSubject, ...sem.subjects] };
		});

		await updateSemesters(updated);
		setSubjectForm(EMPTY_SUBJECT_FORM);
	}, [semesters, marksCtx.activeTermId, subjectForm, updateSemesters, isReadOnlyProfile]);

	const deleteSubject = useCallback(
		async (subjectId: string | number) => {
			const updated = semesters.map((sem) => {
				if (String(sem.id) !== marksCtx.activeTermId) return sem;
				return { ...sem, subjects: sem.subjects.filter((s) => String(s.id) !== String(subjectId)) };
			});
			await updateSemesters(updated);
			if (editingSubjectId === String(subjectId)) {
				setEditingSubjectId(null);
				setForm(EMPTY_MARKS_FORM);
			}
		},
		[semesters, marksCtx.activeTermId, updateSemesters, editingSubjectId]
	);

	return {
		...marksCtx,
		semesters,
		form,
		editingSubjectId,
		handleFormChange,
		handleSubmit,
		startEdit,
		cancelEdit,
		// Subject management
		subjectForm,
		handleSubjectFormChange,
		addSubject,
		deleteSubject,
		// Semester management
		semesterToDelete,
		setSemesterToDelete,
		confirmDeleteSemester,
	};
}
