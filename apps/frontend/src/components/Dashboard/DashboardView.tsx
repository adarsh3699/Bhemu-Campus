"use client";

/**
 * DashboardView — page-level orchestrator.
 *
 * DesignPrinciples:
 *  §6  Thin Pages  — composes components; owns data fetching + auth guard only
 *  §3  Separation of Concerns — data layer (hooks) separate from UI (components)
 *  §9  Composition — built from focused pieces, not one mega-component
 */

import Link from "next/link";
import { Calculator, GraduationCap, Flag, BookOpen, ArrowRight, ClipboardList, Trophy } from "lucide-react";
import { useAuth } from "@/firebase/AuthContext";
import { useGpaData } from "@/contexts/GpaDataContext";
import { useAttendanceData } from "@/contexts/AttendanceDataContext";
import { calculateCGPA } from "@/lib/gpaUtils";
import LoginRecommendation from "@/components/common/LoginRecommendation";
import DashboardStats from "@/components/Dashboard/DashboardStats";
import SemesterBarChart from "@/components/Dashboard/SemesterBarChart";
import SemesterRoadmap from "@/components/Dashboard/SemesterRoadmap";
import { pointToGrade } from "@/lib/grades";

// ─── Grade display helper (local — colours only, labels come from grades lib) ─
const GRADE_COLOR: Record<number, string> = {
	10: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
	9: "text-primary bg-primary/10 border-primary/20",
	8: "text-primary bg-primary/10 border-primary/20",
	7: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
	6: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
	5: "text-orange-400 bg-orange-400/10 border-orange-400/20",
	0: "text-red-400 bg-red-400/10 border-red-400/20",
};
const getGradeInfo = (grade: number) => ({
	label: pointToGrade(grade),
	colorClass: GRADE_COLOR[Math.round(grade)] ?? GRADE_COLOR[0],
});

// ─── Quick Actions config (static — no reason to extract) ────────────────────
const QUICK_ACTIONS = [
	{
		href: "/gpa-calculator",
		icon: <Calculator className="w-5 h-5" />,
		title: "GPA Calculator",
		desc: "Manage semesters and subjects",
		color: "text-primary",
		bg: "bg-primary/10 border-primary/20",
	},
	{
		href: "/attendance-calculator",
		icon: <ClipboardList className="w-5 h-5" />,
		title: "Attendance",
		desc: "Track class attendance per subject",
		color: "text-teal-400",
		bg: "bg-teal-500/10 border-teal-500/20",
	},

	{
		href: "/reappear-calculator",
		icon: <GraduationCap className="w-5 h-5" />,
		title: "Reappear Calculator",
		desc: "Check marks needed to clear backlogs",
		color: "text-violet-400",
		bg: "bg-violet-500/10 border-violet-500/20",
	},
	{
		href: "/gpa-goal-planner",
		icon: <Flag className="w-5 h-5" />,
		title: "Goal Planner",
		desc: "Plan your target CGPA trajectory",
		color: "text-accent",
		bg: "bg-accent/10 border-accent/20",
	},
	{
		href: "/leaderboard",
		icon: <Trophy className="w-5 h-5" />,
		title: "Leaderboard",
		desc: "See how you rank among peers",
		color: "text-amber-400",
		bg: "bg-amber-500/10 border-amber-500/20",
	},
];

