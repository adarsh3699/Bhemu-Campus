import { FlatList, Text, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Loader, ClipboardList, CalendarX2 } from "lucide-react-native";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SeatingCard from "@/components/UmsData/SeatingCard";
import { useUmsData } from "@/features/ums-data/useUmsData";
import { Layout } from "@/styles";
import { Colors, Spacing, FontSize, FontWeight } from "@/constants/Theme";

export default function SeatingPlanScreen() {
	const { data, loading } = useUmsData();
	const seatingPlan = data?.seatingPlan ?? [];

	const emptyContent = loading ? (
		<>
			<Loader size={40} color={Colors.textMuted} />
			<Text style={local.emptyTitle}>Fetching seating plan...</Text>
			<Text style={local.emptyText}>Please wait a moment</Text>
		</>
	) : data === null ? (
		<>
			<ClipboardList size={40} color={Colors.textMuted} />
			<Text style={local.emptyTitle}>Not synced yet</Text>
			<Text style={local.emptyText}>Go to Home and tap the sync button to fetch your seating plan</Text>
		</>
	) : (
		<>
			<CalendarX2 size={40} color={Colors.textMuted} />
			<Text style={local.emptyTitle}>No exams scheduled</Text>
			<Text style={local.emptyText}>Your seating plan will appear here once exams are announced by the university</Text>
		</>
	);

	return (
		<SafeAreaView style={Layout.flex} edges={["top"]}>
			<ScreenHeader title="Seating Plan" />
			<FlatList
				data={seatingPlan}
				keyExtractor={(item, i) => `${item.CourseCode}-${i}`}
				renderItem={({ item }) => <SeatingCard item={item} />}
				contentContainerStyle={local.list}
				ListEmptyComponent={<View style={local.empty}>{emptyContent}</View>}
			/>
		</SafeAreaView>
	);
}

const local = StyleSheet.create({
	list: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.xxxl },
	empty: { alignItems: "center", paddingTop: Spacing.xxxl, paddingHorizontal: Spacing.xl, gap: Spacing.sm },
	emptyTitle: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textPrimary, textAlign: "center", marginTop: Spacing.sm },
	emptyText: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: "center", lineHeight: 20 },
});
