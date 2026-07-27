"use client";

import { Trophy, Medal, Star } from "lucide-react";
import { getPercentile, getAchievementLabel, getRankTier } from "@/components/Rank/lib/rankUtils";
import type { LeaderboardData } from "@/types";

interface LeaderboardShareCardProps {
	leaderboardData: LeaderboardData;
}

const tierStyles = {
	gold: {
		stripe: "linear-gradient(90deg, #D97706 0%, #FDE68A 40%, #F59E0B 60%, #D97706 100%)",
		rankGradient: "linear-gradient(180deg, #FDE68A 0%, #FBBF24 40%, #F59E0B 80%, #D97706 100%)",
		badgeBg: "rgba(245,158,11,0.1)",
		badgeBorder: "1px solid rgba(245,158,11,0.25)",
		badgeText: "#FCD34D",
		iconBg: "rgba(245,158,11,0.15)",
		iconBorder: "1px solid rgba(245,158,11,0.4)",
	},
	silver: {
		stripe: "linear-gradient(90deg, #64748B 0%, #CBD5E1 40%, #94A3B8 60%, #64748B 100%)",
		rankGradient: "linear-gradient(180deg, #F1F5F9 0%, #CBD5E1 40%, #94A3B8 80%, #64748B 100%)",
		badgeBg: "rgba(148,163,184,0.1)",
		badgeBorder: "1px solid rgba(148,163,184,0.25)",
		badgeText: "#CBD5E1",
		iconBg: "rgba(148,163,184,0.15)",
		iconBorder: "1px solid rgba(148,163,184,0.4)",
	},
	bronze: {
		stripe: "linear-gradient(90deg, #92400E 0%, #FED7AA 40%, #F97316 60%, #92400E 100%)",
		rankGradient: "linear-gradient(180deg, #FED7AA 0%, #FB923C 40%, #F97316 80%, #C2410C 100%)",
		badgeBg: "rgba(249,115,22,0.1)",
		badgeBorder: "1px solid rgba(249,115,22,0.25)",
		badgeText: "#FDBA74",
		iconBg: "rgba(249,115,22,0.15)",
		iconBorder: "1px solid rgba(249,115,22,0.4)",
	},
	default: {
		stripe: "linear-gradient(90deg, #0398ac 0%, #22d3ee 40%, #0398ac 60%, #004eeb 100%)",
		rankGradient: "linear-gradient(180deg, #67E8F9 0%, #22D3EE 30%, #0398ac 70%, #004eeb 100%)",
		badgeBg: "rgba(3,152,172,0.1)",
		badgeBorder: "1px solid rgba(3,152,172,0.25)",
		badgeText: "#22D3EE",
		iconBg: "rgba(3,152,172,0.15)",
		iconBorder: "1px solid rgba(3,152,172,0.4)",
	},
};

