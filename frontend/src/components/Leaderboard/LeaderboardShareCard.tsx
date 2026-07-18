"use client";

import type { LeaderboardData, ParsedProgram } from "@/types";

interface LeaderboardShareCardProps {
	leaderboardData: LeaderboardData;
	parsedProgram: ParsedProgram | null;
}

const s = {
	card: {
		width: "400px",
		padding: "28px 24px 24px 24px",
		borderRadius: "16px",
		background: "linear-gradient(150deg, #1e1b4b 0%, #1e1a3a 40%, #172554 100%)",
		fontFamily: "Arial, Helvetica, sans-serif",
		boxSizing: "border-box" as const,
	},
	header: {
		display: "flex" as const,
		flexDirection: "row" as const,
		alignItems: "flex-start" as const,
		marginBottom: "20px",
		gap: "0px",
	},
	iconBox: {
		width: "42px",
		height: "42px",
		minWidth: "42px",
		borderRadius: "10px",
		background: "rgba(250,204,21,0.18)",
		border: "1px solid rgba(250,204,21,0.35)",
		display: "flex" as const,
		alignItems: "center" as const,
		justifyContent: "center" as const,
		marginRight: "12px",
		marginTop: "1px",
	},
	iconText: {
		fontSize: "22px",
		lineHeight: "1",
		fontFamily: "Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif",
	},
	headerText: {
		display: "flex" as const,
		flexDirection: "column" as const,
		justifyContent: "center" as const,
	},
	title: {
		fontSize: "17px",
		fontWeight: "bold",
		color: "#ffffff",
		lineHeight: "22px",
		height: "22px",
		display: "block" as const,
		whiteSpace: "nowrap" as const,
	},
	subtitle: {
		fontSize: "11px",
		color: "#94a3b8",
		lineHeight: "16px",
		height: "16px",
		display: "block" as const,
		marginTop: "3px",
		whiteSpace: "nowrap" as const,
	},
	rankCard: {
		background: "rgba(255,255,255,0.06)",
		border: "1px solid rgba(255,255,255,0.1)",
		borderRadius: "12px",
		textAlign: "center" as const,
		marginBottom: "12px",
		padding: "16px",
	},
	rankLabel: {
		fontSize: "10px",
		color: "#94a3b8",
		letterSpacing: "2px",
		display: "block" as const,
		height: "16px",
		lineHeight: "16px",
		marginBottom: "8px",
	},
	rankNumber: {
		fontSize: "54px",
		fontWeight: "bold",
		color: "#818cf8",
		display: "block" as const,
		lineHeight: "60px",
		height: "60px",
		marginBottom: "8px",
	},
	rankSub: {
		fontSize: "12px",
		color: "#64748b",
		display: "block" as const,
		height: "16px",
		lineHeight: "16px",
	},
	cgpaRow: {
		display: "flex" as const,
		flexDirection: "row" as const,
		alignItems: "center" as const,
		justifyContent: "space-between" as const,
		background: "rgba(255,255,255,0.05)",
		border: "1px solid rgba(255,255,255,0.1)",
		borderRadius: "10px",
		padding: "12px 16px",
		marginBottom: "14px",
		height: "46px",
		boxSizing: "border-box" as const,
	},
	cgpaLabel: {
		fontSize: "13px",
		color: "#94a3b8",
		lineHeight: "22px",
	},
	cgpaValue: {
		fontSize: "22px",
		fontWeight: "bold",
		color: "#ffffff",
		lineHeight: "22px",
	},
	name: {
		textAlign: "center" as const,
		fontSize: "14px",
		fontWeight: "bold",
		color: "rgba(255,255,255,0.8)",
		display: "block" as const,
		height: "20px",
		lineHeight: "20px",
		marginBottom: "14px",
	},
	divider: {
		borderTop: "1px solid rgba(255,255,255,0.08)",
		paddingTop: "10px",
		textAlign: "center" as const,
	},
	branding: {
		fontSize: "10px",
		color: "#475569",
		display: "block" as const,
		height: "14px",
		lineHeight: "14px",
	},
} as const;

function LeaderboardShareCard({ leaderboardData, parsedProgram }: LeaderboardShareCardProps) {
		const { userEntry, userRank, totalStudents } = leaderboardData;
		if (!userEntry || !userRank) return null;

		const programLine = parsedProgram?.programName ?? "Program";
		const branchLine = parsedProgram?.branch ? parsedProgram.branch : null;
		const batchLine = "Batch " + userEntry.batchYear;

		return (
			<div style={s.card}>
				{/* Header */}
				<div style={s.header}>
					<div style={s.iconBox}>
						<span style={s.iconText}>🏆</span>
					</div>
					<div style={s.headerText}>
						<span style={s.title}>CGPA Leaderboard</span>
						<span style={s.subtitle}>
							{programLine}
							{branchLine ? " " + branchLine : ""}
						</span>
						<span style={s.subtitle}>{batchLine}</span>
					</div>
				</div>

				{/* Rank */}
				<div style={s.rankCard}>
					<span style={s.rankLabel}>MY RANK</span>
					<span style={s.rankNumber}>#{userRank}</span>
					<span style={s.rankSub}>of {totalStudents} students</span>
				</div>

				{/* CGPA */}
				<div style={s.cgpaRow}>
					<span style={s.cgpaLabel}>CGPA</span>
					<span style={s.cgpaValue}>{userEntry.cgpa.toFixed(2)}</span>
				</div>

				{/* Name */}
				<span style={s.name}>{userEntry.name}</span>

				{/* Branding */}
				<div style={s.divider}>
					<span style={s.branding}>calc.bhemu.in - Bhemu Calculator</span>
				</div>
			</div>
		);
}

export default LeaderboardShareCard;
