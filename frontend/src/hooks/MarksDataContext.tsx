"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { useGpaData } from "@/hooks/GpaDataContext";
import { useMessage } from "@/components/common/MessageProvider";
import { computeGradeFromMarks, computeTotal } from "@/lib/marksUtils";
import type { SubjectMarks } from "@/types/marks";
import type { GPASubject } from "@/types";

interface MarksDataContextValue {
	activeTermId: string | null;
	setActiveTermId: (termId: string) => void;
	saving: boolean;
	subjects: GPASubject[]; // all subjects for active semester, marks embedded
	saveMarks: (subjectId: string | number, marks: Partial<SubjectMarks>, credit?: number) => Promise<void>;
	clearMarks: (subjectId: string | number) => Promise<void>;
}

const MarksDataContext = createContext<MarksDataContextValue | undefined>(undefined);

export function useMarksData(): MarksDataContextValue {
	const ctx = useContext(MarksDataContext);
	if (!ctx) throw new Error("useMarksData must be used within MarksDataProvider");
	return ctx;
}

export function MarksDataProvider({ children }: { children: React.ReactNode }) {
	const { semesters, updateSemesters } = useGpaData();
	const { showMessage } = useMessage();

	const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	const activeTermId = useMemo(() => {
		if (semesters.length === 0) return null;
		const lastId = String(semesters[semesters.length - 1].id);
		if (selectedTermId && semesters.some((s) => String(s.id) === selectedTermId)) return selectedTermId;
		return lastId;
	}, [selectedTermId, semesters]);

	const activeSemester = useMemo(
		() => semesters.find((s) => String(s.id) === activeTermId) ?? null,
		[semesters, activeTermId]
	);

	// All subjects for the active semester (with marks embedded)
	const subjects = useMemo(() => activeSemester?.subjects ?? [], [activeSemester]);

	const saveMarks = useCallback(
		async (subjectId: string | number, incoming: Partial<SubjectMarks>, credit?: number) => {
			if (!activeSemester) return;
			setSaving(true);
			try {
				const id = String(subjectId);
				const existing = activeSemester.subjects.find((s) => String(s.id) === id);
				const prev = existing?.marks ?? null;

				const ca = incoming.ca !== undefined ? incoming.ca : prev?.ca ?? null;
				const midTerm = incoming.midTerm !== undefined ? incoming.midTerm : prev?.midTerm ?? null;
				const endTerm = incoming.endTerm !== undefined ? incoming.endTerm : prev?.endTerm ?? null;
				const attendanceMarks = incoming.attendanceMarks !== undefined ? incoming.attendanceMarks : prev?.attendanceMarks ?? null;
				const total = computeTotal(ca, midTerm, endTerm, attendanceMarks);

				const umsGradePoint = incoming.umsGradePoint !== undefined ? incoming.umsGradePoint : prev?.umsGradePoint ?? null;
				// Once edited from the frontend, always "manual" — strip UMS provenance.
				const source = incoming.source ?? "manual";

				// customCutoff is ONLY set during UMS sync (relative grading) — never writable from frontend.
				const customCutoff = prev?.customCutoff ?? null;

				const computedGradePoint = total !== null
					? computeGradeFromMarks(total, customCutoff)
					: umsGradePoint;

				const marks: SubjectMarks = {
					ca, midTerm, endTerm, attendanceMarks, total,
					source, umsGradePoint, customCutoff,
				};

				const updatedSemesters = semesters.map((sem) => {
					if (String(sem.id) !== activeTermId) return sem;
					return {
						...sem,
						subjects: sem.subjects.map((s) => {
							if (String(s.id) !== id) return s;
							return {
								...s,
								marks,
								...(credit !== undefined ? { credit } : {}),
								// Update grade in GPA if we have a computed value
								...(computedGradePoint !== null ? { grade: computedGradePoint } : {}),
							};
						}),
					};
				});

				await updateSemesters(updatedSemesters);
			} catch {
				showMessage("Failed to save marks. Please try again.", "error");
			} finally {
				setSaving(false);
			}
		},
		[activeSemester, activeTermId, semesters, updateSemesters, showMessage]
	);

	const clearMarks = useCallback(
		async (subjectId: string | number) => {
			if (!activeSemester) return;
			setSaving(true);
			try {
				const id = String(subjectId);
				const updatedSemesters = semesters.map((sem) => {
					if (String(sem.id) !== activeTermId) return sem;
					return {
						...sem,
						subjects: sem.subjects.map((s) => {
							if (String(s.id) !== id) return s;
							const { marks: _m, ...rest } = s;
							return rest;
						}),
					};
				});
				await updateSemesters(updatedSemesters);
			} catch {
				showMessage("Failed to clear marks. Please try again.", "error");
			} finally {
				setSaving(false);
			}
		},
		[activeSemester, activeTermId, semesters, updateSemesters, showMessage]
	);

	const value = useMemo<MarksDataContextValue>(
		() => ({ activeTermId, setActiveTermId: setSelectedTermId, saving, subjects, saveMarks, clearMarks }),
		[activeTermId, saving, subjects, saveMarks, clearMarks]
	);

	return <MarksDataContext.Provider value={value}>{children}</MarksDataContext.Provider>;
}
