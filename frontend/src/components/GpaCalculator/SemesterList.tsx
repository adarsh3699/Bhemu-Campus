"use client";

import React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { calculateGPA, Subject, Semester } from "@/lib/gpaUtils";
import { pointToGrade } from "@/lib/grades";

interface SemesterListProps {
	semesters: Semester[];
	activeSemester: string | number | null;
	isReadOnlyProfile: boolean;
	onEditSubject: (semesterId: string | number, subject: Subject) => void;
	onDeleteSubject: (semesterId: string | number, subjectId: string | number) => void;
	onAddSemesterClick?: () => void;
}

const SemesterList: React.FC<SemesterListProps> = ({
	semesters,
	activeSemester,
	isReadOnlyProfile,
	onEditSubject,
	onDeleteSubject,
}) => {
	if (semesters.length === 0) {
		return (
			<div className="text-center py-16 text-neutral-400">
				<h3 className="text-3xl font-bold mb-3 bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
					No semesters added yet
				</h3>
				<p className="text-sm text-neutral-500">
					Click &quot;Add Semester&quot; to get started with your GPA calculation!
				</p>
			</div>
		);
	}

	return (
		<div className="w-full max-w-4xl">
			{semesters.map((semester) => (
				<div
					key={semester.id}
					className={`bg-neutral-900/60 backdrop-blur-xl rounded-3xl p-4 md:p-6 mb-6 md:mb-8 shadow-2xl border border-white/10 relative transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
						activeSemester === semester.id ? "block" : "hidden"
					}`}
				>
					<div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

					{/* Semester header */}
					<div className="flex items-center justify-between mb-6 pb-5 border-b border-white/5">
						<div>
							<h3 className="text-xl font-bold text-white leading-none mb-2">{semester.name}</h3>
							<div className="flex gap-2 text-[11px] font-medium text-neutral-400">
								<span className="bg-white/5 px-2.5 py-0.5 rounded-full border border-white/8">
									{semester.subjects.length} subjects
								</span>
								<span className="bg-white/5 px-2.5 py-0.5 rounded-full border border-white/8">
									{semester.subjects.reduce((acc, s) => acc + s.credit, 0)} credits
								</span>
							</div>
						</div>
						<div className="flex items-baseline gap-1.5">
							<span className="text-3xl font-black bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent leading-none">
								{calculateGPA(semester.subjects)}
							</span>
							<span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
								SGPA
							</span>
						</div>
					</div>

					{semester.subjects.length > 0 ? (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{semester.subjects.map((subject) => {
								const gradeLabel = pointToGrade(subject.grade);
								return (
									<div
										key={subject.id}
										className="bg-white/5 rounded-2xl p-3 md:p-4 border border-white/5 transition-all duration-300 hover:bg-white/8 hover:border-white/10 hover:shadow-xl"
									>
										{/* Card header */}
										<div className="flex justify-between items-start mb-4">
											<div className="flex-1 pr-2">
												<h4
													className="text-sm font-bold text-white truncate mb-1"
													title={subject.subjectName}
												>
													{subject.subjectName.length > 23 && subject.subjectCode
														? subject.subjectCode
														: subject.subjectName}
												</h4>
												<div className="flex items-center gap-1.5">
													<span className="text-[10px] font-semibold text-neutral-300 bg-white/8 px-2 py-0.5 rounded-full border border-white/10">
														{subject.credit} cr
													</span>
												</div>
											</div>
											<div className="flex gap-1.5 shrink-0">
												<button
													className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
													onClick={() => onEditSubject(semester.id, subject)}
													disabled={isReadOnlyProfile}
													title={isReadOnlyProfile ? "Read-only profile" : "Edit subject"}
												>
													<Pencil className="w-3.5 h-3.5" />
												</button>
												<button
													className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
													onClick={() => onDeleteSubject(semester.id, subject.id)}
													disabled={isReadOnlyProfile}
													title={isReadOnlyProfile ? "Read-only profile" : "Delete subject"}
												>
													<Trash2 className="w-3.5 h-3.5" />
												</button>
											</div>
										</div>

										{/* Stats row */}
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
													<span className="text-sm font-bold text-white leading-none">
														{value}
													</span>
													<span className="text-[10px] text-neutral-400 mt-0.5">{label}</span>
												</div>
											))}
										</div>

										{/* Grade label */}
										<div className="flex justify-end pt-2 border-t border-white/5">
											<span className="text-base font-black bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
												{gradeLabel} ({subject.grade})
											</span>
										</div>
									</div>
								);
							})}
						</div>
					) : (
						<div className="text-center py-10 text-neutral-400">
							<h3 className="text-lg font-bold mb-1">No subjects added yet</h3>
							<p className="text-xs text-neutral-500">Add your first subject using the form above!</p>
						</div>
					)}
				</div>
			))}
		</div>
	);
};

export default SemesterList;
