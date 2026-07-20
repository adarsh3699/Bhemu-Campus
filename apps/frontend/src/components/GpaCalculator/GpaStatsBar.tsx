"use client";

import React from "react";
import type { GPASemester } from "@/types";
import { calculateCGPA } from "@/lib/gpaUtils";

interface GpaStatsBarProps {
	semesters: GPASemester[];
}

export default function GpaStatsBar({ semesters }: GpaStatsBarProps) {
	const avgMarks = (() => {
		const all = semesters.flatMap((s) => s.subjects ?? []).filter((sub) => sub.marks?.total != null);
		return all.length > 0
			? Math.round((all.reduce((acc, sub) => acc + (sub.marks!.total ?? 0), 0) / all.length) * 10) / 10
			: "—";
	})();

	const stats = [
		{ label: "Semesters", value: semesters.length },
		{ label: "Subjects", value: semesters.reduce((acc, s) => acc + (s.subjects?.length || 0), 0) },
		{ label: "Credits", value: semesters.reduce((acc, s) => acc + (s.subjects?.reduce((a, sub) => a + (sub.credit || 0), 0) || 0), 0) },
		{ label: "Avg. Marks", value: avgMarks },
	];

	return (
		<div className="w-full max-w-4xl mb-8 md:mb-10 px-5 md:px-6 py-4 md:py-5 bg-neutral-900/60 rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
			<div className="flex flex-col items-center sm:items-start shrink-0">
				<span className="text-4xl md:text-5xl font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent leading-none">
					{calculateCGPA(semesters)}
				</span>
				<span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest font-semibold">
					Cumulative GPA
				</span>
			</div>
			<div className="hidden sm:block w-px self-stretch bg-white/10 mx-1" />
			<div className="block sm:hidden h-px w-full bg-white/10" />
			<div className="flex flex-row gap-3 sm:gap-5 justify-center sm:justify-start flex-wrap">
				{stats.map(({ label, value }) => (
					<div key={label} className="flex flex-col items-center">
						<span className="text-2xl md:text-3xl font-bold text-white leading-none">{value}</span>
						<span className="text-xs md:text-sm text-muted-foreground mt-1">{label}</span>
					</div>
				))}
			</div>
		</div>
	);
}
