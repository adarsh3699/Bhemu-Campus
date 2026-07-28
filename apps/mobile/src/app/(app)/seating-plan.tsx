import { FlatList, Text, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SeatingCard from "@/components/UmsData/SeatingCard";
import { useUmsData } from "@/features/ums-data/useUmsData";
import { Layout } from "@/styles";
import { Colors, Spacing, FontSize } from "@/constants/Theme";

export default function SeatingPlanScreen() {
	const { data, loading } = useUmsData();
	const seatingPlan = data?.seatingPlan ?? [];

	return (
		<SafeAreaView style={Layout.flex} edges={["top"]}>
			<ScreenHeader title="Seating Plan" />
			<FlatList
				data={seatingPlan}
				keyExtractor={(item, i) => `${item.CourseCode}-${i}`}
				renderItem={({ item }) => <SeatingCard item={item} />}
				contentContainerStyle={local.list}
				ListEmptyComponent={
					<View style={local.empty}>
						<Text style={local.emptyText}>
							{loading ? "Loading..." : "No seating plan available. Exams may not be scheduled yet."}
						</Text>
					</View>
				}
			/>
		</SafeAreaView>
	);
}

const local = StyleSheet.create({
	list: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.xxxl },
	empty: { alignItems: "center", paddingTop: Spacing.xxxl },
	emptyText: { fontSize: FontSize.base, color: Colors.textMuted, textAlign: "center" },
});
