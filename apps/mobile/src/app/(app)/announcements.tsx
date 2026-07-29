import { useMemo, useState } from "react";
import { FlatList, Text, StyleSheet, View, ScrollView, TouchableOpacity, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search, Inbox, SearchX } from "lucide-react-native";
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
	const [search, setSearch] = useState("");

	const availableCategories = useMemo(() => {
		const cats = new Set(announcements.map((ann) => ann.categorycode || "AM"));
		return CATEGORY_ORDER.filter((cat) => cats.has(cat));
	}, [announcements]);

	const filteredAnnouncements = useMemo(() => {
		let result =
			selectedCategory === "ALL"
				? announcements
				: announcements.filter((ann) => ann.categorycode === selectedCategory);
		if (!search.trim()) return result;
		const q = search.toLowerCase();
		const subjectMatches = result.filter((a) => a.subject?.toLowerCase().includes(q));
		const bodyMatches = result.filter(
			(a) => !a.subject?.toLowerCase().includes(q) && a.announcement?.toLowerCase().includes(q)
		);
		return [...subjectMatches, ...bodyMatches];
	}, [announcements, selectedCategory, search]);

	return (
		<SafeAreaView style={Layout.flex} edges={["top"]}>
			<ScreenHeader title="Announcements" />
			<View style={local.searchWrap}>
				<Search size={16} color={Colors.textBody} />
				<TextInput
					style={local.searchInput}
					placeholder="Search announcements"
					placeholderTextColor={Colors.textSubtle}
					value={search}
					onChangeText={setSearch}
					returnKeyType="search"
					clearButtonMode="while-editing"
				/>
			</View>
			{availableCategories.length > 0 && (
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
			)}
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
						{search.trim() ? (
							<>
								<SearchX size={40} color={Colors.textMuted} />
								<Text style={local.emptyTitle}>No results found</Text>
								<Text style={local.emptyText}>No announcements match "{search.trim()}"</Text>
							</>
						) : loading ? (
							<>
								<Inbox size={40} color={Colors.textMuted} />
								<Text style={local.emptyTitle}>Fetching announcements...</Text>
								<Text style={local.emptyText}>Please wait a moment</Text>
							</>
						) : (
							<>
								<Inbox size={40} color={Colors.textMuted} />
								<Text style={local.emptyTitle}>No announcements yet</Text>
								<Text style={local.emptyText}>
									Go to Home and tap the sync button to fetch your announcements
								</Text>
							</>
						)}
					</View>
				}
			/>
		</SafeAreaView>
	);
}

const local = StyleSheet.create({
	searchWrap: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: Colors.surfaceElevated,
		borderWidth: 1,
		borderColor: Colors.borderLight,
		borderRadius: Radius.md,
		marginHorizontal: Spacing.lg,
		marginBottom: Spacing.md,
		paddingHorizontal: Spacing.md,
		height: 40,
		gap: Spacing.sm,
	},
	searchInput: {
		flex: 1,
		fontSize: FontSize.base,
		color: Colors.textPrimary,
	},
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
