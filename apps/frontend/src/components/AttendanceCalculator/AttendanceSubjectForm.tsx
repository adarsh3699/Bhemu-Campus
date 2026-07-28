"use client";

import React from "react";
import { Plus, X } from "lucide-react";
import type { AttendanceFormState } from "./hooks/useAttendanceCalculator";

interface AttendanceSubjectFormProps {
	form: AttendanceFormState;
	editingId: string | null;
	saving?: boolean;
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
	onCancel: () => void;
}

const fieldClass =
	"w-full h-10 px-3.5 border border-white/10 rounded-xl bg-white/5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500/60 focus:bg-indigo-500/8 focus:ring-1 focus:ring-indigo-500/20 transition-all duration-200";

const labelClass = "text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5 block";

export default function AttendanceSubjectForm({
	form,
	editingId,
	saving = false,
	onChange,
	onSubmit,
	onCancel,
}: AttendanceSubjectFormProps) {
	return (
		<div className="w-full max-w-4xl mb-5">
			<div className="bg-neutral-900/60 backdrop-blur-xl rounded-2xl border border-white/8 px-5 py-4">
				<form onSubmit={onSubmit}>
					{/* Row 1 (mobile) / Single row (desktop) */}
					<div className="flex flex-col sm:flex-row gap-3 sm:items-end">
						{/* Subject name — full width */}
						<div className="w-full sm:flex-1 sm:min-w-0">
							<label className={labelClass}>
								Subject Name <span className="text-red-400/80">*</span>
							</label>
							<input
								type="text"
								name="name"
								placeholder='e.g. "Mathematics"'
								value={form.name}
								onChange={onChange}
								required
								className={fieldClass}
							/>
						</div>

						{/* Numeric fields: 3-col grid on mobile, inline on desktop */}
						<div className="grid grid-cols-3 sm:flex gap-3 sm:items-end">
							<div className="sm:w-20">
								<label className={labelClass}>
									Total <span className="text-red-400/80">*</span>
								</label>
								<input
									type="number"
									name="totalClasses"
									placeholder="40"
									min="1"
									value={form.totalClasses}
									onChange={onChange}
									required
									className={fieldClass}
								/>
							</div>

							<div className="sm:w-20">
								<label className={labelClass}>
									Attended <span className="text-red-400/80">*</span>
								</label>
								<input
									type="number"
									name="attended"
									placeholder="32"
									min="0"
									max={form.totalClasses || undefined}
									value={form.attended}
									onChange={onChange}
									required
									className={fieldClass}
								/>
							</div>

							<div className="sm:w-22.5">
								<label className={labelClass}>Threshold %</label>
								<input
									type="number"
									name="threshold"
									placeholder="Default"
									min="0"
									max="100"
									value={form.threshold}
									onChange={onChange}
									className={fieldClass}
								/>
							</div>
						</div>

						{/* Action buttons — full width on mobile, inline on desktop */}
						<div className="flex gap-2 sm:items-end">
							<button
								type="submit"
								disabled={saving}
								className="flex items-center justify-center gap-1.5 flex-1 sm:flex-none h-10 px-5 bg-gradient-to-r from-teal-400 to-blue-500 hover:from-teal-500 hover:to-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
							>
								{saving ? (
									<div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
								) : (
									<Plus className="w-3.5 h-3.5" />
								)}
								{saving ? (editingId ? "Updating…" : "Adding…") : editingId ? "Update" : "Add"}
							</button>
							{editingId && (
								<button
									type="button"
									onClick={onCancel}
									className="h-10 w-10 bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/10 rounded-xl transition-all duration-200 flex items-center justify-center shrink-0"
									title="Cancel"
								>
									<X className="w-4 h-4" />
								</button>
							)}
						</div>
					</div>
				</form>
			</div>
		</div>
	);
}
