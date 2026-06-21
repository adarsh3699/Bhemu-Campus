"use client";

import React from "react";
import { Plus, Pencil } from "lucide-react";
import type { AttendanceFormState } from "./hooks/useAttendanceCalculator";

interface AttendanceSubjectFormProps {
	form: AttendanceFormState;
	editingId: string | null;
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onSubmit: (e: React.FormEvent) => void;
	onCancel: () => void;
}

export default function AttendanceSubjectForm({
	form,
	editingId,
	onChange,
	onSubmit,
	onCancel,
}: AttendanceSubjectFormProps) {
	return (
		<div className="bg-neutral-900/60 backdrop-blur-xl rounded-3xl p-6 md:p-8 mb-6 md:mb-8 shadow-2xl border border-white/10 relative w-full max-w-4xl">
			<div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

			<h3 className="text-xl md:text-2xl font-bold text-white mb-6 text-center flex items-center justify-center flex-wrap gap-2">
				{editingId ? (
					<>
						<Pencil className="w-5 h-5 text-indigo-400" />
						Edit Subject
					</>
				) : (
					<>
						<Plus className="w-5 h-5 text-teal-400" />
						Add Subject
					</>
				)}
			</h3>

			<form onSubmit={onSubmit}>
				<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-end mb-4">
					<div className="flex flex-col gap-2">
						<label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
							Subject Name <span className="text-red-400">*</span>
						</label>
						<input
							type="text"
							name="name"
							placeholder='e.g. "Mathematics"'
							value={form.name}
							onChange={onChange}
							required
							className="px-4 py-3 border border-white/10 rounded-xl bg-white/5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500 focus:bg-indigo-500/10 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
						/>
					</div>

					<div className="flex flex-col gap-2">
						<label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
							Total Classes <span className="text-red-400">*</span>
						</label>
						<input
							type="number"
							name="totalClasses"
							placeholder="e.g. 40"
							min="1"
							value={form.totalClasses}
							onChange={onChange}
							required
							className="px-4 py-3 border border-white/10 rounded-xl bg-white/5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500 focus:bg-indigo-500/10 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
						/>
					</div>

					<div className="flex flex-col gap-2">
						<label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
							Classes Attended <span className="text-red-400">*</span>
						</label>
						<input
							type="number"
							name="attended"
							placeholder="e.g. 32"
							min="0"
							max={form.totalClasses || undefined}
							value={form.attended}
							onChange={onChange}
							required
							className="px-4 py-3 border border-white/10 rounded-xl bg-white/5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500 focus:bg-indigo-500/10 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
						/>
					</div>

					<div className="flex flex-col gap-2">
						<label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
							Custom Threshold (%)
						</label>
						<input
							type="number"
							name="threshold"
							placeholder="Leave blank for default"
							min="0"
							max="100"
							value={form.threshold}
							onChange={onChange}
							className="px-4 py-3 border border-white/10 rounded-xl bg-white/5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500 focus:bg-indigo-500/10 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
						/>
					</div>

					<div className="flex flex-col gap-2">
						<label className="text-xs font-bold text-neutral-300 uppercase tracking-wider invisible">
							Actions
						</label>
						<div className="flex gap-2">
							<button
								type="submit"
								className="flex-1 px-4 py-3 bg-gradient-to-r from-teal-400 to-blue-500 hover:from-teal-500 hover:to-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
							>
								{editingId ? "Update" : "Add Subject"}
							</button>
							{editingId && (
								<button
									type="button"
									onClick={onCancel}
									className="px-4 py-3 bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300"
								>
									Cancel
								</button>
							)}
						</div>
					</div>
				</div>
			</form>
		</div>
	);
}
