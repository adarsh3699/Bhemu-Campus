"use client";

import React from "react";
import { Plus, X } from "lucide-react";
import { calculateGPA } from "@bhemu/shared";
import type { GPASemester as Semester } from "@bhemu/shared";

interface SemesterTabsProps {
	semesters: Semester[];
	activeSemester: string | number | null;
	isReadOnly: boolean;
	addSemesterLoading: boolean;
	onSelectSemester: (id: string | number) => void;
	onAddSemester: () => void;
	onDeleteSemester: (id: string | number, name: string) => void;
}

export default function SemesterTabs({
	semesters,
	activeSemester,
	isReadOnly,
	addSemesterLoading,
	onSelectSemester,
	onAddSemester,
	onDeleteSemester,
}: SemesterTabsProps) {
	return (
		<div className="w-full max-w-4xl text-left">
			<div className="flex flex-col sm:flex-row justify-between items-center mb-4 md:mb-6 gap-4">
				<h2 className="text-xl md:text-2xl font-semibold text-white/90">
					{isReadOnly ? "View Semesters" : "Manage Semesters"}
				</h2>
				<button
					className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-success to-emerald-600 text-white border-none rounded-xl text-sm md:text-base font-semibold cursor-pointer transition-all duration-300 shadow-lg shadow-success/20 uppercase tracking-wide hover:-translate-y-0.5 hover:shadow-success/30 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none w-full sm:w-auto justify-center"
					onClick={onAddSemester}
					disabled={isReadOnly || addSemesterLoading}
				>
					{addSemesterLoading
						? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
						: <Plus className="w-5 h-5" />}
					{isReadOnly ? "Read-Only Profile" : addSemesterLoading ? "Saving..." : "Add Semester"}
				</button>
			</div>

			{semesters.length > 0 && (
				<div className="flex gap-3 md:gap-4 mb-4 md:mb-8 overflow-x-auto p-1 pt-4 box-border w-full justify-start md:flex-wrap no-scrollbar">
					{semesters.map((semester) => (
						<div
							key={semester.id}
							className={`flex flex-col items-center px-4 md:px-5 py-3 bg-white/5 backdrop-blur-md rounded-2xl cursor-pointer transition-all duration-300 border-2 relative min-w-[125px] flex-shrink-0 group ${
								activeSemester === semester.id
									? "bg-gradient-primary border-primary text-white shadow-glow scale-105"
									: "border-white/10 hover:bg-white/10 hover:-translate-y-0.5"
							}`}
							onClick={() => onSelectSemester(semester.id)}
						>
							<span className={`text-sm md:text-base font-semibold mb-1 ${activeSemester === semester.id ? "text-white" : "text-white/90"}`}>
								{semester.name}
							</span>
							<span className={`text-xs md:text-sm ${activeSemester === semester.id ? "text-white/90" : "text-muted-foreground"}`}>
								GPA: {calculateGPA(semester.subjects)}
							</span>
							<button
								className={`absolute -top-1 -right-1 md:-top-2 md:-right-2 w-5 h-5 md:w-6 md:h-6 bg-destructive text-white border-none rounded-full cursor-pointer flex items-center justify-center text-xs transition-all duration-300 shadow-md hover:bg-red-600 hover:scale-110 ${activeSemester === semester.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
								onClick={(e) => { e.stopPropagation(); onDeleteSemester(semester.id, semester.name); }}
								disabled={isReadOnly}
								title={isReadOnly ? "Read-only profile" : "Delete semester"}
							>
								<X className="w-3 h-3" />
							</button>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
