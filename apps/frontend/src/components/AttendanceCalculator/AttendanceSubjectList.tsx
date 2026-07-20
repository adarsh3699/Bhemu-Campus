"use client";

import React from "react";
import { Pencil, Trash2, AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";
import type { AttendanceSubject } from "@/types/attendance";

interface AttendanceSubjectListProps {
	subjects: AttendanceSubject[];
	defaultThreshold: number;
	onEdit: (subject: AttendanceSubject) => void;
	onDelete: (subject: AttendanceSubject) => void;
}

type Status = "safe" | "warning" | "danger";

function getStatus(percentage: number, threshold: number): Status {
	if (percentage >= threshold) return "safe";
	if (percentage >= 75) return "warning"; // below threshold but ≥75
	return "danger"; // below 75
}

const statusStyles: Record<Status, { text: string; bar: string; badge: string; row: string; icon: React.ReactNode }> = {
	safe: {
		text: "text-teal-400",
		bar: "from-teal-400 to-blue-500",
		badge: "text-neutral-300 bg-white/8 border-white/10",
		row: "",
		icon: <CheckCircle className="w-3.5 h-3.5 text-teal-400 shrink-0" />,
	},
	warning: {
		text: "text-amber-400",
		bar: "from-amber-400 to-orange-400",
		badge: "text-amber-300 bg-amber-500/10 border-amber-500/20",
		row: "bg-amber-500/3",
		icon: <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
	},
	danger: {
		text: "text-red-400",
		bar: "from-red-500 to-orange-500",
		badge: "text-red-300 bg-red-500/10 border-red-500/20",
		row: "bg-red-500/3",
		icon: <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />,
	},
};

function AttendanceBar({ percentage, status }: { percentage: number; status: Status }) {
	return (
		<div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden min-w-[60px]">
			<div
				className={`h-full rounded-full bg-gradient-to-r transition-all duration-500 ${statusStyles[status].bar}`}
				style={{ width: `${Math.min(percentage, 100)}%` }}
			/>
		</div>
	);
}

function computeRow(subject: AttendanceSubject, defaultThreshold: number) {
	const threshold = subject.threshold ?? defaultThreshold;
	// College truncates decimals upward: 80.1% counts as 81%
	const percentage =
		subject.totalClasses > 0
			? Math.ceil((subject.attended / subject.totalClasses) * 100)
			: 0;
	const status = getStatus(percentage, threshold);
	// Each class attended also increases total — solve: ceil((a+n)/(t+n)*100) >= threshold
	const needed =
		status !== "safe" && subject.totalClasses > 0
			? (() => {
					let n = 0;
					while (
						Math.ceil(
							((subject.attended + n) / (subject.totalClasses + n)) * 100
						) < threshold
					) {
						n++;
						if (n > 1000) break;
					}
					return n;
				})()
			: 0;
	// Each class skipped only increases total, attended stays same
	const safeToSkip =
		status === "safe" && subject.totalClasses > 0
			? (() => {
					let skip = 0;
					let total = subject.totalClasses;
					while (Math.ceil((subject.attended / (total + 1)) * 100) >= threshold) {
						skip++;
						total++;
						if (skip > 1000) break;
					}
					return skip;
				})()
			: 0;
	return { threshold, percentage, status, needed, safeToSkip };
}

export default function AttendanceSubjectList({
	subjects,
	defaultThreshold,
	onEdit,
	onDelete,
}: AttendanceSubjectListProps) {
	if (subjects.length === 0) {
		return (
			<div className="text-center py-16 text-neutral-400 w-full max-w-4xl">
				<h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
					No subjects added yet
				</h3>
				<p className="text-sm text-neutral-500">Add your first subject using the form above.</p>
			</div>
		);
	}

	return (
		<div className="w-full max-w-4xl">
			<div className="bg-neutral-900/60 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full text-left border-collapse min-w-[480px]">
						<thead>
							<tr className="border-b border-white/8">
								<th className="px-5 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
									Subject
								</th>
								<th className="px-4 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-center">
									Attended
								</th>
								<th className="px-4 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-center">
									Total
								</th>
								<th className="px-4 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
									Progress
								</th>
								<th className="px-4 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-center">
									Threshold
								</th>
								<th className="px-4 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
									Status
								</th>
								<th className="px-5 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-right">
									Actions
								</th>
							</tr>
						</thead>
						<tbody>
							{subjects.map((subject, i) => {
								const { threshold, percentage, status, needed, safeToSkip } = computeRow(
									subject,
									defaultThreshold
								);
								const styles = statusStyles[status];
								const isLast = i === subjects.length - 1;

								return (
									<tr
										key={subject.id}
										className={`group transition-colors duration-150 hover:bg-white/4 ${!isLast ? "border-b border-white/5" : ""} ${styles.row}`}
									>
										{/* Subject name */}
										<td className="px-5 py-4">
											<div className="flex items-center gap-2.5 min-w-0">
												{styles.icon}
												<span
													className="text-sm font-semibold text-white truncate max-w-[140px] sm:max-w-[180px]"
													title={subject.name}
												>
													{subject.name}
												</span>
											</div>
										</td>

										{/* Attended */}
										<td className="px-4 py-4 text-center">
											<span className="text-sm font-bold text-white">{subject.attended}</span>
										</td>

										{/* Total */}
										<td className="px-4 py-4 text-center">
											<span className="text-sm text-neutral-400">{subject.totalClasses}</span>
										</td>

										{/* Progress — bar hidden on mobile, % always shown */}
										<td className="px-4 py-4">
											<div className="flex items-center gap-2.5 min-w-[50px] sm:min-w-[110px]">
												<div className="hidden sm:block flex-1">
													<AttendanceBar percentage={percentage} status={status} />
												</div>
												<span
													className={`text-xs font-bold tabular-nums w-[38px] text-right shrink-0 ${styles.text}`}
												>
													{percentage}%
												</span>
											</div>
										</td>

										{/* Threshold */}
										<td className="px-4 py-4 text-center">
											<span
												className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${styles.badge}`}
											>
												{threshold}%
											</span>
										</td>

										{/* Status */}
										<td className="px-4 py-4">
											{status !== "safe" && needed > 0 ? (
												<span className={`text-xs font-medium whitespace-nowrap ${styles.text}`}>
													Attend <span className="font-bold">{needed}</span> more
												</span>
											) : status === "safe" && safeToSkip > 0 ? (
												<span className="text-xs text-teal-300 font-medium whitespace-nowrap">
													Can skip <span className="font-bold text-teal-400">{safeToSkip}</span>
												</span>
											) : (
												<span className="text-xs text-neutral-500">—</span>
											)}
										</td>

										{/* Actions */}
										<td className="px-5 py-4">
											<div className="flex gap-1.5 justify-end">
												<button
													onClick={() => onEdit(subject)}
													className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 hover:scale-105 transition-all duration-200"
													title="Edit subject"
												>
													<Pencil className="w-3.5 h-3.5" />
												</button>
												<button
													onClick={() => onDelete(subject)}
													className="flex items-center justify-center w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:scale-105 transition-all duration-200"
													title="Delete subject"
												>
													<Trash2 className="w-3.5 h-3.5" />
												</button>
											</div>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
