import { useState } from "react";
import { ScrollView, Text, StyleSheet, View, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react-native";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { useGpaData } from "@/contexts/GpaDataContext";
import { useUmsData } from "@/features/ums-data/useUmsData";
import { clearUmsData } from "@/features/ums-data/storage";
import { Layout } from "@/styles";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";

interface SectionProps {
	title: string;
	count: number;
	data: unknown;
}

function DataSection({ title, count, data }: SectionProps) {
	const [open, setOpen] = useState(false);
	const Icon = open ? ChevronDown : ChevronRight;

	return (
		<View style={local.section}>
			<TouchableOpacity style={local.sectionHeader} onPress={() => setOpen(!open)} activeOpacity={0.7}>
				<Icon size={16} color={Colors.textMuted} />
				<Text style={local.sectionTitle}>{title}</Text>
				<Text style={local.count}>{count}</Text>
			</TouchableOpacity>
			{open && (
				<ScrollView horizontal style={local.jsonScroll}>
					<Text style={local.json} selectable>
						{JSON.stringify(data, null, 2)}
					</Text>
				</ScrollView>
			)}
		</View>
	);
}

export default function UmsDataViewerScreen() {
	const { activeProfile } = useGpaData();
	const { data, loading, refresh } = useUmsData();

	const handleClear = async () => {
		if (activeProfile) await clearUmsData(activeProfile);
		refresh();
	};

	return (
		<SafeAreaView style={Layout.flex} edges={["top"]}>
			<ScreenHeader title="UMS Data Viewer" />
			<ScrollView contentContainerStyle={local.scroll} showsVerticalScrollIndicator={false}>
				{loading ? (
					<Text style={local.info}>Loading...</Text>
				) : !data ? (
					<Text style={local.info}>No data. Run a sync first.</Text>
				) : (
					<>
						<Text style={local.info}>
							Last synced: {data.lastSyncedAt ? new Date(data.lastSyncedAt).toLocaleString() : "Never"}
						</Text>

						<DataSection title="Messages" count={data.messages.length} data={data.messages} />
						<DataSection title="Announcements" count={data.announcements.length} data={data.announcements} />
						<DataSection title="Seating Plan" count={data.seatingPlan.length} data={data.seatingPlan} />
						<DataSection title="Timetable" count={data.timetable.length} data={data.timetable} />

						<TouchableOpacity style={local.clearBtn} onPress={handleClear} activeOpacity={0.7}>
							<Trash2 size={16} color={Colors.destructive} />
							<Text style={local.clearText}>Clear Local Data</Text>
						</TouchableOpacity>
					</>
				)}
			</ScrollView>
		</SafeAreaView>
	);
}

const local = StyleSheet.create({
	scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxxl },
	info: { fontSize: FontSize.sm, color: Colors.textMuted },
	section: {
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		borderWidth: 1,
		borderColor: Colors.border,
		overflow: "hidden",
	},
	sectionHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
		padding: Spacing.md,
	},
	sectionTitle: {
		flex: 1,
		fontSize: FontSize.base,
		fontWeight: FontWeight.semibold,
		color: Colors.textPrimary,
	},
	count: {
		fontSize: FontSize.sm,
		color: Colors.primary,
		fontWeight: FontWeight.bold,
	},
	jsonScroll: {
		maxHeight: 300,
		borderTopWidth: 1,
		borderTopColor: Colors.border,
	},
	json: {
		fontSize: 10,
		color: Colors.textMuted,
		fontFamily: "monospace",
		padding: Spacing.md,
	},
	clearBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: Spacing.sm,
		paddingVertical: Spacing.md,
		marginTop: Spacing.lg,
	},
	clearText: {
		fontSize: FontSize.base,
		color: Colors.destructive,
		fontWeight: FontWeight.medium,
	},
});
