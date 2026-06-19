"use client";

import React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { calculateGPA, Subject, Semester } from "@/utils/gpaUtils";

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
				<h3 className="text-3xl font-bold mb-3 bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">No semesters added yet</h3>
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
					className={`bg-neutral-900/60 backdrop-blur-xl rounded-3xl p-6 md:p-8 mb-6 md:mb-8 shadow-2xl border border-white/10 relative transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
						activeSemester === semester.id ? "block" : "hidden"
					}`}
				>
					{/* Glowing top divider */}
					<div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

					<div className="flex flex-col lg:flex-row justify-between items-center mb-6 gap-4 border-b border-white/5 pb-6">
						<div className="text-center lg:text-left">
							<h3 className="text-2xl font-bold text-white mb-1">
								{semester.name}
							</h3>
							<div className="flex gap-4 text-xs font-semibold text-neutral-400 justify-center lg:justify-start">
								<span className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">{semester.subjects.length} subjects</span>
								<span className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
									{semester.subjects.reduce((acc, subject) => acc + subject.credit, 0)} credits
								</span>
							</div>
						</div>
						<div className="flex flex-col items-center px-6 py-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
							<div className="text-4xl font-black bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent leading-none">
								{calculateGPA(semester.subjects)}
							</div>
							<div className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase mt-2">Semester GPA</div>
						</div>
					</div>

					{semester.subjects.length > 0 ? (
						<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
							{semester.subjects.map((subject) => (
								<div
									key={subject.id}
									className="bg-white/5 rounded-2xl p-5 border border-white/5 transition-all duration-300 hover:bg-white/10 hover:border-white/10 hover:shadow-xl"
								>
									<div className="flex justify-between items-center mb-4">
										<h4 className="text-sm font-bold text-white truncate pr-2" title={subject.subjectName}>
											{subject.subjectName}
										</h4>
										<div className="flex gap-1.5 flex-shrink-0">
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

									<div className="space-y-2 text-xs">
										<div className="flex justify-between items-center border-b border-white/5 pb-1.5">
											<span className="text-neutral-400">Grade:</span>
											<span className="font-bold text-teal-400">
												{subject.grade}
											</span>
										</div>
										<div className="flex justify-between items-center border-b border-white/5 pb-1.5">
											<span className="text-neutral-400">Credits:</span>
											<span className="font-semibold text-white">
												{subject.credit}
											</span>
										</div>
										<div className="flex justify-between items-center">
											<span className="text-neutral-400">Points:</span>
											<span className="font-semibold text-white">
												{(subject.grade * subject.credit).toFixed(2)}
											</span>
										</div>
									</div>
								</div>
							))}
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
