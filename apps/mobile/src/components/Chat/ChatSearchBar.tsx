import { useCallback } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react-native";
import { Colors, FontSize, Radius, Spacing } from "@/constants/Theme";

interface Props {
	query: string;
	resultCount: number;
	activeIndex: number;
	loading: boolean;
	onChange: (query: string) => void;
	onClose: () => void;
	onPrevious: () => void;
	onNext: () => void;
}

export default function ChatSearchBar({ query, resultCount, activeIndex, loading, onChange, onClose, onPrevious, onNext }: Props) {
	const hasQuery = query.trim().length > 0;
	const resultLabel = loading ? "Searching…" : resultCount > 0 ? `${activeIndex + 1} of ${resultCount}` : "No matches";
	const handleSubmit = useCallback(() => onNext(), [onNext]);

	return (
		<View style={local.container}>
			<View style={local.inputRow}>
				<Search size={18} color={Colors.textMuted} />
				<TextInput
					value={query}
					onChangeText={onChange}
					onSubmitEditing={handleSubmit}
					placeholder="Search messages"
					placeholderTextColor={Colors.textSubtle}
					returnKeyType="search"
					autoFocus
					style={local.input}
				/>
				{loading ? <ActivityIndicator size="small" color={Colors.primary} /> : null}
				<Pressable accessibilityRole="button" accessibilityLabel="Close message search" onPress={onClose} hitSlop={8} style={local.iconButton}>
					<X size={18} color={Colors.textMuted} />
				</Pressable>
			</View>
			{hasQuery || loading ? (
				<View style={local.footer}>
					<Text style={local.resultText}>{resultLabel}</Text>
					{resultCount > 0 ? (
						<View style={local.navigation}>
							<Pressable accessibilityRole="button" accessibilityLabel="Previous search result" onPress={onPrevious} disabled={resultCount < 2} style={local.iconButton}>
								<ChevronUp size={17} color={resultCount < 2 ? Colors.textSubtle : Colors.textBody} />
							</Pressable>
							<Pressable accessibilityRole="button" accessibilityLabel="Next search result" onPress={onNext} disabled={resultCount < 2} style={local.iconButton}>
								<ChevronDown size={17} color={resultCount < 2 ? Colors.textSubtle : Colors.textBody} />
							</Pressable>
						</View>
					) : null}
				</View>
			) : null}
		</View>
	);
}

const local = StyleSheet.create({
	container: { marginTop: Spacing.sm, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xs, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.background },
	inputRow: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: Spacing.sm, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: Radius.full, backgroundColor: Colors.surface },
	input: { flex: 1, minWidth: 0, paddingVertical: 0, fontSize: FontSize.sm, color: Colors.textPrimary },
	footer: { minHeight: 22, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 2 },
	resultText: { fontSize: FontSize.xs, color: Colors.textMuted },
	navigation: { flexDirection: "row", gap: Spacing.xs },
	iconButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: Radius.full },
});
