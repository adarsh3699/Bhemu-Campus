import { memo, useCallback } from "react";
import { FlatList, View, Text, Pressable, StyleSheet } from "react-native";
import { Pencil, Trash2, CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react-native";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";
import type { AttendanceSubject } from "@bhemu/shared";

type Status = "safe" | "warning" | "danger";

function getStatus(pct: number, threshold: number): Status {
	if (pct >= threshold) return "safe";
	if (pct >= 75) return "warning";
	return "danger";
}

const STATUS: Record<Status, { icon: (s: number) => React.ReactNode; pctColor: string; barColor: string; bg: string; border: string }> = {
	safe: {
		icon: (s) => <CheckCircle2 size={s} color={Colors.primary} />,
		pctColor: Colors.primary,
		barColor: Colors.primary,
		bg: "rgba(3,152,172,0.06)",
		border: "rgba(3,152,172,0.18)",
	},
	warning: {
		icon: (s) => <AlertCircle size={s} color={Colors.warning} />,
		pctColor: Colors.warning,
		barColor: Colors.warning,
		bg: "rgba(245,158,11,0.06)",
		border: "rgba(245,158,11,0.18)",
	},
	danger: {
		icon: (s) => <AlertTriangle size={s} color={Colors.destructive} />,
		pctColor: Colors.destructive,
		barColor: Colors.destructive,
		bg: "rgba(239,68,68,0.06)",
		border: "rgba(239,68,68,0.18)",
	},
};

function computeRow(s: AttendanceSubject, defaultThreshold: number) {
	const threshold = s.threshold ?? defaultThreshold;
	const pct = s.totalClasses > 0 ? Math.ceil((s.attended / s.totalClasses) * 100) : 0;
	const status = getStatus(pct, threshold);

	let needed = 0;
	if (status !== "safe" && s.totalClasses > 0) {
		let n = 0;
		while (Math.ceil(((s.attended + n) / (s.totalClasses + n)) * 100) < threshold) {
			n++;
			if (n > 1000) break;
		}
		needed = n;
	}

	let safeToSkip = 0;
	if (status === "safe" && s.totalClasses > 0) {
		let skip = 0;
		let total = s.totalClasses;
		while (Math.ceil((s.attended / (total + 1)) * 100) >= threshold) {
			skip++;
			total++;
			if (skip > 1000) break;
		}
		safeToSkip = skip;
	}

	return { threshold, pct, status, needed, safeToSkip };
}

interface Props {
	subjects: AttendanceSubject[];
	defaultThreshold: number;
	onEdit: (s: AttendanceSubject) => void;
	onDelete: (s: AttendanceSubject) => void;
}

interface RowProps {
	subject: AttendanceSubject;
	defaultThreshold: number;
	onEdit: (subject: AttendanceSubject) => void;
	onDelete: (subject: AttendanceSubject) => void;
}

const AttendanceRow = memo(function AttendanceRowView({ subject, defaultThreshold, onEdit, onDelete }: RowProps) {
	const { threshold, pct, status, needed, safeToSkip } = computeRow(subject, defaultThreshold);
	const st = STATUS[status];

	return (
		<View style={[local.card, { backgroundColor: st.bg, borderColor: st.border }]}>
			<View style={local.topRow}>
				<View style={local.nameRow}>
					{st.icon(16)}
					<Text style={local.name} numberOfLines={1}>{subject.name}</Text>
				</View>
				<View style={local.actions}>
					<Pressable style={local.editBtn} onPress={() => onEdit(subject)} accessibilityLabel={`Edit ${subject.name}`}>
						<Pencil size={13} color={Colors.accent} />
					</Pressable>
					<Pressable style={local.deleteBtn} onPress={() => onDelete(subject)} accessibilityLabel={`Delete ${subject.name}`}>
						<Trash2 size={13} color={Colors.destructive} />
					</Pressable>
				</View>
			</View>

			<View style={local.barBg}>
				<View style={[local.barFill, { width: `${Math.min(pct, 100)}%` as `${number}%`, backgroundColor: st.barColor }]} />
			</View>

			<View style={local.bottomRow}>
				<Text style={local.fraction}>
					<Text style={local.fracMain}>{subject.attended}</Text>
					<Text style={local.fracSep}>/{subject.totalClasses}</Text>
				</Text>
				<Text style={[local.pctBadge, { color: st.pctColor }]}>{pct}%</Text>
				<Text style={local.threshBadge}>≥{threshold}%</Text>
				{status !== "safe" && needed > 0 ? (
					<Text style={[local.hint, { color: st.pctColor }]}>Attend <Text style={local.hintBold}>{needed}</Text> more</Text>
				) : status === "safe" && safeToSkip > 0 ? (
					<Text style={[local.hint, { color: Colors.primary }]}>Can skip <Text style={local.hintBold}>{safeToSkip}</Text></Text>
				) : null}
			</View>
		</View>
	);
});

export default function AttendanceSubjectList({ subjects, defaultThreshold, onEdit, onDelete }: Props) {
	const renderItem = useCallback(
		({ item }: { item: AttendanceSubject }) => (
			<AttendanceRow subject={item} defaultThreshold={defaultThreshold} onEdit={onEdit} onDelete={onDelete} />
		),
		[defaultThreshold, onEdit, onDelete]
	);

	if (subjects.length === 0) {
		return (
			<View style={local.empty}>
				<Text style={local.emptyTitle}>No subjects added yet</Text>
				<Text style={local.emptyBody}>Add your first subject using the form above.</Text>
			</View>
		);
	}

	return (
		<FlatList
			data={subjects}
			renderItem={renderItem}
			keyExtractor={(item) => String(item.id)}
			contentContainerStyle={local.list}
			scrollEnabled={false}
			removeClippedSubviews
		/>
	);
}

const local = StyleSheet.create({
	list: { gap: Spacing.sm },

	card: {
		borderRadius: Radius.lg,
		borderWidth: 1,
		padding: Spacing.md,
		gap: Spacing.sm,
	},

	topRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	nameRow: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.xs,
		minWidth: 0,
		marginRight: Spacing.sm,
	},
	name: {
		flex: 1,
		fontSize: FontSize.base,
		fontWeight: FontWeight.semibold,
		color: Colors.textPrimary,
	},
	actions: {
		flexDirection: "row",
		gap: Spacing.xs,
	},
	editBtn: {
		width: 30,
		height: 30,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(0,78,235,0.1)",
		borderRadius: Radius.sm,
		borderWidth: 1,
		borderColor: "rgba(0,78,235,0.2)",
	},
	deleteBtn: {
		width: 30,
		height: 30,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(239,68,68,0.1)",
		borderRadius: Radius.sm,
		borderWidth: 1,
		borderColor: "rgba(239,68,68,0.2)",
	},

	barBg: {
		height: 5,
		backgroundColor: "rgba(255,255,255,0.08)",
		borderRadius: Radius.full,
		overflow: "hidden",
	},
	barFill: {
		height: "100%",
		borderRadius: Radius.full,
	},

	bottomRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
	},
	fraction: {},
	fracMain: {
		fontSize: FontSize.sm,
		fontWeight: FontWeight.bold,
		color: Colors.textPrimary,
	},
	fracSep: {
		fontSize: FontSize.xs,
		color: Colors.textMuted,
	},
	pctBadge: {
		fontSize: FontSize.sm,
		fontWeight: FontWeight.bold,
	},
	threshBadge: {
		fontSize: FontSize.xs,
		color: Colors.textSubtle,
		backgroundColor: Colors.surfaceElevated,
		borderRadius: Radius.sm,
		paddingHorizontal: 5,
		paddingVertical: 2,
		overflow: "hidden",
	},
	hint: {
		marginLeft: "auto",
		fontSize: FontSize.xs,
	},
	hintBold: {
		fontWeight: FontWeight.bold,
	},

	empty: {
		alignItems: "center",
		paddingVertical: Spacing.xxxl,
	},
	emptyTitle: {
		fontSize: FontSize.xxl,
		fontWeight: FontWeight.bold,
		color: Colors.primary,
		marginBottom: Spacing.xs,
	},
	emptyBody: {
		fontSize: FontSize.sm,
		color: Colors.textSubtle,
		textAlign: "center",
	},
});
