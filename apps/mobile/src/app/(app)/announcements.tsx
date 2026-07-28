import { FlatList, Text, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ScreenHeader from "@/components/ui/ScreenHeader";
import AnnouncementCard from "@/components/UmsData/AnnouncementCard";
import { useUmsData } from "@/features/ums-data/useUmsData";
import { Layout } from "@/styles";
import { Colors, Spacing, FontSize } from "@/constants/Theme";

export default function AnnouncementsScreen() {
	const { data, loading } = useUmsData();
	const announcements = data?.announcements ?? [];

	return (
		<SafeAreaView style={Layout.flex} edges={["top"]}>
			<ScreenHeader title="Announcements" />
			<FlatList
				data={announcements}
				keyExtractor={(item, i) => `${item.announcementid}-${i}`}
				renderItem={({ item }) => <AnnouncementCard announcement={item} />}
				contentContainerStyle={local.list}
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
	list: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.xxxl },
	empty: { alignItems: "center", paddingTop: Spacing.xxxl },
	emptyText: { fontSize: FontSize.base, color: Colors.textMuted, textAlign: "center" },
});
