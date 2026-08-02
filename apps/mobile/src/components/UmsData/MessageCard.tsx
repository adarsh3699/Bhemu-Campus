import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { ChevronDown } from "lucide-react-native";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";
import { HtmlText } from "@/features/ums-data/htmlParser";
import type { UMSMessage } from "@bhemu/shared";

interface Props {
	message: UMSMessage;
}

function hasKeyword(text: string, keyword: string): boolean {
	return text.toLowerCase().includes(keyword);
}

export default function MessageCard({ message }: Props) {
	const [expanded, setExpanded] = useState(false);

	const bodyHtml = message.BodyHtml || message.Body || "";
	const hasOverflow = bodyHtml.length > 200 || message.Subject.length > 60;

	const combined = `${message.Subject} ${bodyHtml}`;
	const isMandatory = hasKeyword(message.Subject, "mandatory");
	const isUrgent = hasKeyword(combined, "urgent");

	return (
		<TouchableOpacity style={local.card} activeOpacity={0.8} onPress={() => setExpanded(!expanded)}>
			<Text style={local.subject} numberOfLines={expanded ? undefined : 2}>
				{message.Subject}
			</Text>
			{bodyHtml ? <HtmlText html={bodyHtml} style={local.body} numberOfLines={expanded ? undefined : 4} /> : null}

			<View style={local.footer}>
				{message.Date ? <Text style={local.date}>{message.Date}</Text> : null}
				{isUrgent && (
					<View style={local.tagUrgent}>
						<Text style={local.tagText}>Urgent</Text>
					</View>
				)}
				{isMandatory && (
					<View style={local.tagMandatory}>
						<Text style={local.tagText}>Mandatory</Text>
					</View>
				)}
			</View>

			{!expanded && hasOverflow && (
				<View style={local.chevron}>
					<ChevronDown size={16} color={Colors.textBody} />
				</View>
			)}
		</TouchableOpacity>
	);
}

const local = StyleSheet.create({
	card: {
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		borderWidth: 1,
		borderColor: Colors.border,
		padding: Spacing.lg,
		gap: Spacing.sm,
	},
	subject: {
		fontSize: FontSize.base,
		fontWeight: FontWeight.semibold,
		color: Colors.textPrimary,
	},
	body: {
		fontSize: FontSize.sm,
		color: Colors.textBody,
		lineHeight: 18,
	},
	footer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	date: {
		fontSize: FontSize.xs,
		color: Colors.textSubtle,
	},
	chevron: {
		position: "absolute",
		bottom: Spacing.sm,
		left: 0,
		right: 0,
		alignItems: "center",
	},
	tagUrgent: {
		backgroundColor: Colors.destructive + "20",
		borderRadius: Radius.sm,
		paddingHorizontal: Spacing.sm,
		paddingVertical: 2,
		borderWidth: 1,
		borderColor: Colors.destructive,
	},
	tagMandatory: {
		backgroundColor: Colors.warning + "20",
		borderRadius: Radius.sm,
		paddingHorizontal: Spacing.sm,
		paddingVertical: 2,
		borderWidth: 1,
		borderColor: Colors.warning,
	},
	tagText: {
		fontSize: FontSize.xs,
		fontWeight: FontWeight.medium,
		color: Colors.textPrimary,
	},
});
