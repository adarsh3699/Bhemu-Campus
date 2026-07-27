import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Trophy, Share2, EyeOff, Settings, TrendingUp } from "lucide-react-native";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";
import { useAuth } from "@/contexts/AuthContext";
import { formatProgramLabel, getPercentile } from "@bhemu/shared";
import { useLeaderboard } from "./hooks/useLeaderboard";
import LeaderboardTable from "./LeaderboardTable";
import UMSSyncPrompt from "./UMSSyncPrompt";
import ShareLeaderboardModal from "./ShareLeaderboardModal";

export default function LeaderboardView() {
	const router = useRouter();
	const { currentUser } = useAuth();
	const { leaderboardData, loading, error, isEligible, entryUserId, profileLoading, userOptedOut, needsResync, refetch } =
		useLeaderboard();
	const [shareModalOpen, setShareModalOpen] = useState(false);

	if (!isEligible && !profileLoading) return <UMSSyncPrompt />;

	if (loading || profileLoading) {
		return (
			<View style={local.centered}>
				<View style={local.loadingWrap}>
					<ActivityIndicator size="small" color={Colors.primary} />
					<Text style={local.loadingText}>Loading leaderboard...</Text>
				</View>
			</View>
		);
	}

	if (userOptedOut) {
		return (
			<View style={local.centered}>
				<View style={local.optedOutCard}>
					<View style={local.optedOutIcon}>
						<EyeOff size={24} color={Colors.textMuted} />
					</View>
					<Text style={local.optedOutTitle}>Leaderboard Hidden</Text>
					<Text style={local.optedOutDesc}>
						You have opted out of the leaderboard. Your rank is not visible to others and you cannot access the leaderboard while hidden.
					</Text>
					<TouchableOpacity
						style={local.settingsBtn}
						onPress={() => router.push("/(app)/(tabs)/settings" as never)}
						activeOpacity={0.7}
					>
						<Settings size={14} color={Colors.primary} />
						<Text style={local.settingsBtnText}>Go to Settings</Text>
					</TouchableOpacity>
				</View>
			</View>
		);
	}

	if (needsResync) return <UMSSyncPrompt />;

	if (error) {
		return (
			<View style={local.centered}>
				<View style={local.errorCard}>
					<Text style={local.errorTitle}>Failed to load leaderboard</Text>
					<Text style={local.errorDesc}>{error}</Text>
				</View>
			</View>
		);
	}

	if (!leaderboardData) return null;

	const { userEntry, userRank, totalStudents } = leaderboardData;
	const groupLabel = userEntry ? formatProgramLabel(userEntry.programName, userEntry.branch) : "Your Program";
	const rankPercentile = userRank && totalStudents > 0 ? getPercentile(userRank, totalStudents) : null;

	return (
		<View style={local.flex}>
			<ScrollView
				contentContainerStyle={local.scroll}
				showsVerticalScrollIndicator={false}
				refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={Colors.primary} />}
			>
				{/* Header Card */}
				<View style={local.headerCard}>
					{/* Title row */}
					<View style={local.titleRow}>
						<View style={local.titleLeft}>
							<View style={local.trophyWrap}>
								<Trophy size={18} color="#FBBF24" />
							</View>
							<View style={local.titleInfo}>
								<Text style={local.headerTitle}>Leaderboard</Text>
								<Text style={local.headerSub} numberOfLines={1}>{groupLabel}</Text>
							</View>
						</View>

						{userEntry && (
							<TouchableOpacity
								style={local.shareBtn}
								onPress={() => setShareModalOpen(true)}
								activeOpacity={0.7}
							>
								<Share2 size={14} color="rgba(255,255,255,0.7)" />
								<Text style={local.shareBtnText}>Share</Text>
							</TouchableOpacity>
						)}
					</View>

					{/* Rank stats */}
					{userRank != null && totalStudents > 0 && (
						<View style={local.statsRow}>
							<View style={local.rankBadge}>
								<Text style={local.rankBadgeLabel}>Your Rank</Text>
								<Text style={local.rankBadgeValue}>#{userRank}</Text>
							</View>
							{rankPercentile !== null && rankPercentile > 0 && (
								<View style={local.percentBadge}>
									<TrendingUp size={12} color="#34D399" />
									<Text style={local.percentText}>Top {100 - rankPercentile}%</Text>
								</View>
							)}
						</View>
					)}
				</View>

				{/* Table */}
				<LeaderboardTable
					data={leaderboardData}
					currentUserId={entryUserId ?? currentUser!.uid}
					currentProfileId={userEntry?.profileId ?? ""}
				/>
			</ScrollView>

			{/* Share Modal */}
			<ShareLeaderboardModal
				visible={shareModalOpen}
				onClose={() => setShareModalOpen(false)}
				leaderboardData={leaderboardData}
			/>
		</View>
	);
}

