"use client";

/**
 * SemesterBarChart — Single-responsibility chart component.
 *
 * Follows DesignPrinciples:
 *  §2  Low Coupling  — accepts only GPASemester[] and a `calculateGPA` fn; no Firebase, no auth
 *  §11 SRP           — renders one thing: the SGPA bar chart
 *  §10 Reusable UI   — theme-agnostic; uses CSS vars from globals.css via Recharts fill props
 *  §16 Pure data     — chart data array derived from props with no side effects
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { GPASemester } from "@/types";
import { calculateGPA } from "@/utils/gpaUtils";

// ─── Types ──────────────────────────────────────────────────────────────────
interface ChartEntry {
	name: string;
	sgpa: number;
	isActive: boolean;
}

interface TooltipPayload {
	value: number;
	payload: ChartEntry;
}

// ─── Custom Tooltip (SRP: presentational only) ───────────────────────────────
function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
	if (!active || !payload?.length) return null;
	const { name, sgpa, isActive } = payload[0].payload;
	return (
		<div className="bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 shadow-2xl">
			<p className={`text-xs font-semibold mb-0.5 ${isActive ? "text-primary" : "text-white"}`}>{name}</p>
			<p className="text-base font-bold text-white font-mono">
				{sgpa > 0 ? sgpa.toFixed(2) : "—"}
				<span className="text-xs text-muted-foreground font-normal ml-1">SGPA</span>
			</p>
		</div>
	);
}

// ─── Colours ─────────────────────────────────────────────────────────────────
// Use CSS var string so it works with any Tailwind CSS-var-based theme
const COLOR_ACTIVE = "hsl(var(--primary, 197 100% 73%))" as const;

// ─── Component ───────────────────────────────────────────────────────────────
interface SemesterBarChartProps {
	semesters: GPASemester[];
}

export default function SemesterBarChart({ semesters }: SemesterBarChartProps) {
	const data: ChartEntry[] = semesters.map((sem, i) => ({
		name: sem.name,
		sgpa: parseFloat(calculateGPA(sem.subjects)),
		isActive: i === semesters.length - 1,
	}));

	return (
		<div className="w-full" style={{ outline: "none" }}>
			<style dangerouslySetInnerHTML={{ __html: `
				.recharts-wrapper, .recharts-surface, .recharts-wrapper * {
					outline: none !important;
				}
			`}} />
			<ResponsiveContainer width="100%" height={200}>
				<BarChart data={data} margin={{ top: 12, right: 8, left: -20, bottom: 0 }} barCategoryGap="30%">
					<CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
					<XAxis
						dataKey="name"
						tick={{ fill: "hsl(220 9% 55%)", fontSize: 11, fontWeight: 500 }}
						axisLine={false}
						tickLine={false}
						interval={0}
						tickFormatter={(name: string) => (name.length > 7 ? name.slice(0, 6) + "…" : name)}
					/>
					<YAxis
						domain={[0, 10]}
						ticks={[0, 2, 4, 6, 8, 10]}
						tick={{ fill: "hsl(220 9% 45%)", fontSize: 10 }}
						axisLine={false}
						tickLine={false}
					/>
					<Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)", radius: 6 }} />
					<Bar dataKey="sgpa" radius={[6, 6, 0, 0]} maxBarSize={56}>
						{data.map((entry, index) => (
							<Cell
								key={`cell-${index}`}
								fill={entry.isActive ? COLOR_ACTIVE : "rgba(117,209,255,0.18)"}
								style={
									entry.isActive ? { filter: "drop-shadow(0 0 8px rgba(117,209,255,0.35))" } : undefined
								}
							/>
						))}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}
