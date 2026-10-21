import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { ChatTypingUser } from "@/contexts/ChatContext";
import { Colors, FontSize, Spacing } from "@/constants/Theme";

export default memo(function ChatTypingIndicator({ users }: { users: ChatTypingUser[] }) {
	if (users.length === 0) return null;
	const names = users.slice(0, 2).map((user) => user.displayName).join(", ");
	const label = users.length > 2 ? `${names} and ${users.length - 2} others are typing…` : `${names} ${users.length === 1 ? "is" : "are"} typing…`;
	return (
		<View style={local.container} accessibilityLiveRegion="polite">
			<View style={local.dots}><View style={local.dot} /><View style={local.dot} /><View style={local.dot} /></View>
			<Text style={local.text} numberOfLines={1}>{label}</Text>
		</View>
	);
});

const local = StyleSheet.create({
	container: { flexDirection: "row", alignItems: "center", gap: Spacing.xs, minHeight: 26, paddingHorizontal: Spacing.lg },
	dots: { flexDirection: "row", alignItems: "center", gap: 2 },
	dot: { width: 4, height: 4, borderRadius: 4, backgroundColor: Colors.primary },
	text: { flex: 1, fontSize: FontSize.xs, color: Colors.textMuted },
});
