"use client";

import Link from "next/link";
import { ArrowRight, ClipboardList, AlertTriangle } from "lucide-react";
import { useAttendanceData } from "@/hooks/AttendanceDataContext";

const CARD_SHADOW = "inset 0 1px 0 0 rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.4)";

export default function AttendanceSummaryCard() {
	const { attendanceData } = useAttendanceData();

	const subjects = attendanceData ? Object.values(attendanceData.subjects) : [];
	const defaultThreshold = attendanceData?.defaultThreshold ?? 75;

	const overallPct =
		subjects.length > 0 && subjects.reduce((a, s) => a + s.totalClasses, 0) > 0
			? Math.round(
					(subjects.reduce((a, s) => a + s.attended, 0) /
						subjects.reduce((a, s) => a + s.totalClasses, 0)) *
						100 *
						10
				) / 10
			: null;

	const belowCount = subjects.filter((s) => {
		const pct = s.totalClasses > 0 ? (s.attended / s.totalClasses) * 100 : 0;
		return pct < (s.threshold ?? defaultThreshold);
	}).length;

	return (
		<div
			className="bg-surface-dark border border-border rounded-xl p-6"
			style={{ boxShadow: CARD_SHADOW }}
		>
			<div className="flex justify-between items-center mb-5">
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
						<ClipboardList className="w-4 h-4" />
					</div>
					<h2 className="text-base font-bold text-white">Attendance</h2>
				</div>
				<Link
					href="/attendance-calculator"
					className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
				>
					View all <ArrowRight className="w-3 h-3" />
				</Link>
			</div>

			{subjects.length === 0 ? (
				<div className="flex flex-col items-center justify-center h-24 text-muted-foreground gap-2">
					<ClipboardList className="w-8 h-8 opacity-30" />
					<p className="text-xs">No attendance data yet.</p>
				</div>
			) : (
				<div className="space-y-4">
					{/* Overall percentage */}
					<div>
						<div className="flex justify-between items-end mb-1.5">
							<span className="text-xs text-muted-foreground">Overall</span>
							<span
								className={`text-2xl font-black ${
									overallPct !== null && overallPct < defaultThreshold
										? "text-red-400"
										: "text-teal-400"
								}`}
							>
								{overallPct !== null ? `${overallPct}%` : "—"}
							</span>
						</div>
						{overallPct !== null && (
							<div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
								<div
									className={`h-full rounded-full transition-all duration-700 ${
										overallPct < defaultThreshold
											? "bg-gradient-to-r from-red-500 to-orange-500"
											: "bg-gradient-to-r from-teal-400 to-blue-500"
									}`}
									style={{ width: `${Math.min(overallPct, 100)}%` }}
								/>
							</div>
						)}
					</div>

					{/* Stats row */}
					<div className="flex justify-between text-xs">
						<div>
							<span className="text-muted-foreground">Subjects: </span>
							<span className="text-white font-semibold">{subjects.length}</span>
						</div>
						{belowCount > 0 && (
							<div className="flex items-center gap-1 text-red-400 font-semibold">
								<AlertTriangle className="w-3 h-3" />
								{belowCount} below {defaultThreshold}%
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
