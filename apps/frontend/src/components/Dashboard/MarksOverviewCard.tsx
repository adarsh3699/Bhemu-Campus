"use client";

import Link from "next/link";
import { ArrowRight, BarChart2 } from "lucide-react";
import { useMarksData } from "@/contexts/MarksDataContext";

const CARD_SHADOW = "inset 0 1px 0 0 rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.4)";

export default function MarksOverviewCard() {
	const { subjects } = useMarksData();

	const withMarks = subjects.filter((s) => s.marks != null);
	const withTotal = withMarks.filter((s) => s.marks!.total !== null);
	const pending = subjects.length - withMarks.length;

	const avgTotal =
		withTotal.length > 0
			? Math.round((withTotal.reduce((acc, s) => acc + (s.marks!.total ?? 0), 0) / withTotal.length) * 10) / 10
			: null;

	const termSGPA =
		withMarks.length > 0
			? (() => {
					const pts = withMarks.reduce((acc, s) => acc + s.grade * s.credit, 0);
					const cr = withMarks.reduce((acc, s) => acc + s.credit, 0);
					return cr > 0 ? Math.round((pts / cr) * 100) / 100 : null;
				})()
			: null;

	return (
		<div className="bg-surface-dark border border-border rounded-xl p-6" style={{ boxShadow: CARD_SHADOW }}>
			<div className="flex justify-between items-center mb-5">
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
						<BarChart2 className="w-4 h-4" />
					</div>
					<h2 className="text-base font-bold text-white">Marks Analysis</h2>
				</div>
				<Link href="/gpa-calculator" className="text-xs text-primary hover:underline font-medium flex items-center gap-1">
					View all <ArrowRight className="w-3 h-3" />
				</Link>
			</div>

			{subjects.length === 0 ? (
				<div className="flex flex-col items-center justify-center h-24 text-muted-foreground gap-2">
					<BarChart2 className="w-8 h-8 opacity-30" />
					<p className="text-xs">No marks data yet.</p>
				</div>
			) : (
				<div className="space-y-4">
					<div className="flex justify-between items-end">
						<span className="text-xs text-muted-foreground">Current Term SGPA</span>
						<span className="text-2xl font-black bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
							{termSGPA !== null ? termSGPA.toFixed(2) : "—"}
						</span>
					</div>
					<div className="flex justify-between text-xs">
						<div>
							<span className="text-muted-foreground">Avg. Total: </span>
							<span className="text-white font-semibold">{avgTotal !== null ? avgTotal : "—"}</span>
						</div>
						{pending > 0 && <div className="text-amber-400 font-semibold">{pending} pending</div>}
					</div>
				</div>
			)}
		</div>
	);
}
