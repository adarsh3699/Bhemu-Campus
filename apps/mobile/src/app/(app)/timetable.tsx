import { useMemo } from "react";
import { ScrollView, Text, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CalendarX2, Loader } from "lucide-react-native";
import ScreenHeader from "@/components/ui/ScreenHeader";
import TimetableDay from "@/components/UmsData/TimetableDay";
import { useUmsData } from "@/features/ums-data/useUmsData";
import { Layout } from "@/styles";
import { Colors, Spacing, FontSize, FontWeight } from "@/constants/Theme";
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
								<Text style={local.emptyText}>Go to Home and tap the sync button to fetch your timetable</Text>
							</>
						)}
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
	empty: { alignItems: "center", paddingTop: Spacing.xxxl, paddingHorizontal: Spacing.xl, gap: Spacing.sm },
	emptyTitle: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textPrimary, textAlign: "center", marginTop: Spacing.sm },
	emptyText: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: "center", lineHeight: 20 },
});
