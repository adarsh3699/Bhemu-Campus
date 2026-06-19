"use client";

import React from "react";
import { Info } from "lucide-react";

interface FormState {
	subjectName: string;
	grade: string;
	credit: string;
}

interface SubjectFormProps {
	activeSemester: string | number | null;
	activeSemesterName: string;
	isReadOnlyProfile: boolean;
	onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
	formState: FormState;
	onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
	editIndex: number;
	onInfoClick: (type: "grade" | "ch", e: React.MouseEvent<HTMLButtonElement>) => void;
}

const SubjectForm: React.FC<SubjectFormProps> = ({
	activeSemester,
	activeSemesterName,
	isReadOnlyProfile,
	onSubmit,
	formState,
	onChange,
	editIndex,
	onInfoClick,
}) => {
	if (!activeSemester) return null;

	return (
		<div className="bg-neutral-900/60 backdrop-blur-xl rounded-3xl p-6 md:p-8 mb-6 md:mb-10 shadow-2xl border border-white/10 relative w-full max-w-4xl">
			{/* Top glowing gradient border */}
			<div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

			<h3 className="text-xl md:text-2xl font-bold text-white mb-6 text-center flex items-center justify-center flex-wrap gap-2">
				{isReadOnlyProfile ? "View Subjects in " : "Add Subject to "}
				<span className="bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent truncate max-w-[200px]">{activeSemesterName}</span>
				{isReadOnlyProfile && (
					<span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-red-500 to-pink-600 text-white text-xs font-semibold rounded-full shadow-lg shadow-red-950/50">
						Read-Only
					</span>
				)}
			</h3>

			<form onSubmit={onSubmit}>
				<div className="grid grid-cols-1 md:grid-cols-4 gap-5 items-end">
					<div className="flex flex-col gap-2">
						<label
							htmlFor="subjectName"
							className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1"
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
							className="px-4 py-3 border border-white/10 rounded-xl bg-white/5 text-sm transition-all duration-300 text-white placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500 focus:bg-indigo-500/10 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
						/>
					</div>

					<div className="flex flex-col gap-2">
						<label
							htmlFor="grade"
							className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5"
						>
							Grade
							<button
								type="button"
								onClick={(e) => onInfoClick("grade", e)}
								className="text-neutral-400 hover:text-white cursor-pointer transition-all duration-200"
								title="Grade information"
							>
								<Info className="w-4 h-4" />
							</button>
						</label>
						<select
							id="grade"
							name="grade"
							value={formState.grade}
							onChange={onChange}
							disabled={isReadOnlyProfile}
							required
							className="px-4 py-3 border border-white/10 rounded-xl bg-neutral-900 text-sm transition-all duration-300 text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
						>
							<option value="">Select Grade</option>
							<option value="10">O (10)</option>
							<option value="9">A+ (9)</option>
							<option value="8">A (8)</option>
							<option value="7">B+ (7)</option>
							<option value="B">B (6)</option> {/* Wait, old code set 'B' -> value '6', let's write it down */}
							<option value="6">B (6)</option>
							<option value="5">C (5)</option>
							<option value="4">D (4)</option>
							<option value="0">E - Reappear (0)</option>
							<option value="0">F - Fail (0)</option>
							<option value="0">G - Backlog (0)</option>
						</select>
					</div>

					<div className="flex flex-col gap-2">
						<label
							htmlFor="credit"
							className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5"
						>
							Credits
							<button
								type="button"
								onClick={(e) => onInfoClick("ch", e)}
								className="text-neutral-400 hover:text-white cursor-pointer transition-all duration-200"
								title="Credit Hours information"
							>
								<Info className="w-4 h-4" />
							</button>
						</label>
						<input
							id="credit"
							type="number"
							name="credit"
							placeholder={isReadOnlyProfile ? "Read-only profile" : "Credits"}
							min="0"
							step="0.5"
							value={formState.credit}
							onChange={onChange}
							disabled={isReadOnlyProfile}
							required
							className="px-4 py-3 border border-white/10 rounded-xl bg-white/5 text-sm transition-all duration-300 text-white placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500 focus:bg-indigo-500/10 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
						/>
					</div>

					<div className="flex flex-col">
						<button
							type="submit"
							disabled={isReadOnlyProfile}
							className="px-5 py-3 bg-gradient-to-r from-teal-400 to-blue-500 hover:from-teal-500 hover:to-blue-600 text-white border-none rounded-xl text-sm font-bold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:shadow-teal-950/30 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none min-h-[46px] uppercase tracking-wider text-xs"
						>
							{editIndex === -1 ? "Add Subject" : "Update"}
						</button>
					</div>
				</div>
			</form>
		</div>
	);
};

export default SubjectForm;
