"use client";

import React, { useState } from "react";
import { Plus, X, Info, Puzzle } from "lucide-react";
import UMSExtensionModal from "@/components/modal/UMSExtensionModal";
import { SELECTABLE_GRADES } from "@bhemu/shared";

const GRADE_COLOR: Record<string, string> = {
	O: "from-emerald-400 to-teal-400",
	"A+": "from-teal-400 to-cyan-400",
	A: "from-cyan-400 to-blue-400",
	"B+": "from-blue-400 to-indigo-400",
	B: "from-indigo-400 to-violet-400",
	C: "from-violet-400 to-purple-400",
	D: "from-amber-400 to-orange-400",
	E: "from-orange-400 to-red-400",
	F: "from-red-500 to-rose-500",
	G: "from-red-500 to-rose-500",
};

export interface AddSubjectFormState {
	subjectName: string;
	credit: string;
	// grades mode
	grade: string;
	// marks mode
	ca: string;
	midTerm: string;
	endTerm: string;
	attendanceMarks: string;
}

interface AddSubjectFormProps {
	mode: "grades" | "marks";
	semesterName: string;
	isReadOnly: boolean;
	formState: AddSubjectFormState;
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onSubmit: () => void | Promise<void>;
	saving?: boolean;
	onInfoClick?: (type: "grade" | "ch", e: React.MouseEvent<HTMLButtonElement>) => void;
}

export default function AddSubjectForm({
	mode,
	semesterName,
	isReadOnly,
	formState,
	onChange,
	onSubmit,
	saving = false,
	onInfoClick,
}: AddSubjectFormProps) {
	const [showForm, setShowForm] = useState(false);
	const [extensionModalOpen, setExtensionModalOpen] = useState(false);

	const toN = (v: string) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
	const runningTotal = toN(formState.ca) + toN(formState.midTerm) + toN(formState.endTerm) + toN(formState.attendanceMarks);
	const totalOver = runningTotal > 100;

	const selectedGrade = SELECTABLE_GRADES.find((g) => String(g.gradePoint) === formState.grade && formState.grade !== "");
	const selectedGradeEntry = SELECTABLE_GRADES.find((g) => g.grade === selectedGrade?.grade);

	const handleGradePick = (gradePoint: string) => {
		onChange({ target: { name: "grade", value: gradePoint } } as React.ChangeEvent<HTMLInputElement>);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (mode === "marks" && totalOver) return;
		if (mode === "grades" && !formState.grade) return;
		await onSubmit();
		setShowForm(false);
	};

	const submitDisabled = saving || (mode === "marks" ? totalOver : !formState.grade);

	return (
		<>
			<UMSExtensionModal isOpen={extensionModalOpen} onClose={() => setExtensionModalOpen(false)} />

			{/* Action row */}
			<div className="flex items-center justify-between mb-4">
				<button
					onClick={() => setExtensionModalOpen(true)}
					className="flex items-center gap-1.5 py-1.5 px-3 text-xs font-semibold text-violet-400 border border-violet-400/30 rounded-xl bg-violet-400/5 hover:bg-violet-400/15 transition-all duration-200"
				>
					<Puzzle className="w-3.5 h-3.5" />
					UMS Extension
				</button>
				<button
					onClick={() => (!isReadOnly && semesterName ? setShowForm((v) => !v) : undefined)}
					disabled={isReadOnly || !semesterName}
					title={isReadOnly ? "Read-only profile" : !semesterName ? "Add a semester first" : undefined}
					className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-400 border border-teal-400/30 rounded-xl bg-teal-400/5 hover:bg-teal-400/10 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-teal-400/5"
				>
					{showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
					{showForm ? "Cancel" : "Add Subject"}
				</button>
			</div>

			{/* Form card */}
			{showForm && !isReadOnly && (
				<form
					onSubmit={handleSubmit}
					className="mb-4 p-4 rounded-2xl bg-neutral-900/60 border border-white/10 flex flex-col gap-3"
				>
					{/* Subject name + credits */}
					<div className="flex gap-3">
						<input
							name="subjectName"
							type="text"
							value={formState.subjectName}
							onChange={onChange}
							placeholder="Subject name *"
							required
							className="flex-1 min-w-0 px-3 py-2 border border-white/10 rounded-lg bg-white/5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500 transition-all"
						/>
						<input
							name="credit"
							type="number"
							min="0"
							step="0.5"
							value={formState.credit}
							onChange={onChange}
							placeholder="Credits *"
							required
							className="w-24 shrink-0 px-3 py-2 border border-white/10 rounded-lg bg-white/5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500 transition-all"
						/>
					</div>

					{/* Grades mode: grade picker */}
					{mode === "grades" && (
						<div className="flex flex-col gap-2">
							<div className="flex items-center gap-1.5">
								<span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Grade</span>
								{onInfoClick && (
									<button type="button" onClick={(e) => onInfoClick("grade", e)} className="text-neutral-400 hover:text-white transition-colors">
										<Info className="w-3.5 h-3.5" />
									</button>
								)}
								{selectedGradeEntry && (
									<span className="ml-auto text-xs text-neutral-400">
										<span className={`font-black bg-gradient-to-r ${GRADE_COLOR[selectedGradeEntry.grade] ?? "from-white to-white"} bg-clip-text text-transparent`}>
											{selectedGradeEntry.grade}
										</span>{" "}— {selectedGradeEntry.performance}
									</span>
								)}
							</div>
							<div className="flex flex-wrap gap-2">
								{SELECTABLE_GRADES.map(({ grade, gradePoint }) => {
									const isSelected = formState.grade === String(gradePoint) && formState.grade !== "";
									const colorClass = GRADE_COLOR[grade] ?? "from-white to-white";
									return (
										<button
											key={grade}
											type="button"
											onClick={() => handleGradePick(isSelected ? "" : String(gradePoint))}
											className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all duration-200 hover:scale-105 active:scale-95 ${
												isSelected
													? `bg-gradient-to-r ${colorClass} text-white border-transparent shadow-sm`
													: "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
											}`}
										>
											<span className={isSelected ? "text-white" : `bg-gradient-to-r ${colorClass} bg-clip-text text-transparent`}>
												{grade}
											</span>
											<span className={`ml-1.5 text-[10px] ${isSelected ? "text-white/70" : "text-neutral-500"}`}>
												{gradePoint}
											</span>
										</button>
									);
								})}
							</div>
						</div>
					)}

					{/* Marks mode: CA / Mid / End / Att inputs */}
					{mode === "marks" && (
						<>
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
								{(["ca", "midTerm", "endTerm", "attendanceMarks"] as const).map((field, i) => (
									<input
										key={field}
										name={field}
										type="number"
										min="0"
										step="0.5"
										value={formState[field]}
										onChange={onChange}
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
						</>
					)}

					<button
						type="submit"
						disabled={submitDisabled}
						className="w-full flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg bg-teal-500/20 border border-teal-500/30 text-teal-400 hover:bg-teal-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
					>
						{saving && <div className="w-3.5 h-3.5 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />}
						{saving ? "Saving..." : "Add Subject"}
					</button>
				</form>
			)}
		</>
	);
}
