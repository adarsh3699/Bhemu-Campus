"use client";

/**
 * DashboardStats — displays the four academic summary stat cards.
 *
 * DesignPrinciples:
 *  §11 SRP  — one job: render aggregate stats
 *  §2  Low Coupling — receives only computed numbers; no Firebase, no hooks
 *  §10 Reusable UI — stat card layout is repeated, driven by data
 */

import { TrendingUp, CalendarDays, BookOpen, Star } from "lucide-react";

interface Props {
	cgpa: number;
	semesterCount: number;
	totalSubjects: number;
	totalCredits: number;
}

const CARD_SHADOW = "inset 0 1px 0 0 rgba(255,255,255,0.04)";

function cgpaTrend(cgpa: number) {
	if (cgpa >= 8) return { label: "+Good", color: "text-emerald-400 bg-emerald-400/10" };
	if (cgpa >= 6) return { label: "Average", color: "text-yellow-400 bg-yellow-400/10" };
	return { label: "Needs Work", color: "text-red-400 bg-red-400/10" };
}

export default function DashboardStats({ cgpa, semesterCount, totalSubjects, totalCredits }: Props) {
	const trend = cgpaTrend(cgpa);

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			{/* CGPA */}
			<div className="bg-surface-dark border border-border rounded-xl p-5 hover:border-white/10 transition-all duration-300" style={{ boxShadow: CARD_SHADOW }}>
				<div className="flex justify-between items-start mb-3">
					<span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Cumulative GPA</span>
					<div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
						<TrendingUp className="w-4 h-4" />
					</div>
				</div>
				<div className="text-3xl font-bold text-white mb-2 font-mono">
					{cgpa.toFixed(2)}<span className="text-lg text-muted-foreground font-normal">/10</span>
				</div>
				<span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${trend.color}`}>
					<TrendingUp className="w-3 h-3" /> {trend.label}
				</span>
				<div className="w-full bg-white/5 rounded-full h-1.5 mt-3 overflow-hidden">
					<div className="bg-primary h-1.5 rounded-full transition-all duration-700" style={{ width: `${(cgpa / 10) * 100}%` }} />
				</div>
			</div>

			{/* Semesters */}
			<div className="bg-surface-dark border border-border rounded-xl p-5 hover:border-white/10 transition-all duration-300" style={{ boxShadow: CARD_SHADOW }}>
				<div className="flex justify-between items-start mb-3">
					<span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Semesters</span>
					<div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
						<CalendarDays className="w-4 h-4" />
					</div>
				</div>
				<div className="text-3xl font-bold text-white mb-1 font-mono">{semesterCount}</div>
				<div className="text-xs text-muted-foreground">Active & Completed</div>
			</div>

			{/* Subjects */}
			<div className="bg-surface-dark border border-border rounded-xl p-5 hover:border-white/10 transition-all duration-300" style={{ boxShadow: CARD_SHADOW }}>
				<div className="flex justify-between items-start mb-3">
					<span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Subjects</span>
					<div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center">
						<BookOpen className="w-4 h-4" />
					</div>
				</div>
				<div className="text-3xl font-bold text-white mb-1 font-mono">{totalSubjects}</div>
				<div className="text-xs text-muted-foreground">Total Evaluated</div>
			</div>

			{/* Credits */}
			<div className="bg-surface-dark border border-border rounded-xl p-5 hover:border-white/10 transition-all duration-300" style={{ boxShadow: CARD_SHADOW }}>
				<div className="flex justify-between items-start mb-3">
					<span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Credits Earned</span>
					<div className="w-8 h-8 rounded-lg bg-yellow-400/10 text-yellow-400 flex items-center justify-center">
						<Star className="w-4 h-4" />
					</div>
				</div>
				<div className="text-3xl font-bold text-white mb-1 font-mono">
					{totalCredits}<span className="text-lg text-muted-foreground font-normal">/120</span>
				</div>
				<div className="w-full bg-white/5 rounded-full h-1.5 mt-3 overflow-hidden">
					<div className="bg-yellow-400 h-1.5 rounded-full transition-all duration-700" style={{ width: `${Math.min((totalCredits / 120) * 100, 100)}%` }} />
				</div>
			</div>
		</div>
	);
}
