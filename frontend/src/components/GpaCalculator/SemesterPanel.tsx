"use client";

import React from "react";
import { calculateGPA } from "@/lib/gpaUtils";
import SubjectCard, { SubjectEditFormState } from "@/components/GpaCalculator/SubjectCard";
import type { GPASubject } from "@/types";

interface SemesterPanelProps {
	mode: "grades" | "marks";
	semesterName: string;
	subjects: GPASubject[];
	editingSubjectId: string | null;
	editFormState: SubjectEditFormState;
	onFormChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onEdit: (id: string | number) => void;
	onSave: (id: string | number) => void;
	onCancel: () => void;
	onDelete: (id: string | number) => void;
	isReadOnly?: boolean;
}

export default function SemesterPanel({
	mode,
	semesterName,
	subjects,
	editingSubjectId,
	editFormState,
	onFormChange,
	onEdit,
	onSave,
	onCancel,
	onDelete,
	isReadOnly = false,
}: SemesterPanelProps) {
	const totalCredits = subjects.reduce((acc, s) => acc + s.credit, 0);

	return (
		<div className="bg-neutral-900/60 backdrop-blur-xl rounded-3xl p-4 md:p-6 shadow-2xl border border-white/10 relative w-full max-w-4xl">
			<div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

			{/* Header */}
			<div className="flex items-center justify-between mb-6 pb-5 border-b border-white/5">
				<div>
					<h3 className="text-xl font-bold text-white leading-none mb-2">{semesterName}</h3>
					<div className="flex gap-2 text-[11px] font-medium text-neutral-400">
						<span className="bg-white/5 px-2.5 py-0.5 rounded-full border border-white/8">
							{subjects.length} subjects
						</span>
						<span className="bg-white/5 px-2.5 py-0.5 rounded-full border border-white/8">
							{totalCredits} credits
						</span>
					</div>
				</div>
				<div className="flex items-baseline gap-1.5">
					<span className="text-3xl font-black bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent leading-none">
						{calculateGPA(subjects)}
					</span>
					<span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">SGPA</span>
				</div>
			</div>

			{/* Subject grid */}
			{subjects.length === 0 ? (
				<div className="text-center py-10 text-neutral-500 text-sm">
					No subjects yet — click <span className="text-teal-400 font-semibold">Add Subject</span> above.
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{subjects.map((subject) => (
						<SubjectCard
							key={String(subject.id)}
							mode={mode}
							subject={subject}
							isEditing={editingSubjectId === String(subject.id)}
							editFormState={editFormState}
							onFormChange={onFormChange}
							onEdit={onEdit}
							onSave={onSave}
							onCancel={onCancel}
							onDelete={onDelete}
							isReadOnly={isReadOnly}
						/>
					))}
				</div>
			)}
		</div>
	);
}
