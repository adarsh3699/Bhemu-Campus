"use client";

import React from "react";
import { Info } from "lucide-react";
import { SELECTABLE_GRADES } from "@/lib/grades";

interface FormState {
	subjectName: string;
	grade: string;
	credit: string;
}

interface SubjectFormProps {
	activeSemester: string | number | null;
	activeSemesterName: string;
	isReadOnlyProfile: boolean;
	onSubmit: (e: React.SyntheticEvent<HTMLFormElement>) => void;
	formState: FormState;
	onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
	onInfoClick: (type: "grade" | "ch", e: React.MouseEvent<HTMLButtonElement>) => void;
}

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

const SubjectForm: React.FC<SubjectFormProps> = ({
	activeSemester,
	activeSemesterName,
	isReadOnlyProfile,
	onSubmit,
	formState,
	onChange,
	onInfoClick,
}) => {
	if (!activeSemester) return null;

	const selectedGrade = SELECTABLE_GRADES.find(
		(g) => String(g.gradePoint) === formState.grade && formState.grade !== ""
	);
	const selectedGradeEntry = SELECTABLE_GRADES.find((g) => g.grade === selectedGrade?.grade);

	// Synthetic event helper for grade pill clicks
	const handleGradePick = (gradePoint: string) => {
		const syntheticEvent = {
			target: { name: "grade", value: gradePoint },
		} as React.ChangeEvent<HTMLSelectElement>;
		onChange(syntheticEvent);
	};

	return (
		<div className="bg-neutral-900/60 backdrop-blur-xl rounded-3xl p-6 md:p-8 mb-6 md:mb-10 shadow-2xl border border-white/10 relative w-full max-w-4xl text-left">
			<div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

			<h3 className="text-xl md:text-2xl font-bold text-white mb-6 text-center flex items-center justify-center flex-wrap gap-2">
				{isReadOnlyProfile ? "View Subjects in " : "Add Subject to "}
				<span className="bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent truncate max-w-[200px]">
					{activeSemesterName}
				</span>
				{isReadOnlyProfile && (
					<span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-red-500 to-pink-600 text-white text-xs font-semibold rounded-full">
						Read-Only
					</span>
				)}
			</h3>

			<form onSubmit={onSubmit}>
				{/* Mobile: stacked | Desktop: single row */}
				<div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
					{/* Subject name — always full width on mobile, flex-1 on desktop */}
					<div className="flex flex-col gap-2 w-full md:flex-1">
						<label
							htmlFor="subjectName"
							className="text-xs font-bold text-neutral-300 uppercase tracking-wider"
						>
							Subject Name
						</label>
						<input
							id="subjectName"
							type="text"
							name="subjectName"
							placeholder={isReadOnlyProfile ? "Read-only profile" : 'e.g. "Mathematics"'}
							value={formState.subjectName}
							onChange={onChange}
							disabled={isReadOnlyProfile}
							required
							className="w-full px-4 py-2 border border-white/10 rounded-xl bg-white/5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500 focus:bg-indigo-500/10 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
						/>
					</div>

					{/* Credits + Submit — side by side on both mobile and desktop */}
					<div className="flex gap-3 items-end w-full md:w-auto">
						<div className="flex flex-col gap-2 shrink-0">
							<label
								htmlFor="credit"
								className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5"
							>
								Credits
								<button
									type="button"
									onClick={(e) => onInfoClick("ch", e)}
									className="text-neutral-400 hover:text-white transition-colors"
								>
									<Info className="w-3.5 h-3.5" />
								</button>
							</label>
							<input
								id="credit"
								type="number"
								name="credit"
								placeholder="e.g. 4"
								min="0"
								step="0.5"
								value={formState.credit}
								onChange={onChange}
								disabled={isReadOnlyProfile}
								required
								className="w-24 px-4 py-2 border border-white/10 rounded-xl bg-white/5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500 focus:bg-indigo-500/10 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
							/>
						</div>
						<button
							type="submit"
							disabled={isReadOnlyProfile || !formState.grade}
							className="flex-1 md:flex-none px-6 py-2 bg-gradient-to-r from-teal-400 to-blue-500 hover:from-teal-500 hover:to-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 min-h-[38px] whitespace-nowrap"
						>
							Add Subject
						</button>
					</div>
				</div>

				{/* Grade picker */}
				<div className="flex flex-col gap-3">
					<div className="flex items-center gap-2 h-[20px]">
						<label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Grade</label>
						<button
							type="button"
							onClick={(e) => onInfoClick("grade", e)}
							className="text-neutral-400 hover:text-white transition-colors"
						>
							<Info className="w-3.5 h-3.5" />
						</button>
						{selectedGradeEntry && (
							<span className="ml-auto text-xs text-neutral-400 font-medium">
								<span
									className={`font-black text-sm bg-gradient-to-r ${GRADE_COLOR[selectedGradeEntry.grade] ?? "from-white to-white"} bg-clip-text text-transparent`}
								>
									{selectedGradeEntry.grade}
								</span>{" "}
								— {selectedGradeEntry.performance}
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
									disabled={isReadOnlyProfile}
									onClick={() => handleGradePick(isSelected ? "" : String(gradePoint))}
									className={`relative px-3.5 py-2 rounded-xl text-xs font-bold border transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
										isSelected
											? `bg-gradient-to-r ${colorClass} text-white border-transparent shadow-lg`
											: "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10 hover:border-white/20"
									}`}
								>
									<span
										className={
											isSelected
												? "text-white"
												: `bg-gradient-to-r ${colorClass} bg-clip-text text-transparent`
										}
									>
										{grade}
									</span>
									<span
										className={`ml-1.5 text-[10px] ${isSelected ? "text-white/70" : "text-neutral-500"}`}
									>
										{gradePoint}
									</span>
								</button>
							);
						})}
					</div>
				</div>
			</form>
		</div>
	);
};

export default SubjectForm;
