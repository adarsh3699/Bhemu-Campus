import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronLeft, ChevronRight, Pin, X } from "lucide-react-native";
import type { ChatDisplayMessage, RoomPin } from "@bhemu/shared";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "@/constants/Theme";

interface Props {
	pins: RoomPin[];
	messages: ChatDisplayMessage[];
	canManage: boolean;
	onSelect: (messageId: string) => void;
	onUnpin: (messageId: string) => Promise<void>;
}

export default function ChatPinnedMessagesBar({ pins, messages, canManage, onSelect, onUnpin }: Props) {
	const [activeIndex, setActiveIndex] = useState(0);
	const messageMap = new Map(messages.map((message) => [message.id, message]));
	const visiblePins = pins.filter((pin) => {
		const message = messageMap.get(pin.messageId);
		return message?.visibility !== "DELETED";
	});

	if (visiblePins.length === 0) return null;

	const safeIndex = Math.min(activeIndex, visiblePins.length - 1);
	const pin = visiblePins[safeIndex]!;
	const message = messageMap.get(pin.messageId);
	const preview = message?.visibility === "DELETED" ? "Message deleted" : message?.content || "Pinned message";

	return (
		<View style={local.container} accessibilityRole="summary" accessibilityLabel="Pinned message">
			<Pressable accessibilityRole="button" accessibilityLabel={`Open pinned message: ${preview}`} onPress={() => onSelect(pin.messageId)} style={({ pressed }) => [local.messageButton, pressed && local.pressed]}>
				<View style={local.pinIcon}>
					<Pin size={15} color={Colors.primary} />
				</View>
				<View style={local.copy}>
					<Text style={local.label}>Pinned message</Text>
					<Text numberOfLines={1} style={local.preview}>{preview}</Text>
				</View>
			</Pressable>

			<View style={local.actions}>
				{visiblePins.length > 1 ? (
					<>
						<Text style={local.count}>{safeIndex + 1}/{visiblePins.length}</Text>
						<Pressable accessibilityRole="button" accessibilityLabel="Previous pinned message" disabled={safeIndex === 0} onPress={() => setActiveIndex((index) => Math.max(0, index - 1))} style={local.iconButton}>
							<ChevronLeft size={17} color={safeIndex === 0 ? Colors.textSubtle : Colors.textMuted} />
						</Pressable>
						<Pressable accessibilityRole="button" accessibilityLabel="Next pinned message" disabled={safeIndex === visiblePins.length - 1} onPress={() => setActiveIndex((index) => Math.min(visiblePins.length - 1, index + 1))} style={local.iconButton}>
							<ChevronRight size={17} color={safeIndex === visiblePins.length - 1 ? Colors.textSubtle : Colors.textMuted} />
						</Pressable>
					</>
				) : null}
				{canManage ? (
					<Pressable accessibilityRole="button" accessibilityLabel="Unpin message" onPress={() => void onUnpin(pin.messageId)} style={local.iconButton}>
						<X size={17} color={Colors.textMuted} />
					</Pressable>
				) : null}
			</View>
		</View>
	);
}

const local = StyleSheet.create({
	container: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xs, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
	messageButton: { flex: 1, minWidth: 0, minHeight: 44, flexDirection: "row", alignItems: "center", gap: Spacing.sm },
	pinIcon: { width: 30, height: 30, alignItems: "center", justifyContent: "center", borderRadius: Radius.full, backgroundColor: Colors.surfaceElevated },
	copy: { flex: 1, minWidth: 0 },
	label: { fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.1, textTransform: "uppercase", color: Colors.primary },
	preview: { marginTop: 2, fontSize: FontSize.sm, color: Colors.textBody },
	actions: { flexDirection: "row", alignItems: "center", gap: 2 },
	count: { marginHorizontal: Spacing.xs, fontSize: FontSize.xs, color: Colors.textSubtle },
	iconButton: { width: 36, height: 40, alignItems: "center", justifyContent: "center", borderRadius: Radius.md },
	pressed: { opacity: 0.72 },
});
