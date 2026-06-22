"use client";

import React, { useState } from "react";
import { Plus, X, Puzzle, AlertTriangle } from "lucide-react";
import MarksSubjectCard from "@/components/MarksAnalysis/MarksSubjectCard";
import UMSExtensionModal from "@/components/modal/UMSExtensionModal";
import { calculateGPA } from "@/lib/gpaUtils";
import type { GPASubject } from "@/types";
import type { MarksFormState, SubjectFormState } from "@/components/MarksAnalysis/hooks/useMarksAnalysis";

interface MarksViewPanelProps {
	subjects: GPASubject[];
	semesterName: string;
	editingSubjectId: string | null;
	form: MarksFormState;
	onFormChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onEdit: (id: string | number) => void;
	onSave: (id: string | number) => void;
	onCancel: () => void;
	onDeleteSubject: (id: string | number) => void;
	showSubjectForm: boolean;
	setShowSubjectForm: (v: boolean | ((prev: boolean) => boolean)) => void;
	subjectForm: SubjectFormState;
	onSubjectFormChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onAddSubject: () => void;
}

export default function MarksViewPanel({
	subjects,
	semesterName,
	editingSubjectId,
	form,
	onFormChange,
	onEdit,
	onSave,
	onCancel,
	onDeleteSubject,
	showSubjectForm,
	setShowSubjectForm,
	subjectForm,
	onSubjectFormChange,
	onAddSubject,
}: MarksViewPanelProps) {
	const [extensionModalOpen, setExtensionModalOpen] = useState(false);

	const totalCredits = subjects.reduce((acc, s) => acc + s.credit, 0);

	const toN = (v: string) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
	const runningTotal = toN(subjectForm.ca) + toN(subjectForm.midTerm) + toN(subjectForm.endTerm) + toN(subjectForm.attendanceMarks);
	const totalOver = runningTotal > 100;

	return (
		<>
			<UMSExtensionModal isOpen={extensionModalOpen} onClose={() => setExtensionModalOpen(false)} />

			<div className="w-full max-w-4xl">
				{/* Action row — above the card, clean */}
				<div className="flex items-center justify-between mb-4">
					<button
						onClick={() => setExtensionModalOpen(true)}
						className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-violet-400 border border-violet-400/30 rounded-xl bg-violet-400/5 hover:bg-violet-400/15 transition-all duration-200"
					>
						<Puzzle className="w-3.5 h-3.5" />
						UMS Extension
					</button>
					<button
						onClick={() => !semesterName ? undefined : setShowSubjectForm((v) => !v)}
						disabled={!semesterName}
						title={!semesterName ? "Add a semester first" : undefined}
						className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-400 border border-teal-400/30 rounded-xl bg-teal-400/5 hover:bg-teal-400/10 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-teal-400/5"
					>
						{showSubjectForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
						{showSubjectForm ? "Cancel" : "Add Subject"}
					</button>
				</div>

				{/* No-semester warning */}
				{!semesterName && (
					<div className="flex items-center gap-2.5 px-4 py-3 mb-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
						<AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
						<p className="text-xs text-amber-300">
							No semester selected. Add a semester first using the <span className="font-bold">Add Semester</span> button above.
						</p>
					</div>
				)}

				{/* Add subject form — above the card */}
				{showSubjectForm && (
					<form
						onSubmit={(e) => { e.preventDefault(); if (!totalOver) onAddSubject(); }}
						className="mb-4 p-4 rounded-2xl bg-neutral-900/60 border border-white/10 flex flex-col gap-3"
					>
						<div className="flex gap-3">
							<input
								name="subjectName"
								value={subjectForm.subjectName}
								onChange={onSubjectFormChange}
								placeholder="Subject name *"
								required
								className="flex-1 min-w-0 px-3 py-2 border border-white/10 rounded-lg bg-white/5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-teal-500 transition-all"
							/>
							<input
								name="credit"
								type="number"
								min="0.5"
								step="0.5"
								value={subjectForm.credit}
								onChange={onSubjectFormChange}
								placeholder="Credits *"
								required
								className="w-24 shrink-0 px-3 py-2 border border-white/10 rounded-lg bg-white/5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-teal-500 transition-all"
							/>
						</div>
						<div className="grid grid-cols-4 gap-2">
							{(["ca", "midTerm", "endTerm", "attendanceMarks"] as const).map((field, i) => (
								<input
									key={field}
									name={field}
									type="number"
									min="0"
									step="0.5"
									value={subjectForm[field]}
									onChange={onSubjectFormChange}
									placeholder={["CA", "Mid", "End", "Att."][i]}
									className={`px-3 py-2 border rounded-lg bg-white/5 text-sm text-white placeholder:text-neutral-500 focus:outline-none transition-all ${
										totalOver ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-indigo-500"
									}`}
								/>
							))}
						</div>
						{totalOver ? (
							<p className="text-xs text-red-400 font-medium">Total marks ({runningTotal}) exceed 100.</p>
						) : runningTotal > 0 ? (
							<p className="text-xs text-neutral-400">Total: <span className="text-white font-semibold">{runningTotal}</span> / 100</p>
						) : null}
						<button
							type="submit"
							disabled={totalOver}
							className="w-full py-2 text-sm font-bold rounded-lg bg-teal-500/20 border border-teal-500/30 text-teal-400 hover:bg-teal-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
						>
							Add Subject
						</button>
					</form>
				)}

				{/* Subject cards — header matches SemesterList exactly */}
				<div className="bg-neutral-900/60 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-2xl border border-white/10 relative">
					<div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

					<div className="flex items-center justify-between mb-6 pb-5 border-b border-white/5">
						<div>
							<h3 className="text-xl font-bold text-white leading-none mb-2">{semesterName}</h3>
							<div className="flex gap-2 text-[11px] font-medium text-neutral-400">
								<span className="bg-white/5 px-2.5 py-0.5 rounded-full border border-white/8">
									{subjects.length} subjects
								</span>
								<span className="bg-white/5 px-2.5 py-0.5 rounded-full border border-white/8">
									{totalCredits} credits
								</span>
							</div>
						</div>
						<div className="flex items-baseline gap-1.5">
							<span className="text-3xl font-black bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent leading-none">
								{calculateGPA(subjects)}
							</span>
							<span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">SGPA</span>
						</div>
					</div>

					{subjects.length === 0 ? (
						<div className="text-center py-10 text-neutral-500 text-sm">
							No subjects yet — click <span className="text-teal-400 font-semibold">Add Subject</span> above.
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{subjects.map((subject) => (
								<MarksSubjectCard
									key={String(subject.id)}
									subject={subject}
									isEditing={editingSubjectId === String(subject.id)}
									formState={form}
									onFormChange={onFormChange}
									onEdit={onEdit}
									onSave={onSave}
									onCancel={onCancel}
									onDeleteSubject={onDeleteSubject}
								/>
							))}
						</div>
					)}
				</div>
			</div>
		</>
	);
}
