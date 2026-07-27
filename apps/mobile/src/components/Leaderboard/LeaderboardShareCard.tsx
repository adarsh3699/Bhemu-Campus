import { View, Text, StyleSheet } from "react-native";
import { Trophy, Medal, Star } from "lucide-react-native";
import { getPercentile, getAchievementLabel, getRankTier } from "@bhemu/shared";
import { Colors, FontWeight } from "@/constants/Theme";
import type { LeaderboardData } from "@bhemu/shared";

interface Props {
	leaderboardData: LeaderboardData;
}

const tierColors = {
	gold: {
		stripe: "#F59E0B",
		rankColor: "#FBBF24",
		badgeBg: "rgba(245,158,11,0.1)",
		badgeBorder: "rgba(245,158,11,0.25)",
		badgeText: "#FCD34D",
		iconBg: "rgba(245,158,11,0.15)",
		iconBorder: "rgba(245,158,11,0.4)",
	},
	silver: {
		stripe: "#94A3B8",
		rankColor: "#CBD5E1",
		badgeBg: "rgba(148,163,184,0.1)",
		badgeBorder: "rgba(148,163,184,0.25)",
		badgeText: "#CBD5E1",
		iconBg: "rgba(148,163,184,0.15)",
		iconBorder: "rgba(148,163,184,0.4)",
	},
	bronze: {
		stripe: "#F97316",
		rankColor: "#FB923C",
		badgeBg: "rgba(249,115,22,0.1)",
		badgeBorder: "rgba(249,115,22,0.25)",
		badgeText: "#FDBA74",
		iconBg: "rgba(249,115,22,0.15)",
		iconBorder: "rgba(249,115,22,0.4)",
	},
	default: {
		stripe: Colors.primary,
		rankColor: "#22D3EE",
		badgeBg: "rgba(3,152,172,0.1)",
		badgeBorder: "rgba(3,152,172,0.25)",
		badgeText: "#22D3EE",
		iconBg: "rgba(3,152,172,0.15)",
		iconBorder: "rgba(3,152,172,0.4)",
	},
} as const;

export default function LeaderboardShareCard({ leaderboardData }: Props) {
	const { userEntry, userRank, totalStudents } = leaderboardData;
	if (!userEntry || !userRank) return null;

	const tier = getRankTier(userRank);
	const t = tierColors[tier];
	const percentile = getPercentile(userRank, totalStudents);
	const achievementLabel = getAchievementLabel(userRank, totalStudents);

	const TierIcon = tier === "default" ? Trophy : Medal;

	return (
		<View style={local.card}>
			<View style={[local.stripe, { backgroundColor: t.stripe }]} />

			<View style={local.content}>
				{/* Header */}
				<View style={local.header}>
					<View style={local.headerLeft}>
						<View style={[local.iconWrap, { backgroundColor: t.iconBg, borderColor: t.iconBorder }]}>
							<TierIcon size={16} color={t.badgeText} />
						</View>
						<View style={local.headerInfo}>
							<Text style={local.headerTitle}>CGPA LEADERBOARD</Text>
							<Text style={local.headerProgram} numberOfLines={1}>
								{userEntry.programName}
								{userEntry.branch ? " " + userEntry.branch : ""}
							</Text>
							<Text style={local.headerBatch}>Batch {userEntry.batchYear}</Text>
						</View>
					</View>
					<View style={[local.rankPill, { backgroundColor: t.badgeBg, borderColor: t.badgeBorder }]}>
						<Text style={[local.rankPillText, { color: t.badgeText }]}>#{userRank}</Text>
					</View>
				</View>

				{/* Rank hero */}
				<View style={local.rankHero}>
					<Text style={local.rankLabel}>MY RANK</Text>
					<Text style={[local.rankBig, { color: t.rankColor }]}>#{userRank}</Text>
					<Text style={local.rankSub}>of {totalStudents} students</Text>
				</View>

				{/* Stats row */}
				<View style={local.statsRow}>
					<View style={local.statBox}>
						<Text style={local.statLabel}>CGPA</Text>
						<Text style={local.statValue}>{userEntry.cgpa.toFixed(2)}</Text>
					</View>
					<View style={local.statBox}>
						<Text style={local.statLabel}>PERCENTILE</Text>
						<Text style={[local.statValue, { color: t.rankColor }]}>{percentile}</Text>
					</View>
				</View>

				{/* Achievement badge */}
				<View style={[local.achievementBadge, { backgroundColor: t.badgeBg, borderColor: t.badgeBorder }]}>
					<Star size={12} color={t.badgeText} fill={t.badgeText} />
					<Text style={[local.achievementText, { color: t.badgeText }]}>{achievementLabel}</Text>
				</View>

				{/* Name */}
				<Text style={local.userName}>{userEntry.name}</Text>
			</View>

			{/* Footer */}
			<View style={local.footer}>
				<Text style={local.footerText}>calc.bhemu.in · Bhemu Calculator</Text>
			</View>
		</View>
	);
}

