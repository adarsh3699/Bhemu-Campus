"use client";

import React, { useEffect, useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { pointToGrade, SELECTABLE_GRADES } from "@/lib/grades";
import { computeGradeFromMarks } from "@/lib/marksUtils";
import type { GPASubject } from "@/types";
import type { CustomCutoff } from "@/types/marks";

// ─── Badges ────────────────────────────────────────────────────────────────

function Badge({ children, cls }: { children: React.ReactNode; cls: string }) {
	return <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${cls}`}>{children}</span>;
}

function CreditBadge({ credit, onClickToEdit }: { credit: number; onClickToEdit?: () => void }) {
	if (credit === 0) {
		return (
			<span
				className="relative group text-[10px] font-semibold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20 cursor-pointer"
				onClick={onClickToEdit}
			>
				Credits?
				<span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-max max-w-[180px] rounded-lg bg-neutral-900 border border-white/10 px-2.5 py-1.5 text-[11px] font-normal text-neutral-200 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
					UMS didn&apos;t provide credits — click to add
				</span>
			</span>
		);
	}
	return <Badge cls="text-neutral-300 bg-white/8 border-white/10">{credit} cr</Badge>;
}

function SourceBadge({ source }: { source: "ums" | "manual" | "partial" }) {
	const map = {
		ums: { text: "UMS", cls: "bg-blue-500/10 border-blue-500/20 text-blue-400" },
		manual: { text: "Manual", cls: "bg-teal-500/10 border-teal-500/20 text-teal-400" },
		partial: { text: "Partial", cls: "bg-neutral-500/10 border-neutral-500/20 text-neutral-400" },
	};
	return <Badge cls={map[source].cls}>{map[source].text}</Badge>;
}

function RelativeBadge({ cutoff }: { cutoff: CustomCutoff }) {
	return (
		<span
			className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-[10px] font-bold"
			title={`Relative grading: ${cutoff.gradePoint} grade point set at ${cutoff.cutoffMarks} marks`}
		>
			✦ Relative
		</span>
	);
}

// ─── MarkInput (shared inline input) ──────────────────────────────────────

function MarkInput({
	name,
	label,
	value,
	onChange,
	autoFocus,
}: {
	name: string;
	label: string;
	value: string;
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	autoFocus?: boolean;
}) {
	const ref = useRef<HTMLInputElement>(null);
	useEffect(() => {
		if (autoFocus) ref.current?.focus();
	}, [autoFocus]);
	return (
		<div className="flex flex-col gap-1">
			<label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{label}</label>
			<input
				ref={ref}
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


// ─── SubjectCard props ─────────────────────────────────────────────────────

export interface SubjectEditFormState {
	subjectName: string;
	grade: string; // used in grades mode edit
	credit: string;
	ca: string;
	midTerm: string;
	endTerm: string;
	attendanceMarks: string; // marks mode edit
}

interface SubjectCardProps {
	mode: "grades" | "marks";
	subject: GPASubject;
	isEditing: boolean;
	editFormState: SubjectEditFormState;
	onFormChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onEdit: (id: string | number) => void;
	onSave: (id: string | number) => void;
	onCancel: () => void;
	onDelete: (id: string | number) => void;
	isReadOnly?: boolean;
}

export default function SubjectCard({
	mode,
	subject,
	isEditing,
	editFormState,
	onFormChange,
	onEdit,
	onSave,
	onCancel,
	onDelete,
	isReadOnly = false,
}: SubjectCardProps) {
	const { marks } = subject;
	const hasMarks = marks != null;
	const [focusCredit, setFocusCredit] = useState(false);

	const displayGradePoint = subject.grade > 0 ? subject.grade : null;
	const gradeLabel = displayGradePoint !== null ? pointToGrade(displayGradePoint) : null;

	// Marks mode: running total during edit
	const toN = (v: string) => {
		const n = parseFloat(v);
		return isNaN(n) ? 0 : n;
	};
	const editingTotal =
		isEditing && mode === "marks"
			? toN(editFormState.ca) +
				toN(editFormState.midTerm) +
				toN(editFormState.endTerm) +
				toN(editFormState.attendanceMarks)
			: 0;
	const editingTotalOver = editingTotal > 100;

	// Grades mode: grade override check
	const gradeOverridden =
		hasMarks && marks.total != null && subject.grade !== computeGradeFromMarks(marks.total, marks.customCutoff);


	const handleEdit = () => {
		if (isReadOnly) return;
		setFocusCredit(false);
		onEdit(subject.id);
	};

	return (
		<div
			className={`bg-white/5 rounded-2xl p-3 md:p-4 border transition-all duration-300 hover:bg-white/8 hover:shadow-xl ${
				hasMarks ? "border-white/10" : "border-dashed border-white/5"
			}`}
		>
			{/* Header */}
			<div className="flex justify-between items-start mb-3">
				<div className="flex-1 pr-2">
					<h4 className="text-sm font-bold text-white truncate mb-1" title={subject.subjectName}>
						{subject.subjectName.length > 23 && subject.subjectCode
							? subject.subjectCode
							: subject.subjectName}
					</h4>
					<div className="flex flex-wrap items-center gap-1.5">
						<CreditBadge
							credit={subject.credit}
							onClickToEdit={
								!isReadOnly
									? () => {
											setFocusCredit(true);
											onEdit(subject.id);
										}
									: undefined
							}
						/>
						{hasMarks && <SourceBadge source={marks.source} />}
						{gradeOverridden && (
							<Badge cls="bg-violet-500/10 border-violet-500/20 text-violet-400">Grade ✎</Badge>
						)}
						{marks?.customCutoff && <RelativeBadge cutoff={marks.customCutoff} />}
					</div>
				</div>

				<div className="flex gap-1.5 shrink-0">
					{isEditing ? (
						<button
							onClick={() => {
								setFocusCredit(false);
								onCancel();
							}}
							title="Cancel"
							className="flex items-center justify-center w-7 h-7 rounded-lg bg-neutral-500/10 border border-neutral-500/20 text-neutral-400 hover:bg-neutral-500/20 hover:scale-105 transition-all duration-200"
						>
							<span className="text-[10px] font-bold">✕</span>
						</button>
					) : (
						<>
							<button
								onClick={handleEdit}
								disabled={isReadOnly}
								title={isReadOnly ? "Read-only profile" : "Edit subject"}
								className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 hover:scale-105 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-indigo-500/10"
							>
								<Pencil className="w-3.5 h-3.5" />
							</button>
							<button
								onClick={() => !isReadOnly && onDelete(subject.id)}
								disabled={isReadOnly}
								title={isReadOnly ? "Read-only profile" : "Delete subject"}
								className="flex items-center justify-center w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:scale-105 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-red-500/10"
							>
								<Trash2 className="w-3.5 h-3.5" />
							</button>
						</>
					)}
				</div>
			</div>

			{/* Inline edit form */}
			{isEditing ? (
				<form
					className="mt-3 flex flex-col gap-2"
					onSubmit={(e) => {
						e.preventDefault();
						if (mode === "marks" && editingTotalOver) return;
						onSave(subject.id);
					}}
				>
					{mode === "grades" ? (
						<>
							{/* Name + Credits on one row */}
							<div className="flex gap-2">
								<input
									name="subjectName"
									type="text"
									value={editFormState.subjectName}
									onChange={onFormChange}
									placeholder="Subject name"
									required
									className="flex-1 min-w-0 px-3 py-2 border border-white/10 rounded-lg bg-white/5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 focus:bg-indigo-500/10 transition-all duration-200"
								/>
								<input
									name="credit"
									type="number"
									min="0"
									step="0.5"
									value={editFormState.credit}
									onChange={onFormChange}
									placeholder="Cr"
									required
									className="w-16 shrink-0 px-3 py-2 border border-white/10 rounded-lg bg-white/5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 focus:bg-indigo-500/10 transition-all duration-200"
								/>
							</div>
							{/* Grade select */}
							<select
								name="grade"
								value={editFormState.grade}
								onChange={(e) => onFormChange(e as unknown as React.ChangeEvent<HTMLInputElement>)}
								required
								className="w-full px-3 py-2 border border-white/10 rounded-lg bg-neutral-900 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all duration-200 appearance-none"
							>
								<option value="">Select grade</option>
								{SELECTABLE_GRADES.map(({ grade, gradePoint, performance }) => (
									<option key={grade} value={String(gradePoint)}>
										{grade} ({gradePoint}) — {performance}
									</option>
								))}
							</select>
						</>
					) : (
						<>
							{/* Marks mode: credits + CA/Mid/End/Att */}
							<div className="flex flex-col sm:hidden gap-2">
								<div className="grid grid-cols-3 gap-2">
									<MarkInput
										name="credit"
										label="Credits"
										value={editFormState.credit}
										onChange={onFormChange}
										autoFocus={focusCredit}
									/>
									<MarkInput name="ca" label="CA" value={editFormState.ca} onChange={onFormChange} />
									<MarkInput
										name="midTerm"
										label="Mid"
										value={editFormState.midTerm}
										onChange={onFormChange}
									/>
								</div>
								<div className="grid grid-cols-2 gap-2">
									<MarkInput
										name="endTerm"
										label="End"
										value={editFormState.endTerm}
										onChange={onFormChange}
									/>
									<MarkInput
										name="attendanceMarks"
										label="Att."
										value={editFormState.attendanceMarks}
										onChange={onFormChange}
									/>
								</div>
							</div>
							<div className="hidden sm:grid grid-cols-5 gap-2">
								<MarkInput
									name="credit"
									label="Credits"
									value={editFormState.credit}
									onChange={onFormChange}
									autoFocus={focusCredit}
								/>
								<MarkInput name="ca" label="CA" value={editFormState.ca} onChange={onFormChange} />
								<MarkInput
									name="midTerm"
									label="Mid"
									value={editFormState.midTerm}
									onChange={onFormChange}
								/>
								<MarkInput
									name="endTerm"
									label="End"
									value={editFormState.endTerm}
									onChange={onFormChange}
								/>
								<MarkInput
									name="attendanceMarks"
									label="Att."
									value={editFormState.attendanceMarks}
									onChange={onFormChange}
								/>
							</div>
							{editingTotalOver ? (
								<p className="text-[11px] text-red-400 font-medium">
									Total ({editingTotal}) exceeds 100
								</p>
							) : editingTotal > 0 ? (
								<p className="text-[11px] text-neutral-400">
									Total: <span className="text-white font-semibold">{editingTotal}</span> / 100
								</p>
							) : null}
						</>
					)}
					<button
						type="submit"
						disabled={mode === "marks" ? editingTotalOver : !editFormState.grade}
						className="w-full py-1.5 text-xs font-bold rounded-lg bg-teal-500/20 border border-teal-500/30 text-teal-400 hover:bg-teal-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
					>
						Save
					</button>
				</form>
			) : mode === "grades" ? (
				/* Grades display */
				<>
					<div className="grid grid-cols-3 gap-2 mb-3">
						{[
							{ label: "Grade", value: subject.grade },
							{ label: "Credits", value: subject.credit },
							{ label: "Points", value: (subject.grade * subject.credit).toFixed(1) },
						].map(({ label, value }) => (
							<div
								key={label}
								className="flex flex-col items-center bg-white/5 rounded-xl p-2 border border-white/5"
							>
								<span className="text-sm font-bold text-white leading-none">{value}</span>
								<span className="text-[10px] text-neutral-400 mt-0.5">{label}</span>
							</div>
						))}
					</div>
					<div className="flex justify-end pt-2 border-t border-white/5">
						{gradeLabel && (
							<span className="text-base font-black bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
								{gradeLabel} ({subject.grade})
							</span>
						)}
					</div>
				</>
			) : (
				/* Marks display — shows values if available, — if not */
				<>
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
						{(
							[
								["CA", marks?.ca ?? null],
								["Mid", marks?.midTerm ?? null],
								["End", marks?.endTerm ?? null],
								["Att.", marks?.attendanceMarks ?? null],
							] as [string, number | null][]
						).map(([label, value]) => (
							<div key={label} className="flex flex-col items-center bg-white/5 rounded-xl p-2 border border-white/5">
								<span className={`text-sm font-bold ${value != null ? "text-white" : "text-neutral-600"}`}>
									{value ?? "—"}
								</span>
								<span className="text-[10px] text-neutral-400 mt-0.5">{label}</span>
							</div>
						))}
					</div>
					<div className="flex justify-between items-center pt-2 border-t border-white/5">
						<span className="text-xs text-neutral-400">
							{hasMarks
								? <>Total: <span className="font-bold text-white">{marks!.total ?? "—"}</span></>
								: <span className="text-neutral-500">No marks — click ✎ to add</span>}
						</span>
						{gradeLabel && (
							<span className="text-base font-black bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
								{gradeLabel} ({displayGradePoint})
							</span>
						)}
					</div>
				</>
			)}
		</div>
	);
}
