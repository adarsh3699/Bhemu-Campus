import { useState } from "react";
import { Text, StyleSheet, TouchableOpacity } from "react-native";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";
import { HtmlText } from "@/features/ums-data/htmlParser";
import type { UMSMessage } from "@bhemu/shared";

interface Props {
	message: UMSMessage;
}

export default function MessageCard({ message }: Props) {
	const [expanded, setExpanded] = useState(false);

	const bodyHtml = message.BodyHtml || message.Body || "";

	return (
		<TouchableOpacity style={local.card} activeOpacity={0.8} onPress={() => setExpanded(!expanded)}>
			<Text style={local.subject} numberOfLines={expanded ? undefined : 2}>
				{message.Subject}
			</Text>
			{bodyHtml ? <HtmlText html={bodyHtml} style={local.body} numberOfLines={expanded ? undefined : 4} /> : null}
			{message.Date ? <Text style={local.date}>{message.Date}</Text> : null}
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
	date: {
		fontSize: FontSize.xs,
		color: Colors.textSubtle,
		marginTop: Spacing.xs,
	},
});