const local = StyleSheet.create({
	flex: { flex: 1 },
	scroll: {
		padding: Spacing.lg,
		paddingBottom: Spacing.xxxl,
		gap: Spacing.lg,
	},
	centered: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: Spacing.xl,
	},
	loadingWrap: {
		alignItems: "center",
		gap: Spacing.md,
	},
	loadingText: {
		fontSize: FontSize.sm,
		color: Colors.textMuted,
	},

	// Header card
	headerCard: {
		borderRadius: Radius.xl,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.1)",
		backgroundColor: "rgba(255,255,255,0.03)",
		padding: Spacing.lg,
		gap: Spacing.lg,
	},
	titleRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		justifyContent: "space-between",
		gap: Spacing.md,
	},
	titleLeft: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.md,
		flex: 1,
	},
	trophyWrap: {
		width: 36,
		height: 36,
		borderRadius: 10,
		backgroundColor: "rgba(251,191,36,0.1)",
		borderWidth: 1,
		borderColor: "rgba(251,191,36,0.2)",
		alignItems: "center",
		justifyContent: "center",
	},
	titleInfo: {
		flex: 1,
	},
	headerTitle: {
		fontSize: FontSize.xl,
		fontWeight: FontWeight.bold,
		color: Colors.textPrimary,
	},
	headerSub: {
		fontSize: FontSize.xs,
		color: Colors.textMuted,
		marginTop: 2,
	},
	shareBtn: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.xs + 2,
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.sm,
		backgroundColor: "rgba(255,255,255,0.05)",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.1)",
		borderRadius: Radius.md,
	},
	shareBtnText: {
		fontSize: FontSize.xs,
		fontWeight: FontWeight.medium,
		color: "rgba(255,255,255,0.7)",
	},
	statsRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: Spacing.sm,
	},
	rankBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.sm,
		backgroundColor: "rgba(3,152,172,0.1)",
		borderWidth: 1,
		borderColor: "rgba(3,152,172,0.2)",
		borderRadius: Radius.md,
	},
	rankBadgeLabel: {
		fontSize: FontSize.xs,
		color: Colors.textMuted,
	},
	rankBadgeValue: {
		fontSize: FontSize.base,
		fontWeight: FontWeight.bold,
		color: Colors.primary,
	},
	percentBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.xs,
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.sm,
		backgroundColor: "rgba(16,185,129,0.08)",
		borderWidth: 1,
		borderColor: "rgba(16,185,129,0.2)",
		borderRadius: Radius.md,
	},
	percentText: {
		fontSize: FontSize.xs,
		fontWeight: FontWeight.medium,
		color: "#34D399",
	},

	// Opted out
	optedOutCard: {
		backgroundColor: Colors.surface,
		borderRadius: Radius.xl,
		borderWidth: 1,
		borderColor: Colors.border,
		padding: Spacing.xl,
		alignItems: "center",
		gap: Spacing.md,
		maxWidth: 320,
	},
	optedOutIcon: {
		width: 48,
		height: 48,
		borderRadius: 24,
		backgroundColor: "rgba(255,255,255,0.05)",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.1)",
		alignItems: "center",
		justifyContent: "center",
	},
	optedOutTitle: {
		fontSize: FontSize.lg,
		fontWeight: FontWeight.bold,
		color: Colors.textPrimary,
	},
	optedOutDesc: {
		fontSize: FontSize.base,
		color: Colors.textMuted,
		textAlign: "center",
		lineHeight: 20,
	},
	settingsBtn: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.sm + 2,
		backgroundColor: "rgba(3,152,172,0.1)",
		borderWidth: 1,
		borderColor: "rgba(3,152,172,0.2)",
		borderRadius: Radius.md,
	},
	settingsBtnText: {
		fontSize: FontSize.base,
		fontWeight: FontWeight.medium,
		color: Colors.primary,
	},

	// Error
	errorCard: {
		backgroundColor: Colors.surface,
		borderRadius: Radius.xl,
		borderWidth: 1,
		borderColor: Colors.border,
		padding: Spacing.xl,
		alignItems: "center",
		gap: Spacing.sm,
	},
	errorTitle: {
		fontSize: FontSize.base,
		color: Colors.destructive,
	},
	errorDesc: {
		fontSize: FontSize.xs,
		color: Colors.textMuted,
		textAlign: "center",
	},
});
