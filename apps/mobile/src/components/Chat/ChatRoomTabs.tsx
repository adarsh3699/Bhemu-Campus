import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ChatRoom } from "@bhemu/shared";
import type { ActiveRoom } from "@/contexts/ChatContext";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "@/constants/Theme";

interface Props {
	activeRoom: ActiveRoom;
	batchmateRoom: ChatRoom | null;
	onlineCounts: Record<ActiveRoom, number>;
	onSelect: (room: ActiveRoom) => void;
}

export default function ChatRoomTabs({ activeRoom, batchmateRoom, onlineCounts, onSelect }: Props) {
	return (
		<View style={local.scroll}>
			<View style={local.container}>
				<RoomTab
					label="University"
					count={onlineCounts.university}
					active={activeRoom === "university"}
					onPress={() => onSelect("university")}
				/>
				<RoomTab
					label="Batchmate"
					subtitle={batchmateRoom?.name ?? "Sync UMS"}
					count={onlineCounts.batchmate}
					active={activeRoom === "batchmate"}
					disabled={!batchmateRoom}
					onPress={() => onSelect("batchmate")}
				/>
			</View>
		</View>
	);
}

function RoomTab({
	label,
	subtitle,
	count,
	active,
	disabled = false,
	onPress,
}: {
	label: string;
	subtitle?: string;
	count: number;
	active: boolean;
	disabled?: boolean;
	onPress: () => void;
}) {
	return (
		<Pressable
			accessibilityRole="tab"
			accessibilityLabel={`${label} chat room`}
			accessibilityState={{ selected: active, disabled }}
			disabled={disabled}
			onPress={onPress}
			style={({ pressed }) => [
				local.tab,
				active && local.activeTab,
				disabled && local.disabledTab,
				pressed && !disabled && local.pressedTab,
			]}
		>
			<View style={local.labelRow}>
				<Text style={[local.label, active && local.activeLabel, disabled && local.disabledText]}>{label}</Text>
				{count > 0 ? (
					<View style={local.count}>
						<View style={[local.countDot, active && local.activeCountDot]} />
						<Text style={[local.countText, active && local.activeCountText]}>{count}</Text>
					</View>
				) : null}
			</View>
			{subtitle ? (
				<Text style={[local.subtitle, disabled && local.disabledText]} numberOfLines={1}>
					{subtitle}
				</Text>
			) : null}
		</Pressable>
	);
}

const local = StyleSheet.create({
	scroll: { width: "100%", borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.background },
	container: { width: "100%", flexDirection: "row", gap: 0 },
	tab: {
		flex: 1,
		height: 52,
		justifyContent: "center",
		gap: 2,
		paddingHorizontal: Spacing.md,
		minWidth: 0,
		borderBottomWidth: 2,
		borderBottomColor: "transparent",
		backgroundColor: Colors.surface,
	},
	activeTab: { borderBottomColor: Colors.primary, backgroundColor: Colors.surfaceElevated },
	disabledTab: { opacity: 0.58 },
	pressedTab: { opacity: 0.82 },
	labelRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
	label: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, letterSpacing: 1.2, textTransform: "uppercase", color: Colors.textMuted },
	activeLabel: { color: Colors.textPrimary },
	subtitle: { maxWidth: 190, fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 0.4, color: Colors.textSubtle },
	disabledText: { color: Colors.textSubtle },
	count: { flexDirection: "row", alignItems: "center", gap: 4 },
	countDot: { width: 7, height: 7, borderRadius: Radius.full, backgroundColor: Colors.success },
	activeCountDot: { backgroundColor: Colors.successLight },
	countText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.success },
	activeCountText: { color: Colors.successLight },
});
