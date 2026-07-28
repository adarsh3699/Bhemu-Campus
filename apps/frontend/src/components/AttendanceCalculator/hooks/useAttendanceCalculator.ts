import { useState, useCallback } from "react";
import { useAttendanceData } from "@/contexts/AttendanceDataContext";
import type { AttendanceSubject } from "@bhemu/shared";

export interface AttendanceFormState {
	id: string;
	name: string;
	totalClasses: string;
	attended: string;
	threshold: string;
}

const EMPTY_FORM: AttendanceFormState = {
	id: "",
	name: "",
	totalClasses: "",
	attended: "",
	threshold: "",
};

export function useAttendanceCalculator() {
	const attendanceCtx = useAttendanceData();

	const [form, setForm] = useState<AttendanceFormState>(EMPTY_FORM);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [subjectToDelete, setSubjectToDelete] = useState<AttendanceSubject | null>(null);
	const [thresholdInput, setThresholdInput] = useState("");

	const handleFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setForm((prev) => ({ ...prev, [name]: value }));
	}, []);

	const startEdit = useCallback(
		(subject: AttendanceSubject) => {
			setForm({
				id: subject.id,
				name: subject.name,
				totalClasses: String(subject.totalClasses),
				attended: String(subject.attended),
				threshold: String(subject.threshold),
			});
			setEditingId(subject.id);
		},
		[]
	);

	const cancelEdit = useCallback(() => {
		setForm(EMPTY_FORM);
		setEditingId(null);
	}, []);

	const handleSubmit = useCallback(
		async (e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			const totalClasses = Number(form.totalClasses);
			const attended = Number(form.attended);
			const threshold =
				form.threshold !== "" ? Number(form.threshold) : attendanceCtx.attendanceData?.defaultThreshold ?? 75;

			if (!form.name.trim() || isNaN(totalClasses) || isNaN(attended)) return;
			if (attended > totalClasses) return;

			const subject: AttendanceSubject = {
				id: editingId ?? `att_${Date.now()}`,
				name: form.name.trim(),
				totalClasses,
				attended,
				threshold,
				createdAt: Date.now(),
			};

			await attendanceCtx.addOrUpdateSubject(subject);
			setForm(EMPTY_FORM);
			setEditingId(null);
		},
		[form, editingId, attendanceCtx]
	);

	const handleDeleteClick = useCallback((subject: AttendanceSubject) => {
		setSubjectToDelete(subject);
		setShowDeleteConfirm(true);
	}, []);

	const handleConfirmDelete = useCallback(async () => {
		if (!subjectToDelete) return;
		await attendanceCtx.deleteSubject(subjectToDelete.id);
		setShowDeleteConfirm(false);
		setSubjectToDelete(null);
	}, [subjectToDelete, attendanceCtx]);

	const handleCancelDelete = useCallback(() => {
		setShowDeleteConfirm(false);
		setSubjectToDelete(null);
	}, []);

	const handleUpdateThreshold = useCallback(
		async (e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			const val = Number(thresholdInput);
			if (isNaN(val) || val < 0 || val > 100) return;
			await attendanceCtx.updateDefaultThreshold(val);
			setThresholdInput("");
		},
		[thresholdInput, attendanceCtx]
	);

	const subjects = attendanceCtx.attendanceData
		? Object.values(attendanceCtx.attendanceData.subjects)
			.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
		: [];

	const defaultThreshold = attendanceCtx.attendanceData?.defaultThreshold ?? 75;

	const overallAttendance = subjects.length
		? Math.ceil(
				(subjects.reduce((acc, s) => acc + s.attended, 0) /
					subjects.reduce((acc, s) => acc + s.totalClasses, 0)) *
					100
			)
		: null;

	return {
		// context passthrough
		...attendanceCtx,

		// derived
		subjects,
		defaultThreshold,
		overallAttendance,

		// form state
		form,
		editingId,
		handleFormChange,
		handleSubmit,
		startEdit,
		cancelEdit,

		// delete
		showDeleteConfirm,
		subjectToDelete,
		handleDeleteClick,
		handleConfirmDelete,
		handleCancelDelete,

		// threshold
		thresholdInput,
		setThresholdInput,
		handleUpdateThreshold,
	};
}