const local = StyleSheet.create({
	card: {
		width: 320,
		borderRadius: 16,
		overflow: "hidden",
		backgroundColor: Colors.shareCardBg,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.08)",
	},
	stripe: {
		height: 4,
	},
	content: {
		padding: 20,
	},
	header: {
		flexDirection: "row",
		alignItems: "flex-start",
		justifyContent: "space-between",
		marginBottom: 16,
	},
	headerLeft: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		flex: 1,
	},
	iconWrap: {
		width: 36,
		height: 36,
		borderRadius: 9,
		borderWidth: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	headerInfo: {
		flex: 1,
	},
	headerTitle: {
		fontSize: 10,
		fontWeight: FontWeight.bold,
		color: Colors.textPrimary,
		letterSpacing: 1.5,
	},
	headerProgram: {
		fontSize: 10,
		color: "rgba(255,255,255,0.55)",
		marginTop: 2,
	},
	headerBatch: {
		fontSize: 10,
		color: "rgba(255,255,255,0.35)",
		marginTop: 1,
	},
	rankPill: {
		paddingHorizontal: 10,
		paddingVertical: 3,
		borderRadius: 20,
		borderWidth: 1,
	},
	rankPillText: {
		fontSize: 11,
		fontWeight: FontWeight.bold,
	},
	rankHero: {
		alignItems: "center",
		marginBottom: 16,
	},
	rankLabel: {
		fontSize: 9,
		color: "rgba(255,255,255,0.35)",
		letterSpacing: 3,
		marginBottom: 4,
	},
	rankBig: {
		fontSize: 56,
		fontWeight: FontWeight.extrabold,
		letterSpacing: -2,
	},
	rankSub: {
		fontSize: 12,
		color: "rgba(255,255,255,0.35)",
		marginTop: 2,
	},
	statsRow: {
		flexDirection: "row",
		gap: 8,
		marginBottom: 10,
	},
	statBox: {
		flex: 1,
		borderRadius: 10,
		padding: 10,
		alignItems: "center",
		backgroundColor: "rgba(255,255,255,0.03)",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.07)",
	},
	statLabel: {
		fontSize: 9,
		color: "rgba(255,255,255,0.35)",
		letterSpacing: 1.5,
		marginBottom: 3,
	},
	statValue: {
		fontSize: 20,
		fontWeight: FontWeight.extrabold,
		color: Colors.textPrimary,
	},
	achievementBadge: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 5,
		paddingHorizontal: 14,
		paddingVertical: 7,
		borderRadius: 8,
		borderWidth: 1,
		marginBottom: 12,
	},
	achievementText: {
		fontSize: 12,
		fontWeight: FontWeight.bold,
	},
	userName: {
		textAlign: "center",
		fontSize: 15,
		fontWeight: FontWeight.extrabold,
		color: Colors.textPrimary,
	},
	footer: {
		paddingVertical: 8,
		paddingHorizontal: 20,
		borderTopWidth: 1,
		borderTopColor: "rgba(255,255,255,0.05)",
		backgroundColor: "rgba(0,0,0,0.25)",
		alignItems: "center",
	},
	footerText: {
		fontSize: 9,
		color: "rgba(255,255,255,0.28)",
	},
});