// ─── View ────────────────────────────────────────────────────────────────────
export default function DashboardView() {
	const { currentUser } = useAuth();
	const { semesters, currentProfile, loading } = useGpaData();
	const { attendanceData } = useAttendanceData();

	if (!currentUser) return <LoginRecommendation feature="Dashboard" />;

	if (loading) {
		return (
			<div className="w-full flex flex-col items-center justify-center gap-5 py-20">
				<div className="w-12 h-12 border-3 border-white/20 border-t-primary rounded-full animate-spin" />
				<p className="text-xl font-medium text-muted-foreground">Loading your dashboard...</p>
			</div>
		);
	}

	// ── Derived data (pure, no side-effects) ──────────────────────────────────
	const cgpa = parseFloat(calculateCGPA(semesters));
	const allSubjectsWithMarks = semesters.flatMap((s) => s.subjects ?? []).filter((sub) => sub.marks?.total != null);
	const avgMarks = allSubjectsWithMarks.length > 0
		? Math.round((allSubjectsWithMarks.reduce((acc, sub) => acc + (sub.marks!.total ?? 0), 0) / allSubjectsWithMarks.length) * 10) / 10
		: null;

	const attendanceSubjects = attendanceData ? Object.values(attendanceData.subjects) : [];
	const overallAttendance =
		attendanceSubjects.length > 0 && attendanceSubjects.reduce((a, s) => a + s.totalClasses, 0) > 0
			? Math.ceil(
					(attendanceSubjects.reduce((a, s) => a + s.attended, 0) /
						attendanceSubjects.reduce((a, s) => a + s.totalClasses, 0)) *
						100
				)
			: null;
	const chartSemesters = semesters.slice(-6);
	const recentSubjects = [...semesters]
		.reverse()
		.flatMap((s) => s.subjects.map((sub) => ({ ...sub, semesterName: s.name })))
		.slice(0, 5);

	return (
		<div className="px-4 py-8 md:px-8 md:py-10 max-w-6xl mx-auto space-y-6">
			{/* Welcome header */}
			<div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
						Welcome back, {currentUser.displayName?.split(" ")[0] || "Student"}!
					</h1>
					<div className="flex items-center gap-2 mt-2">
						<span className="relative flex h-2.5 w-2.5">
							<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
							<span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
						</span>
						<p className="text-sm text-primary font-medium">
							Active profile: {currentProfile?.name || "Default"}
						</p>
					</div>
				</div>
				<Link
					href="/gpa-calculator"
					className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-accent text-foreground font-bold rounded-lg shadow-glow hover:bg-primary/90 transition-all hover:-translate-y-0.5 text-sm shrink-0"
				>
					<Calculator className="w-4 h-4" />
					Open Calculator
				</Link>
			</div>

			{/* Stats grid */}
			<DashboardStats
				cgpa={cgpa}
				semesterCount={semesters.length}
				overallAttendance={overallAttendance}
				avgMarks={avgMarks}
			/>

			{/* Chart + Roadmap */}
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
				{/* Left: chart + recent subjects */}
				<div className="lg:col-span-7 flex flex-col gap-6">
					{/* Semester Performance */}
					<div
						className="bg-surface-dark border border-border rounded-xl p-6"
						style={{ boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.4)" }}
					>
						<div className="flex justify-between items-center mb-6">
							<h2 className="text-base font-bold text-white">Semester Performance</h2>
							<Link
								href="/gpa-calculator"
								className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
							>
								View all <ArrowRight className="w-3 h-3" />
							</Link>
						</div>
						{chartSemesters.length === 0 ? (
							<div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
								<Calculator className="w-10 h-10 opacity-30" />
								<p className="text-sm">No semester data yet. Start adding subjects!</p>
							</div>
						) : (
							<SemesterBarChart semesters={chartSemesters} />
						)}
					</div>

					{/* Recent Subjects */}
					<div
						className="bg-surface-dark border border-border rounded-xl overflow-hidden"
						style={{ boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.4)" }}
					>
						<div className="p-5 border-b border-border flex justify-between items-center bg-black/20">
							<h2 className="text-base font-bold text-white">Recent Subjects</h2>
							<Link href="/gpa-calculator" className="text-xs text-primary hover:underline font-medium">
								View All
							</Link>
						</div>
						{recentSubjects.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
								<BookOpen className="w-10 h-10 opacity-30" />
								<p className="text-sm">No subjects added yet.</p>
							</div>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full text-left border-collapse">
									<thead>
										<tr className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold bg-white/2">
											<th className="px-5 py-3 font-medium">Semester</th>
											<th className="px-5 py-3 font-medium">Subject</th>
											<th className="px-5 py-3 font-medium text-center">Credits</th>
											<th className="px-5 py-3 font-medium text-right">Grade</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-border text-sm">
										{recentSubjects.map((sub, i) => {
											const { label, colorClass } = getGradeInfo(sub.grade);
											return (
												<tr key={i} className="hover:bg-white/3 transition-colors">
													<td className="px-5 py-3 text-muted-foreground text-xs font-medium">
														{sub.semesterName}
													</td>
													<td className="px-5 py-3 text-white font-medium truncate max-w-[180px]">
														{sub.subjectName}
													</td>
													<td className="px-5 py-3 text-center text-muted-foreground">
														{sub.credit}
													</td>
													<td className="px-5 py-3 text-right">
														<span
															className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold border ${colorClass}`}
														>
															{label}
														</span>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						)}
					</div>
				</div>

				{/* Right: Semester Roadmap */}
				<div className="lg:col-span-5">
					<div
						className="bg-surface-dark border border-border rounded-xl p-6 h-full"
						style={{ boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.4)" }}
					>
						<h2 className="text-base font-bold text-white mb-6">Semester Roadmap</h2>
						<SemesterRoadmap semesters={semesters} />
					</div>
				</div>
			</div>

			{/* Quick Actions */}
			<div>
				<h2 className="text-base font-bold text-white mb-4">Quick Actions</h2>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{QUICK_ACTIONS.map((action) => (
						<Link
							key={action.title}
							href={action.href}
							className="group bg-surface-dark border border-border rounded-xl p-5 hover:border-white/15 transition-all duration-300 flex items-center gap-4"
							style={{ boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.04)" }}
						>
							<div
								className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${action.bg} ${action.color}`}
							>
								{action.icon}
							</div>
							<div className="min-w-0">
								<div className="text-sm font-semibold text-white truncate">{action.title}</div>
								<div className="text-xs text-muted-foreground mt-0.5 truncate">{action.desc}</div>
							</div>
							<ArrowRight
								className={`w-4 h-4 ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0 ${action.color}`}
							/>
						</Link>
					))}
				</div>
			</div>
		</div>
	);
}
