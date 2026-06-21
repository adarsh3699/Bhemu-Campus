"use client";

import React from "react";
import { Plus, X } from "lucide-react";
import MarksSubjectCard from "@/components/MarksAnalysis/MarksSubjectCard";
import MarksTermSummary from "@/components/MarksAnalysis/MarksTermSummary";
import type { GPASubject } from "@/types";
import type { MarksFormState, SubjectFormState } from "@/components/MarksAnalysis/hooks/useMarksAnalysis";

interface MarksViewPanelProps {
	subjects: GPASubject[];
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
	return (
		<div className="w-full max-w-4xl">
			{subjects.length > 0 && <MarksTermSummary subjects={subjects} />}
			<div className="bg-neutral-900/60 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-2xl border border-white/10 relative">
				<div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
				<div className="flex items-center justify-between mb-6">
					<h3 className="text-xl font-bold text-white">
						{subjects.length} subject{subjects.length !== 1 ? "s" : ""}
					</h3>
					<button
						onClick={() => setShowSubjectForm((v) => !v)}
						className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-400 border border-teal-400/30 rounded-xl bg-teal-400/5 hover:bg-teal-400/10 transition-all duration-200"
					>
						{showSubjectForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
						{showSubjectForm ? "Cancel" : "Add Subject"}
					</button>
				</div>

				{/* Add subject form */}
				{showSubjectForm &&
					(() => {
						const toN = (v: string) => {
							const n = parseFloat(v);
							return isNaN(n) ? 0 : n;
						};
						const runningTotal =
							toN(subjectForm.ca) +
							toN(subjectForm.midTerm) +
							toN(subjectForm.endTerm) +
							toN(subjectForm.attendanceMarks);
						const totalOver = runningTotal > 100;
						return (
							<form
								onSubmit={(e) => {
									e.preventDefault();
									if (!totalOver) onAddSubject();
								}}
								className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-3"
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
												totalOver
													? "border-red-500/50 focus:border-red-500"
													: "border-white/10 focus:border-indigo-500"
											}`}
										/>
									))}
								</div>
								{totalOver && (
									<p className="text-xs text-red-400 font-medium">
										Total marks ({runningTotal}) exceed 100. Please correct the values.
									</p>
								)}
								{!totalOver && runningTotal > 0 && (
									<p className="text-xs text-neutral-400">
										Total: <span className="text-white font-semibold">{runningTotal}</span> / 100
									</p>
								)}
								<button
									type="submit"
									disabled={totalOver}
									className="w-full py-2 text-sm font-bold rounded-lg bg-teal-500/20 border border-teal-500/30 text-teal-400 hover:bg-teal-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
								>
									Add Subject
								</button>
							</form>
						);
					})()}

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
	);
}