function LeaderboardShareCard({ leaderboardData }: LeaderboardShareCardProps) {
	const { userEntry, userRank, totalStudents } = leaderboardData;
	if (!userEntry || !userRank) return null;

	const tier = getRankTier(userRank);
	const t = tierStyles[tier];
	const percentile = getPercentile(userRank, totalStudents);
	const achievementLabel = getAchievementLabel(userRank, totalStudents);

	return (
		<div
			style={{
				width: "380px",
				borderRadius: "16px",
				overflow: "hidden",
				background: "linear-gradient(160deg, #111827 0%, #0F172A 100%)",
				border: "1px solid rgba(255,255,255,0.08)",
				boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
			}}
		>
			{/* Accent stripe */}
			<div style={{ height: "4px", background: t.stripe }} />

			<div style={{ padding: "24px" }}>
				{/* Header */}
				<div
					style={{
						display: "flex",
						alignItems: "flex-start",
						justifyContent: "space-between",
						marginBottom: "20px",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
						<div
							style={{
								width: "40px",
								height: "40px",
								borderRadius: "10px",
								background: t.iconBg,
								border: t.iconBorder,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								flexShrink: 0,
							}}
						>
							{tier === "default" ? (
								<Trophy style={{ width: "18px", height: "18px", color: t.badgeText }} />
							) : (
								<Medal style={{ width: "18px", height: "18px", color: t.badgeText }} />
							)}
						</div>
						<div>
							<p
								style={{
									fontSize: "11px",
									fontWeight: 700,
									color: "#ffffff",
									letterSpacing: "1.5px",
									margin: 0,
									lineHeight: "14px",
								}}
							>
								CGPA LEADERBOARD
							</p>
							<p
								style={{
									fontSize: "11px",
									color: "rgba(255,255,255,0.55)",
									margin: "3px 0 0",
									lineHeight: "14px",
								}}
							>
								{userEntry.programName}
								{userEntry.branch ? " " + userEntry.branch : ""}
							</p>
							<p
								style={{
									fontSize: "11px",
									color: "rgba(255,255,255,0.35)",
									margin: "2px 0 0",
									lineHeight: "14px",
								}}
							>
								Batch {userEntry.batchYear}
							</p>
						</div>
					</div>

					{/* Rank pill */}
					<div
						style={{
							padding: "4px 12px",
							borderRadius: "20px",
							background: t.badgeBg,
							border: t.badgeBorder,
							flexShrink: 0,
						}}
					>
						<span style={{ fontSize: "12px", fontWeight: 700, color: t.badgeText }}>#{userRank}</span>
					</div>
				</div>

				{/* Rank hero */}
				<div style={{ textAlign: "center", marginBottom: "20px" }}>
					<p
						style={{
							fontSize: "10px",
							color: "rgba(255,255,255,0.35)",
							letterSpacing: "3px",
							margin: "0 0 6px",
							textTransform: "uppercase",
						}}
					>
						MY RANK
					</p>
					<p
						style={{
							fontSize: "72px",
							fontWeight: 900,
							lineHeight: "1",
							letterSpacing: "-3px",
							margin: 0,
							background: t.rankGradient,
							WebkitBackgroundClip: "text",
							WebkitTextFillColor: "transparent",
							backgroundClip: "text",
						}}
					>
						#{userRank}
					</p>
					<p style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", margin: "4px 0 0" }}>
						of {totalStudents} students
					</p>
				</div>

				{/* Stats row */}
				<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
					<div
						style={{
							borderRadius: "12px",
							padding: "12px",
							textAlign: "center",
							background: "rgba(255,255,255,0.03)",
							border: "1px solid rgba(255,255,255,0.07)",
						}}
					>
						<p
							style={{
								fontSize: "10px",
								color: "rgba(255,255,255,0.35)",
								letterSpacing: "1.5px",
								margin: "0 0 4px",
							}}
						>
							CGPA
						</p>
						<p style={{ fontSize: "24px", fontWeight: 900, color: "#ffffff", margin: 0, lineHeight: "1" }}>
							{userEntry.cgpa.toFixed(2)}
						</p>
					</div>
					<div
						style={{
							borderRadius: "12px",
							padding: "12px",
							textAlign: "center",
							background: "rgba(255,255,255,0.03)",
							border: "1px solid rgba(255,255,255,0.07)",
						}}
					>
						<p
							style={{
								fontSize: "10px",
								color: "rgba(255,255,255,0.35)",
								letterSpacing: "1.5px",
								margin: "0 0 4px",
							}}
						>
							PERCENTILE
						</p>
						<p
							style={{
								fontSize: "24px",
								fontWeight: 900,
								margin: 0,
								lineHeight: "1",
								background: t.rankGradient,
								WebkitBackgroundClip: "text",
								WebkitTextFillColor: "transparent",
								backgroundClip: "text",
							}}
						>
							{percentile}
						</p>
					</div>
				</div>

				{/* Achievement badge */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: "6px",
						padding: "8px 16px",
						borderRadius: "10px",
						marginBottom: "16px",
						background: t.badgeBg,
						border: t.badgeBorder,
					}}
				>
					<Star style={{ width: "14px", height: "14px", color: t.badgeText, fill: t.badgeText }} />
					<span style={{ fontSize: "13px", fontWeight: 700, color: t.badgeText }}>{achievementLabel}</span>
				</div>

				{/* Name */}
				<p style={{ textAlign: "center", fontSize: "17px", fontWeight: 900, color: "#ffffff", margin: 0 }}>
					{userEntry.name}
				</p>
			</div>

			{/* Footer */}
			<div
				style={{
					padding: "10px 24px",
					borderTop: "1px solid rgba(255,255,255,0.05)",
					background: "rgba(0,0,0,0.25)",
					textAlign: "center",
				}}
			>
				<span style={{ fontSize: "10px", color: "rgba(255,255,255,0.28)" }}>
					campus.bhemu.in · bCampus
				</span>
			</div>
		</div>
	);
}

export default LeaderboardShareCard;
