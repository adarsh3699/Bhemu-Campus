"use client";

import React from "react";
import type { GPASubject } from "@/types";

interface MarksTermSummaryProps {
	subjects: GPASubject[];
}

export default function MarksTermSummary({ subjects }: MarksTermSummaryProps) {
	const withMarks = subjects.filter((s) => s.marks != null);
	if (withMarks.length === 0) return null;

	const withGrade = withMarks.filter((s) => s.marks!.umsGradePoint !== null || s.marks!.total !== null);
	const pending = subjects.length - withGrade.length;

	const termSGPA =
		withGrade.length > 0
			? (() => {
					const pts = withGrade.reduce((acc, s) => acc + s.grade * s.credit, 0);
					const cr = withGrade.reduce((acc, s) => acc + s.credit, 0);
					return cr > 0 ? Math.round((pts / cr) * 100) / 100 : null;
				})()
			: null;

	return (
		<div className="w-full max-w-4xl mb-6">
			<div className="bg-neutral-900/60 backdrop-blur-xl rounded-2xl p-5 border border-white/10 flex flex-wrap gap-4 justify-between items-center">
				<div className="flex flex-wrap gap-6">
					<div>
						<p className="text-xs text-neutral-400 uppercase tracking-wider mb-0.5">Term SGPA</p>
						<p className="text-xl font-black bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
							{termSGPA !== null ? termSGPA.toFixed(2) : "—"}
						</p>
					</div>
					<div>
						<p className="text-xs text-neutral-400 uppercase tracking-wider mb-0.5">With Grade</p>
						<p className="text-xl font-black text-white">{withGrade.length}</p>
					</div>
					<div>
						<p className="text-xs text-neutral-400 uppercase tracking-wider mb-0.5">Pending</p>
						<p className={`text-xl font-black ${pending > 0 ? "text-amber-400" : "text-white"}`}>{pending}</p>
					</div>
				</div>
				<p className="text-xs text-neutral-500">{subjects.length} subject{subjects.length !== 1 ? "s" : ""} this term</p>
			</div>
		</div>
	);
}
