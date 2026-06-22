"use client";

import React from "react";
import { Pencil, Trash2 } from "lucide-react";
import CutoffIndicator from "./CutoffIndicator";
import { pointToGrade } from "@/lib/grades";
import { computeGradeFromMarks } from "@/lib/marksUtils";
import type { GPASubject } from "@/types";

interface MarksSubjectCardProps {
	subject: GPASubject;
	isEditing: boolean;
	formState: { ca: string; midTerm: string; endTerm: string; attendanceMarks: string };
	onFormChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onEdit: (id: string | number) => void;
	onSave: (id: string | number) => void;
	onCancel: () => void;
	onDeleteSubject: (id: string | number) => void;
}

function MarkInput({
	name,
	label,
	value,
	onChange,
}: {
	name: string;
	label: string;
	value: string;
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
	return (
		<div className="flex flex-col gap-1">
			<label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{label}</label>
			<input
				type="number"
				name={name}
				min="0"
				step="0.5"
				value={value}
				onChange={onChange}
				placeholder="—"
				className="w-full px-3 py-2 border border-white/10 rounded-lg bg-white/5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 focus:bg-indigo-500/10 transition-all duration-200"
			/>
		</div>
	);
}

export default function MarksSubjectCard({
	subject,
	isEditing,
	formState,
	onFormChange,
	onEdit,
	onSave,
	onCancel,
	onDeleteSubject,
}: MarksSubjectCardProps) {
	const { marks } = subject;
	const hasMarks = marks != null;

	const displayGradePoint = marks
		? (marks.umsGradePoint ?? (marks.total !== null ? subject.grade : null))
		: subject.grade > 0
			? subject.grade
			: null;
	const gradeLabel = displayGradePoint !== null ? pointToGrade(displayGradePoint) : null;

	const toN = (v: string) => {
		const n = parseFloat(v);
		return isNaN(n) ? 0 : n;
	};
	const editingTotal = isEditing
		? toN(formState.ca) + toN(formState.midTerm) + toN(formState.endTerm) + toN(formState.attendanceMarks)
		: 0;
	const editingTotalOver = editingTotal > 100;

	const sourceBadge = hasMarks
		? marks.source === "ums"
			? { text: "UMS", cls: "bg-blue-500/10 border-blue-500/20 text-blue-400" }
			: marks.source === "manual"
				? { text: "Manual", cls: "bg-teal-500/10 border-teal-500/20 text-teal-400" }
				: { text: "Partial", cls: "bg-neutral-500/10 border-neutral-500/20 text-neutral-400" }
		: null;

	// Grade was manually overridden from Grades tab (doesn't match what marks compute)
	const gradeOverridden = hasMarks && marks.total != null
		&& subject.grade !== computeGradeFromMarks(marks.total, marks.customCutoff);

	return (
		<div
			className={`bg-white/5 rounded-2xl p-5 border transition-all duration-300 hover:bg-white/8 hover:shadow-xl ${
				hasMarks ? "border-white/10" : "border-dashed border-white/5"
			}`}
		>
			{/* Header */}
			<div className="flex justify-between items-start mb-3">
				<div className="flex-1 pr-2">
					<h4 className="text-sm font-bold text-white truncate mb-1">{subject.subjectName}</h4>
					<div className="flex flex-wrap items-center gap-1.5">
						{subject.subjectCode && (
							<span className="text-[10px] text-neutral-300 bg-white/8 px-2 py-0.5 rounded-full border border-white/10">
								{subject.subjectCode}
							</span>
						)}
						<span className="text-[10px] text-neutral-300 font-semibold bg-white/8 px-2 py-0.5 rounded-full border border-white/10">
							{subject.credit} cr
						</span>
						{sourceBadge && (
							<span
								className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${sourceBadge.cls}`}
							>
								{sourceBadge.text}
							</span>
						)}
						{gradeOverridden && (
							<span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold bg-violet-500/10 border-violet-500/20 text-violet-400">
								Grade ✎
							</span>
						)}
						{marks?.customCutoff && <CutoffIndicator cutoff={marks.customCutoff} />}
					</div>
				</div>
				<div className="flex gap-1.5 shrink-0">
					{isEditing ? (
						<button
							onClick={onCancel}
							title="Cancel"
							className="flex items-center justify-center w-7 h-7 rounded-lg bg-neutral-500/10 border border-neutral-500/20 text-neutral-400 hover:bg-neutral-500/20 hover:scale-105 transition-all duration-200"
						>
							<span className="text-[10px] font-bold">✕</span>
						</button>
					) : (
						<>
							<button
								onClick={() => onEdit(subject.id)}
								title="Edit marks"
								className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 hover:scale-105 transition-all duration-200"
							>
								<Pencil className="w-3.5 h-3.5" />
							</button>
							<button
								onClick={() => onDeleteSubject(subject.id)}
								title="Delete subject"
								className="flex items-center justify-center w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:scale-105 transition-all duration-200"
							>
								<Trash2 className="w-3.5 h-3.5" />
							</button>
						</>
					)}
				</div>
			</div>

			{/* Inline edit form */}
			{isEditing ? (
				<div className="mt-3 flex flex-col gap-2">
					<div className="grid grid-cols-4 gap-2">
						<MarkInput name="ca" label="CA" value={formState.ca} onChange={onFormChange} />
						<MarkInput name="midTerm" label="Mid" value={formState.midTerm} onChange={onFormChange} />
						<MarkInput name="endTerm" label="End" value={formState.endTerm} onChange={onFormChange} />
						<MarkInput
							name="attendanceMarks"
							label="Att."
							value={formState.attendanceMarks}
							onChange={onFormChange}
						/>
					</div>
					{editingTotalOver ? (
						<p className="text-[11px] text-red-400 font-medium">Total ({editingTotal}) exceeds 100</p>
					) : editingTotal > 0 ? (
						<p className="text-[11px] text-neutral-400">
							Total: <span className="text-white font-semibold">{editingTotal}</span> / 100
						</p>
					) : null}
					<button
						onClick={() => !editingTotalOver && onSave(subject.id)}
						disabled={editingTotalOver}
						className="w-full py-1.5 text-xs font-bold rounded-lg bg-teal-500/20 border border-teal-500/30 text-teal-400 hover:bg-teal-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
					>
						Save
					</button>
				</div>
			) : hasMarks ? (
				<>
					<div className="grid grid-cols-4 gap-2 mb-3">
						{(
							[
								["CA", marks.ca],
								["Mid", marks.midTerm],
								["End", marks.endTerm],
								["Att.", marks.attendanceMarks],
							] as [string, number | null][]
						).map(([label, value]) => (
							<div
								key={label}
								className="flex flex-col items-center bg-white/5 rounded-xl p-2 border border-white/5"
							>
								<span
									className={`text-sm font-bold ${value != null ? "text-white" : "text-neutral-500"}`}
								>
									{value ?? "—"}
								</span>
								<span className="text-[10px] text-neutral-400 mt-0.5">{label}</span>
							</div>
						))}
					</div>
					<div className="flex justify-between items-center pt-2 border-t border-white/5">
						<span className="text-xs text-neutral-400">
							Total: <span className="font-bold text-white">{marks.total ?? "—"}</span>
						</span>
						{gradeLabel !== null && (
							<span className="text-base font-black bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
								{gradeLabel} ({displayGradePoint})
							</span>
						)}
					</div>
				</>
			) : (
				<div className="flex items-center justify-between mt-2">
					<p className="text-xs text-neutral-500">No marks — click ✎ to add</p>
					{gradeLabel !== null && (
						<span className="text-base font-black bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
							{gradeLabel} ({displayGradePoint})
						</span>
					)}
				</div>
			)}
		</div>
	);
}
