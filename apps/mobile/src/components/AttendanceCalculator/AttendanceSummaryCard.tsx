import { useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Check, X } from "lucide-react-native";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";

interface Props {
	overallAttendance: number | null;
	subjectCount: number;
	belowThresholdCount: number;
	defaultThreshold: number;
	onUpdateThreshold: (val: number) => void;
}

export default function AttendanceSummaryCard({
	overallAttendance,
	subjectCount,
	belowThresholdCount,
	defaultThreshold,
	onUpdateThreshold,
}: Props) {
	const [editing, setEditing] = useState(false);
	const [input, setInput] = useState("");
	const inputRef = useRef<TextInput>(null);

	const pct = overallAttendance;
	const pctColor =
		pct === null
			? Colors.textSubtle
			: pct < 75
				? Colors.destructive
				: pct < defaultThreshold
					? Colors.warning
					: Colors.primary;

	const handleSet = () => {
		const val = Number(input);
		if (!isNaN(val) && val > 0 && val <= 100) onUpdateThreshold(val);
		setEditing(false);
		setInput("");
	};

	const handleCancel = () => {
		setEditing(false);
		setInput("");
	};

	const openEdit = () => {
		setInput(String(defaultThreshold));
		setEditing(true);
		setTimeout(() => inputRef.current?.focus(), 50);
	};

	return (
		<View style={local.card}>
			{/* Overall % hero */}
			<View style={local.heroRow}>
				<Text style={[local.heroPct, { color: pctColor }]}>{pct !== null ? `${pct}%` : "—"}</Text>
				<Text style={local.heroLabel}>Overall Attendance</Text>
			</View>

			<View style={local.hr} />

			{/* Stats row — always static, no inline editing here */}
			<View style={local.statsRow}>
				<View style={local.stat}>
					<Text style={local.statVal}>{subjectCount}</Text>
					<Text style={local.statLabel}>Subjects</Text>
				</View>

				<View style={local.statDivider} />

				<View style={local.stat}>
					<Text style={[local.statVal, belowThresholdCount > 0 && local.red]}>{belowThresholdCount}</Text>
					<Text style={local.statLabel}>Below Threshold</Text>
				</View>

				<View style={local.statDivider} />

				<View style={local.stat}>
					<Text style={local.statVal}>{defaultThreshold}%</Text>
					<Text style={local.statLabel}>Default Threshold</Text>
				</View>
			</View>

			{/* Threshold editor — collapses in/out below stats */}
			{editing ? (
				<View style={local.editRow}>
					<View style={local.editInputWrap}>
						<TextInput
							ref={inputRef}
							style={local.editInput}
							value={input}
							onChangeText={setInput}
							keyboardType="number-pad"
							placeholder={String(defaultThreshold)}
							placeholderTextColor={Colors.textSubtle}
							maxLength={3}
							returnKeyType="done"
							onSubmitEditing={handleSet}
						/>
						<Text style={local.editPctSign}>%</Text>
					</View>
					<TouchableOpacity style={local.setBtn} onPress={handleSet} activeOpacity={0.8}>
						<Check size={16} color={Colors.textPrimary} />
						<Text style={local.setBtnText}>Set</Text>
					</TouchableOpacity>
					<TouchableOpacity style={local.cancelBtn} onPress={handleCancel} activeOpacity={0.8}>
						<X size={16} color={Colors.textMuted} />
					</TouchableOpacity>
				</View>
			) : (
				<TouchableOpacity style={local.thresholdBtn} onPress={openEdit} activeOpacity={0.7}>
					<Text style={local.thresholdBtnText}>Set Threshold</Text>
				</TouchableOpacity>
			)}
		</View>
	);
}

const local = StyleSheet.create({
	card: {
		backgroundColor: Colors.surface,
		borderRadius: Radius.xl,
		borderWidth: 1,
		borderColor: Colors.border,
		overflow: "hidden",
	},
	heroRow: {
		alignItems: "center",
		paddingTop: Spacing.xl,
		paddingBottom: Spacing.lg,
		paddingHorizontal: Spacing.xl,
	},
	heroPct: {
		fontSize: 56,
		fontWeight: FontWeight.extrabold,
		lineHeight: 60,
		letterSpacing: -1,
	},
	heroLabel: {
		fontSize: FontSize.xs,
		color: Colors.textSubtle,
		textTransform: "uppercase",
		letterSpacing: 1.4,
		fontWeight: FontWeight.bold,
		marginTop: Spacing.xs,
	},
	hr: {
		height: 1,
		backgroundColor: Colors.border,
		marginHorizontal: Spacing.lg,
	},
	statsRow: {
		flexDirection: "row",
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.lg,
	},
	stat: {
		flex: 1,
		alignItems: "center",
		gap: 4,
	},
	statDivider: {
		width: 1,
		backgroundColor: Colors.border,
		marginVertical: 4,
	},
	statVal: {
		fontSize: FontSize.xxl,
		fontWeight: FontWeight.bold,
		color: Colors.textPrimary,
		lineHeight: 28,
	},
	statLabel: {
		fontSize: FontSize.xs,
		color: Colors.textMuted,
		textAlign: "center",
		lineHeight: 14,
	},
	red: { color: Colors.destructive },

	// Threshold edit row — full width, below stats
	editRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
		marginHorizontal: Spacing.lg,
		marginBottom: Spacing.md,
	},
	editInputWrap: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		height: 42,
		backgroundColor: Colors.surfaceElevated,
		borderRadius: Radius.md,
		borderWidth: 1,
		borderColor: Colors.primary,
		paddingHorizontal: Spacing.md,
	},
	editInput: {
		flex: 1,
		color: Colors.textPrimary,
		fontSize: FontSize.base,
	},
	editPctSign: {
		fontSize: FontSize.sm,
		color: Colors.textMuted,
		marginLeft: 2,
	},
	setBtn: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		height: 42,
		paddingHorizontal: Spacing.md,
		backgroundColor: Colors.primary,
		borderRadius: Radius.md,
	},
	setBtnText: {
		fontSize: FontSize.sm,
		fontWeight: FontWeight.bold,
		color: Colors.textPrimary,
	},
	cancelBtn: {
		width: 42,
		height: 42,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: Colors.surfaceElevated,
		borderRadius: Radius.md,
		borderWidth: 1,
		borderColor: Colors.border,
	},

	// Collapsed state
	thresholdBtn: {
		marginHorizontal: Spacing.lg,
		marginBottom: Spacing.md,
		height: 36,
		borderRadius: Radius.md,
		backgroundColor: Colors.surfaceElevated,
		borderWidth: 1,
		borderColor: Colors.border,
		alignItems: "center",
		justifyContent: "center",
	},
	thresholdBtnText: {
		fontSize: FontSize.xs,
		fontWeight: FontWeight.semibold,
		color: Colors.textSubtle,
		textTransform: "uppercase",
		letterSpacing: 0.8,
	},
});
