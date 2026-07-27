import { View, Text, StyleSheet } from "react-native";
import { Colors, Spacing, Radius, FontSize } from "@/constants/Theme";
import LeaderboardRow from "./LeaderboardRow";
import type { LeaderboardData } from "@bhemu/shared";

interface Props {
	data: LeaderboardData;
	currentUserId: string;
	currentProfileId: string;
}

export default function LeaderboardTable({ data, currentUserId, currentProfileId }: Props) {
	const { topEntries, userEntry, userRank, nearbyEntries } = data;

	const isCurrentEntry = (e: { userId: string; profileId: string }) =>
		e.userId === currentUserId && e.profileId === currentProfileId;

	const isUserInTop10 = topEntries.some(isCurrentEntry);

	return (
		<View style={local.container}>
			<View style={local.list}>
				{topEntries.map((entry, index) => (
					<LeaderboardRow
						key={`${entry.userId}_${entry.profileId}`}
						entry={entry}
						rank={index + 1}
						isCurrentUser={isCurrentEntry(entry)}
					/>
				))}

				{!isUserInTop10 && userEntry && userRank && (
					<>
						<View style={local.separator}>
							<View style={local.separatorLine} />
							<Text style={local.separatorDots}>···</Text>
							<View style={local.separatorLine} />
						</View>

						{nearbyEntries.map((entry, index) => (
							<LeaderboardRow
								key={`nearby_${entry.userId}_${entry.profileId}`}
								entry={entry}
								rank={userRank - (nearbyEntries.length - index)}
								isCurrentUser={isCurrentEntry(entry)}
							/>
						))}

						<LeaderboardRow
							entry={userEntry}
							rank={userRank}
							isCurrentUser={true}
						/>
					</>
				)}
			</View>
		</View>
	);
}

const local = StyleSheet.create({
	container: {
		borderRadius: Radius.xl,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.08)",
		backgroundColor: "rgba(255,255,255,0.02)",
		overflow: "hidden",
	},
	list: {
		padding: Spacing.md,
		gap: Spacing.sm,
	},
	separator: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: Spacing.xs,
		paddingHorizontal: Spacing.lg,
		gap: Spacing.sm,
	},
	separatorLine: {
		flex: 1,
		height: 1,
		backgroundColor: "rgba(255,255,255,0.06)",
		borderStyle: "dashed",
	},
	separatorDots: {
		fontSize: FontSize.lg,
		color: Colors.textSubtle,
		letterSpacing: 2,
	},
});
