import { useEffect } from "react";
import { FlatList, Text, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ScreenHeader from "@/components/ui/ScreenHeader";
import MessageCard from "@/components/UmsData/MessageCard";
import { useUmsData } from "@/features/ums-data/useUmsData";
import { setMessagesLastSeenCount } from "@/features/ums-data/storage";
import { Layout } from "@/styles";
import { Colors, Spacing, FontSize } from "@/constants/Theme";

export default function MessagesScreen() {
	const { data, loading } = useUmsData();
	const messages = data?.messages ?? [];

	useEffect(() => {
		if (messages.length > 0) {
			setMessagesLastSeenCount(messages.length);
		}
	}, [messages.length]);

	return (
		<SafeAreaView style={Layout.flex} edges={["top"]}>
			<ScreenHeader title="Messages" />
			<FlatList
				data={messages}
				keyExtractor={(_, i) => String(i)}
				renderItem={({ item }) => <MessageCard message={item} />}
				contentContainerStyle={local.list}
				initialNumToRender={5}
				maxToRenderPerBatch={10}
				windowSize={11}
				ListEmptyComponent={
					<View style={local.empty}>
						<Text style={local.emptyText}>
							{loading ? "Loading..." : "No messages yet. Tap sync to fetch from UMS."}
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
