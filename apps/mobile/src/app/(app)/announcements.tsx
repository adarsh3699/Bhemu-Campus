import { useMemo, useState } from "react";
import { FlatList, Text, StyleSheet, View, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ScreenHeader from "@/components/ui/ScreenHeader";
import AnnouncementCard from "@/components/UmsData/AnnouncementCard";
import { useUmsData } from "@/features/ums-data/useUmsData";
import { UMS_ANNOUNCEMENT_CATEGORIES } from "@bhemu/shared";
import { Layout } from "@/styles";
import { Colors, Spacing, FontSize, FontWeight, Radius } from "@/constants/Theme";

const CATEGORY_ORDER = ["AC", "EX", "PL", "CU", "AM", "RE"];

export default function AnnouncementsScreen() {
	const { data, loading } = useUmsData();
	const announcements = data?.announcements ?? [];
	const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

	const availableCategories = useMemo(() => {
		const cats = new Set(announcements.map((ann) => ann.categorycode || "AM"));
		return CATEGORY_ORDER.filter((cat) => cats.has(cat));
	}, [announcements]);

	const filteredAnnouncements = useMemo(() => {
		if (selectedCategory === "ALL") return announcements;
		return announcements.filter((ann) => ann.categorycode === selectedCategory);
	}, [announcements, selectedCategory]);

	return (
		<SafeAreaView style={Layout.flex} edges={["top"]}>
			<ScreenHeader title="Announcements" />
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={local.filters}
				style={local.filtersScroll}
			>
				<TouchableOpacity
					style={[local.chip, selectedCategory === "ALL" && local.chipActive]}
					onPress={() => setSelectedCategory("ALL")}
				>
					<Text style={[local.chipText, selectedCategory === "ALL" && local.chipTextActive]}>ALL</Text>
				</TouchableOpacity>
				{availableCategories.map((cat) => (
					<TouchableOpacity
						key={cat}
						style={[local.chip, selectedCategory === cat && local.chipActive]}
						onPress={() => setSelectedCategory(cat)}
					>
						<Text style={[local.chipText, selectedCategory === cat && local.chipTextActive]}>
							{UMS_ANNOUNCEMENT_CATEGORIES[cat]}
						</Text>
					</TouchableOpacity>
				))}
			</ScrollView>
			<FlatList
				data={filteredAnnouncements}
				keyExtractor={(item, i) => `${item.announcementid}-${i}`}
				renderItem={({ item }) => <AnnouncementCard announcement={item} />}
				style={local.flatList}
				contentContainerStyle={local.list}
				initialNumToRender={5}
				maxToRenderPerBatch={10}
				windowSize={11}
				ListEmptyComponent={
					<View style={local.empty}>
						<Text style={local.emptyText}>
							{loading ? "Loading..." : "No announcements. Tap sync to fetch from UMS."}
						</Text>
					</View>
				}
			/>
		</SafeAreaView>
	);
}

const local = StyleSheet.create({
	flatList: {
		flex: 1,
	},
	filtersScroll: {
		flexGrow: 0,
	},
	filters: {
		paddingHorizontal: Spacing.lg,
		paddingBottom: Spacing.md,
		gap: Spacing.sm,
		flexDirection: "row",
		alignItems: "center",
	},
	chip: {
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.xs,
		borderRadius: Radius.full,
		backgroundColor: Colors.surface,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	chipActive: {
		backgroundColor: Colors.primary + "20",
		borderColor: Colors.primary,
	},
	chipText: {
		fontSize: FontSize.sm,
		fontWeight: FontWeight.medium,
		color: Colors.textMuted,
	},
	chipTextActive: {
		color: Colors.primary,
	},
	list: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.xxxl },
	empty: { alignItems: "center", paddingTop: Spacing.xxxl },
	emptyText: { fontSize: FontSize.base, color: Colors.textMuted, textAlign: "center" },
});
