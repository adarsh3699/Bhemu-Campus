import { useMemo } from "react";
import { ScrollView, Text, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ScreenHeader from "@/components/ui/ScreenHeader";
import TimetableDay from "@/components/UmsData/TimetableDay";
import { useUmsData } from "@/features/ums-data/useUmsData";
import { Layout } from "@/styles";
import { Colors, Spacing, FontSize } from "@/constants/Theme";
import type { TimetableEntry } from "@bhemu/shared";

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function TimetableScreen() {
	const { data, loading } = useUmsData();
	const grouped = useMemo(() => {
		const timetable = data?.timetable ?? [];
		const map: Record<string, TimetableEntry[]> = {};
		timetable.forEach((entry) => {
			const day = entry.dayOfWeek;
			if (!map[day]) map[day] = [];
			map[day].push(entry);
		});
		Object.values(map).forEach((entries) =>
			entries.sort((a, b) => a.startTime.localeCompare(b.startTime))
		);
		return DAY_ORDER.filter((d) => map[d]).map((d) => ({ day: d, entries: map[d] }));
	}, [data?.timetable]);

	return (
		<SafeAreaView style={Layout.flex} edges={["top"]}>
			<ScreenHeader title="Timetable" />
			<ScrollView contentContainerStyle={local.scroll} showsVerticalScrollIndicator={false}>
				{grouped.length === 0 ? (
					<View style={local.empty}>
						<Text style={local.emptyText}>
							{loading ? "Loading..." : "No timetable data. Tap sync to fetch from UMS."}
						</Text>
					</View>
				) : (
					grouped.map(({ day, entries }) => (
						<TimetableDay key={day} day={day} entries={entries} />
					))
				)}
			</ScrollView>
		</SafeAreaView>
	);
}

const local = StyleSheet.create({
	scroll: { padding: Spacing.lg, gap: Spacing.xl, paddingBottom: Spacing.xxxl },
	empty: { alignItems: "center", paddingTop: Spacing.xxxl },
	emptyText: { fontSize: FontSize.base, color: Colors.textMuted, textAlign: "center" },
});
