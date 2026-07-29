import { memo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking } from "react-native";
import { ChevronDown } from "lucide-react-native";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";
import { UMS_ANNOUNCEMENT_CATEGORIES } from "@bhemu/shared";
import { HtmlText } from "@/features/ums-data/htmlParser";
import type { UMSAnnouncement } from "@bhemu/shared";

interface Props {
	announcement: UMSAnnouncement;
}

function AnnouncementCard({ announcement }: Props) {
	const [expanded, setExpanded] = useState(false);

	const categoryLabel = UMS_ANNOUNCEMENT_CATEGORIES[announcement.categorycode] || announcement.categorycode;
	const hasOverflow = (announcement.announcement && announcement.announcement.length > 200) || announcement.subject.length > 80;

	return (
		<TouchableOpacity style={local.card} activeOpacity={0.8} onPress={() => setExpanded(!expanded)}>
			<View style={local.header}>
				<View style={local.badge}>
					<Text style={local.badgeText}>{categoryLabel}</Text>
				</View>
				<Text style={local.date}>{announcement.date}</Text>
			</View>

			<Text style={local.subject} numberOfLines={expanded ? undefined : 2}>
				{announcement.subject}
			</Text>

			{announcement.announcement ? (
				<HtmlText
					html={announcement.announcement}
					style={local.body}
					numberOfLines={expanded ? undefined : 5}
				/>
			) : null}

			{announcement.employeename ? <Text style={local.sender}>— {announcement.employeename}</Text> : null}

			{announcement.Files && announcement.Files.length > 0 && (
				<View style={local.filesRow}>
					{announcement.Files.map((f, fi) => (
						<TouchableOpacity
							key={`${f.id}-${fi}`}
							onPress={() => Linking.openURL(`https://ums.lpu.in${f.filepath}`).catch(() => {})}
						>
							<Text style={local.fileLink}>{f.FileName}</Text>
						</TouchableOpacity>
					))}
				</View>
			)}

			{!expanded && hasOverflow && (
				<View style={local.chevron}>
					<ChevronDown size={16} color={Colors.textMuted} />
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
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	badge: {
		backgroundColor: Colors.primary + "20",
		borderRadius: Radius.sm,
		paddingHorizontal: Spacing.sm,
		paddingVertical: 2,
	},
	badgeText: {
		fontSize: FontSize.xs,
		color: Colors.primary,
		fontWeight: FontWeight.medium,
	},
	date: {
		fontSize: FontSize.xs,
		color: Colors.textSubtle,
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
	sender: {
		fontSize: FontSize.xs,
		color: Colors.textSubtle,
		fontStyle: "italic",
	},
	filesRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: Spacing.sm,
	},
	fileLink: {
		fontSize: FontSize.xs,
		color: Colors.secondary,
		textDecorationLine: "underline",
	},
	chevron: {
		position: "absolute",
		bottom: Spacing.sm,
		right: Spacing.sm,
	},
});

export default memo(AnnouncementCard);
