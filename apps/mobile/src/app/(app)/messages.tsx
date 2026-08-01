import { useEffect, useState, useMemo, useCallback } from "react";
import { FlatList, Text, StyleSheet, View, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search, Inbox, SearchX } from "lucide-react-native";
import ScreenHeader from "@/components/ui/ScreenHeader";
import MessageCard from "@/components/UmsData/MessageCard";
import { useGpaProfiles } from "@/contexts/GpaDataContext";
import { useUmsData } from "@/features/ums-data/useUmsData";
import { setMessagesLastSeenCount } from "@/features/ums-data/storage";
import { Layout } from "@/styles";
import { Colors, Spacing, FontSize, FontWeight, Radius } from "@/constants/Theme";

export default function MessagesScreen() {
	const { activeProfile } = useGpaProfiles();
	const { data, loading } = useUmsData();
	const messages = useMemo(() => data?.messages ?? [], [data?.messages]);
	const [search, setSearch] = useState("");

	const filteredMessages = useMemo(() => {
		if (!search.trim()) return messages;
		const q = search.toLowerCase();
		const subjectMatches = messages.filter((m) => m.Subject?.toLowerCase().includes(q));
		const bodyMatches = messages.filter(
			(m) =>
				!m.Subject?.toLowerCase().includes(q) &&
				(m.BodyHtml?.toLowerCase().includes(q) || m.Body?.toLowerCase().includes(q))
		);
		return [...subjectMatches, ...bodyMatches];
	}, [messages, search]);
	const renderItem = useCallback(
		({ item }: { item: (typeof messages)[number] }) => <MessageCard message={item} />,
		[]
	);

	useEffect(() => {
		if (messages.length > 0 && activeProfile) {
			setMessagesLastSeenCount(messages.length, activeProfile);
		}
	}, [messages.length, activeProfile]);

	return (
		<SafeAreaView style={Layout.flex} edges={["top"]}>
			<ScreenHeader title="Messages" />
			<View style={local.searchWrap}>
				<Search size={16} color={Colors.textBody} />
				<TextInput
					style={local.searchInput}
					placeholder="Search messages"
					placeholderTextColor={Colors.textSubtle}
					value={search}
					onChangeText={setSearch}
					returnKeyType="search"
					clearButtonMode="while-editing"
				/>
			</View>
			<FlatList
				data={filteredMessages}
				keyExtractor={(_, index) => String(index)}
				renderItem={renderItem}
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
								<Text style={local.emptyText}>No messages match "{search.trim()}"</Text>
							</>
						) : loading ? (
							<>
								<Inbox size={40} color={Colors.textMuted} />
								<Text style={local.emptyTitle}>Fetching messages...</Text>
								<Text style={local.emptyText}>Please wait a moment</Text>
							</>
						) : (
							<>
								<Inbox size={40} color={Colors.textMuted} />
								<Text style={local.emptyTitle}>No messages yet</Text>
								<Text style={local.emptyText}>
									Go to Home and tap the sync button to fetch your messages
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
