"use client";

import React from "react";
import { Pencil, Trash2, AlertTriangle, CheckCircle } from "lucide-react";
import type { AttendanceSubject } from "@/types/attendance";

interface AttendanceSubjectListProps {
	subjects: AttendanceSubject[];
	defaultThreshold: number;
	onEdit: (subject: AttendanceSubject) => void;
	onDelete: (subject: AttendanceSubject) => void;
}

function AttendanceBar({ percentage, threshold }: { percentage: number; threshold: number }) {
	const isBelow = percentage < threshold;
	const barColor = isBelow ? "from-red-500 to-orange-500" : "from-teal-400 to-blue-500";
	const width = Math.min(percentage, 100);

	return (
		<div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
			<div
				className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-500`}
				style={{ width: `${width}%` }}
			/>
		</div>
	);
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
			<div className="bg-neutral-900/60 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-2xl border border-white/10 relative">
				<div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

				<h3 className="text-xl font-bold text-white mb-6">Subjects</h3>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{subjects.map((subject) => {
						const threshold = subject.threshold ?? defaultThreshold;
						const percentage = subject.totalClasses > 0
							? Math.round((subject.attended / subject.totalClasses) * 100 * 10) / 10
							: 0;
						const isBelow = percentage < threshold;
						const needed = subject.totalClasses > 0
							? Math.max(
									0,
									Math.ceil(
										(threshold / 100) * subject.totalClasses - subject.attended
									)
								)
							: 0;
						const safeToSkip = !isBelow && subject.totalClasses > 0
							? (() => {
								let skip = 0;
								let total = subject.totalClasses;
								const attended = subject.attended;
								while ((attended / (total + 1)) * 100 >= threshold) {
									skip++;
									total++;
								}
								return skip;
							})()
							: 0;

						return (
							<div
								key={subject.id}
								className={`bg-white/5 rounded-2xl p-5 border transition-all duration-300 hover:bg-white/8 hover:shadow-xl ${
									isBelow
										? "border-red-500/30 bg-red-500/5"
										: "border-white/5 hover:border-white/10"
								}`}
							>
								<div className="flex justify-between items-start mb-3">
									<div className="flex-1 pr-2">
										<div className="flex items-center gap-2 mb-0.5">
											{isBelow ? (
												<AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
											) : (
												<CheckCircle className="w-4 h-4 text-teal-400 shrink-0" />
											)}
											<h4 className="text-sm font-bold text-white truncate">
												{subject.name}
											</h4>
										</div>
									</div>
									<div className="flex gap-1.5 shrink-0">
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
								</div>

								{/* Percentage display */}
								<div className="mb-3">
									<div className="flex justify-between items-center mb-1.5">
										<span className="text-xs text-neutral-400">Attendance</span>
										<span
											className={`text-lg font-black ${
												isBelow ? "text-red-400" : "text-teal-400"
											}`}
										>
											{percentage}%
										</span>
									</div>
									<AttendanceBar percentage={percentage} threshold={threshold} />
								</div>

								{/* Stats */}
								<div className="grid grid-cols-3 gap-2 text-xs">
									<div className="flex flex-col items-center bg-white/5 rounded-xl p-2 border border-white/5">
										<span className="font-bold text-white">{subject.attended}</span>
										<span className="text-neutral-400 mt-0.5">Attended</span>
									</div>
									<div className="flex flex-col items-center bg-white/5 rounded-xl p-2 border border-white/5">
										<span className="font-bold text-white">{subject.totalClasses}</span>
										<span className="text-neutral-400 mt-0.5">Total</span>
									</div>
									<div className="flex flex-col items-center bg-white/5 rounded-xl p-2 border border-white/5">
										<span className={`font-bold ${isBelow ? "text-red-400" : "text-neutral-400"}`}>
											{threshold}%
										</span>
										<span className="text-neutral-400 mt-0.5">Threshold</span>
									</div>
								</div>

								{/* Warning/Info messages */}
								{isBelow && needed > 0 && (
									<div className="mt-3 flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl">
										<AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
										<p className="text-xs text-red-300">
											Attend next <span className="font-bold">{needed}</span> consecutive class{needed !== 1 ? "es" : ""} to reach {threshold}%
										</p>
									</div>
								)}
								{!isBelow && safeToSkip > 0 && (
									<div className="mt-3 flex items-center gap-2 px-3 py-2 bg-teal-500/10 border border-teal-500/20 rounded-xl">
										<CheckCircle className="w-3.5 h-3.5 text-teal-400 shrink-0" />
										<p className="text-xs text-teal-300">
											You can skip <span className="font-bold">{safeToSkip}</span> class{safeToSkip !== 1 ? "es" : ""} and stay above {threshold}%
										</p>
									</div>
								)}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
