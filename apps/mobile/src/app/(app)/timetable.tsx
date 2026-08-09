import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { RefreshControl, ScrollView, Text, StyleSheet, View, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CalendarX2, Loader } from "lucide-react-native";
import ScreenHeader from "@/components/ui/ScreenHeader";
import TimetableDay from "@/components/UmsData/TimetableDay";
import { useUmsData } from "@/features/ums-data/useUmsData";
import { Layout } from "@/styles";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";
import type { TimetableEntry } from "@bhemu/shared";

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function TimetableScreen() {
	const { data, loading, refresh } = useUmsData();
	const tabScrollRef = useRef<ScrollView>(null);
	const [refreshing, setRefreshing] = useState(false);
	const now = new Date();
	const todayName = DAY_ORDER[(now.getDay() + 6) % 7];
	const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

	const handleRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			await refresh();
		} finally {
			setRefreshing(false);
		}
	}, [refresh]);

	const grouped = useMemo(() => {
		const timetable = data?.timetable ?? [];
		const map: Record<string, TimetableEntry[]> = {};
		timetable.forEach((entry) => {
			const day = entry.dayOfWeek;
			if (!map[day]) map[day] = [];
			map[day].push(entry);
		});
		Object.values(map).forEach((entries) => entries.sort((a, b) => a.startTime.localeCompare(b.startTime)));
		return DAY_ORDER.filter((d) => map[d]).map((d) => ({ day: d, entries: map[d] }));
	}, [data?.timetable]);

	const [selectedDay, setSelectedDay] = useState<string | null>(null);
	const activeDay = selectedDay && grouped.some((g) => g.day === selectedDay)
		? selectedDay
		: grouped.find((g) => g.day === todayName)?.day ?? grouped[0]?.day ?? "";
	const selectedEntries = grouped.find((g) => g.day === activeDay)?.entries ?? [];

	// Auto-scroll tab strip so today's (or active) chip is visible
	useEffect(() => {
		if (!activeDay || grouped.length === 0) return;
		const idx = grouped.findIndex((g) => g.day === activeDay);
		if (idx > 0) {
			tabScrollRef.current?.scrollTo({ x: idx * 85, animated: false });
		}
	}, [activeDay, grouped]);

	return (
		<SafeAreaView style={Layout.flex} edges={["top"]}>
			<ScreenHeader title="Timetable" />

			{grouped.length > 0 && (
				<ScrollView
					ref={tabScrollRef}
					horizontal
					showsHorizontalScrollIndicator={false}
					style={local.tabStripOuter}
					contentContainerStyle={local.tabStrip}
				>
					{grouped.map(({ day }) => {
						const isActive = day === activeDay;
						const isToday = day === todayName;
						return (
							<TouchableOpacity
								key={day}
								style={[local.tab, isActive ? local.tabActive : local.tabInactive]}
								onPress={() => setSelectedDay(day)}
								activeOpacity={0.7}
							>
								{isToday && <View style={local.todayDot} />}
								<Text
									style={[local.tabLabel, isActive ? local.tabLabelActive : local.tabLabelInactive]}
								>
									{day}
								</Text>
							</TouchableOpacity>
						);
					})}
				</ScrollView>
			)}

			<ScrollView
				contentContainerStyle={local.scroll}
				showsVerticalScrollIndicator={false}
				alwaysBounceVertical
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={handleRefresh}
						tintColor={Colors.primary}
						colors={[Colors.primary]}
					/>
				}
			>
				{grouped.length === 0 ? (
					<View style={local.empty}>
						{loading ? (
							<>
								<Loader size={40} color={Colors.textMuted} />
								<Text style={local.emptyTitle}>Fetching timetable...</Text>
								<Text style={local.emptyText}>Please wait a moment</Text>
							</>
						) : (
							<>
								<CalendarX2 size={40} color={Colors.textMuted} />
								<Text style={local.emptyTitle}>No timetable yet</Text>
								<Text style={local.emptyText}>
									Go to Home and tap the sync button to fetch your timetable
								</Text>
							</>
						)}
					</View>
				) : (
					<TimetableDay
						day={activeDay}
						entries={selectedEntries}
						showLabel={false}
						currentDay={todayName}
						currentTimeMinutes={currentTimeMinutes}
					/>
				)}
			</ScrollView>
		</SafeAreaView>
	);
}

const local = StyleSheet.create({
	tabStripOuter: { flexGrow: 0 },
	tabStrip: {
		paddingHorizontal: Spacing.lg,
		paddingBottom: Spacing.md,
		gap: Spacing.sm,
		flexDirection: "row",
		alignItems: "center",
	},
	tab: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.xs + 2,
		borderRadius: Radius.full,
		borderWidth: 1,
		gap: Spacing.xs,
	},
	tabActive: {
		backgroundColor: Colors.secondary + "20",
		borderColor: Colors.secondary,
	},
	tabInactive: {
		backgroundColor: Colors.surface,
		borderColor: Colors.border,
	},
	tabLabel: {
		fontSize: FontSize.sm,
		fontWeight: FontWeight.semibold,
	},
	tabLabelActive: { color: Colors.secondary },
	tabLabelInactive: { color: Colors.textMuted },
	todayDot: {
		width: 5,
		height: 5,
		borderRadius: Radius.full,
		backgroundColor: Colors.secondary,
	},
	scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
	empty: { alignItems: "center", paddingTop: Spacing.xxxl, paddingHorizontal: Spacing.xl, gap: Spacing.sm },
	emptyTitle: {
		fontSize: FontSize.base,
		fontWeight: FontWeight.semibold,
		color: Colors.textPrimary,
		textAlign: "center",
		marginTop: Spacing.sm,
	},
	emptyText: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: "center", lineHeight: 20 },
});
