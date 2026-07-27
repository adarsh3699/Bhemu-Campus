import { View, Text, StyleSheet } from "react-native";
import { Trophy, Medal } from "lucide-react-native";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";
import type { LeaderboardEntry } from "@bhemu/shared";

interface Props {
	entry: LeaderboardEntry;
	rank: number;
	isCurrentUser: boolean;
}

function RankBadge({ rank }: { rank: number }) {
	if (rank === 1) return <Trophy size={18} color="#FBBF24" />;
	if (rank === 2) return <Medal size={18} color="#CBD5E1" />;
	if (rank === 3) return <Medal size={18} color="#D97706" />;
	return <Text style={local.rankText}>#{rank}</Text>;
}

export default function LeaderboardRow({ entry, rank, isCurrentUser }: Props) {
	const isTop3 = rank <= 3;

	return (
		<View style={[
			local.row,
			isCurrentUser && local.rowCurrent,
			isTop3 && !isCurrentUser && local.rowTop3,
		]}>
			<View style={local.rankWrap}>
				<RankBadge rank={rank} />
			</View>

			<View style={local.nameWrap}>
				<Text style={[local.name, isCurrentUser && local.nameCurrent]} numberOfLines={1}>
					{entry.name}
					{isCurrentUser && <Text style={local.youLabel}> (You)</Text>}
				</Text>
			</View>

			<View style={[
				local.cgpaBadge,
				isTop3 && local.cgpaTop3,
				isCurrentUser && local.cgpaCurrent,
			]}>
				<Text style={[
					local.cgpaText,
					isTop3 && local.cgpaTextTop3,
					isCurrentUser && local.cgpaTextCurrent,
				]}>
					{entry.cgpa.toFixed(2)}
				</Text>
			</View>
		</View>
	);
}

const local = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.md,
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.md,
		borderRadius: Radius.lg,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.06)",
		backgroundColor: "rgba(255,255,255,0.02)",
	},
	rowCurrent: {
		backgroundColor: "rgba(3,152,172,0.1)",
		borderColor: "rgba(3,152,172,0.3)",
	},
	rowTop3: {
		backgroundColor: "rgba(255,255,255,0.04)",
		borderColor: "rgba(255,255,255,0.1)",
	},
	rankWrap: {
		width: 28,
		alignItems: "center",
		justifyContent: "center",
	},
	rankText: {
		fontSize: FontSize.sm,
		fontWeight: FontWeight.bold,
		color: Colors.textMuted,
	},
	nameWrap: {
		flex: 1,
		minWidth: 0,
	},
	name: {
		fontSize: FontSize.base,
		fontWeight: FontWeight.medium,
		color: "rgba(255,255,255,0.9)",
	},
	nameCurrent: {
		color: Colors.primary,
		fontWeight: FontWeight.semibold,
	},
	youLabel: {
		fontSize: FontSize.xs,
		fontWeight: FontWeight.regular,
		color: "rgba(3,152,172,0.6)",
	},
	cgpaBadge: {
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.xs,
		borderRadius: Radius.md,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.1)",
		backgroundColor: "rgba(255,255,255,0.08)",
	},
	cgpaTop3: {
		backgroundColor: "rgba(245,158,11,0.1)",
		borderColor: "rgba(245,158,11,0.2)",
	},
	cgpaCurrent: {
		backgroundColor: "rgba(3,152,172,0.15)",
		borderColor: "rgba(3,152,172,0.25)",
	},
	cgpaText: {
		fontSize: FontSize.base,
		fontWeight: FontWeight.bold,
		color: "rgba(255,255,255,0.75)",
	},
	cgpaTextTop3: {
		color: "#FBBF24",
	},
	cgpaTextCurrent: {
		color: Colors.primary,
	},
});
