import { useMemo, useState, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Target, BarChart3, RotateCw, Settings2, Plus, Minus } from "lucide-react-native";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";
import AppInput from "@/components/ui/AppInput";

const TOTAL_OPTIONS = ["4", "6", "8"] as const;

export default function GpaGoalPlannerView() {
	const [currentCgpa, setCurrentCgpa] = useState("");
	const [completedSemesters, setCompletedSemesters] = useState("");
	const [totalSemesters, setTotalSemesters] = useState<"4" | "6" | "8">("8");
	const [targetCgpa, setTargetCgpa] = useState("8.50");

	const completedRef = useRef<TextInput>(null);
	const targetRef = useRef<TextInput>(null);

	const result = useMemo<{ required: number; possible: boolean; remaining: number } | null>(() => {
		const current = parseFloat(currentCgpa);
		const completed = parseInt(completedSemesters);
		const total = parseInt(totalSemesters);
		const target = parseFloat(targetCgpa);
		if (isNaN(current) || isNaN(completed) || isNaN(total) || isNaN(target) || completed >= total) {
			return null;
		}
		const remaining = total - completed;
		const requiredSgpa = (target * total - current * completed) / remaining;
		return { required: requiredSgpa, possible: requiredSgpa <= 10 && requiredSgpa >= 0, remaining };
	}, [currentCgpa, completedSemesters, totalSemesters, targetCgpa]);

	const adjustTarget = (delta: number) => {
		setTargetCgpa((prev) => {
			const current = parseFloat(prev) || 0;
			const next = Math.min(10, Math.max(0, Math.round((current + delta) * 100) / 100));
			return next.toFixed(2);
		});
	};

	const handleReset = () => {
		setCurrentCgpa("");
		setCompletedSemesters("");
		setTargetCgpa("8.50");
	};

	const targetNum = parseFloat(targetCgpa) || 0;

	const resultColor =
		result === null
			? Colors.textSubtle
			: !result.possible
				? Colors.destructive
				: result.required > 9
					? Colors.warning
					: Colors.success;

	const resultLabel =
		result === null
			? null
			: !result.possible
				? "Not Achievable"
				: result.required > 9
					? "Challenging"
					: "Achievable";

	const pastSemesters = completedSemesters ? parseInt(completedSemesters) : 0;
	const totalInt = parseInt(totalSemesters);
	const futureSemesters = Math.max(0, totalInt - pastSemesters);

	return (
		<KeyboardAwareScrollView
			bottomOffset={20}
			contentContainerStyle={local.scroll}
			showsVerticalScrollIndicator={false}
			keyboardShouldPersistTaps="handled"
		>
			<View style={local.pageTitle}>
				<Text style={local.pageTitleText}>Goal Planner</Text>
				<Text style={local.pageTitleSub}>Plan your target CGPA semester by semester</Text>
			</View>

			{/* Combined input card */}
			<View style={local.card}>
				<View style={local.sectionHeader}>
					<Settings2 size={16} color={Colors.primary} />
					<Text style={local.sectionTitle}>Current Status</Text>
				</View>

				<View style={local.twoCol}>
					<AppInput
						label="Current CGPA"
						size="md"
						containerStyle={local.fieldGroup}
						value={currentCgpa}
						onChangeText={setCurrentCgpa}
						placeholder="e.g. 7.54"
						keyboardType="decimal-pad"
						returnKeyType="next"
						onSubmitEditing={() => completedRef.current?.focus()}
						submitBehavior="submit"
					/>
					<AppInput
						ref={completedRef}
						label="Completed Sems"
						size="md"
						containerStyle={local.fieldGroup}
						value={completedSemesters}
						onChangeText={setCompletedSemesters}
						placeholder="e.g. 3"
						keyboardType="number-pad"
						returnKeyType="next"
						onSubmitEditing={() => targetRef.current?.focus()}
						submitBehavior="submit"
					/>
				</View>

				<View style={local.fieldGroup}>
					<View style={local.labelRow}>
						<Text style={local.label}>Total Semesters</Text>
						<View style={local.badge}>
							<Text style={local.badgeText}>{totalSemesters} Sem</Text>
						</View>
					</View>
					<View style={local.segmentRow}>
						{TOTAL_OPTIONS.map((opt) => (
							<TouchableOpacity
								key={opt}
								style={[local.segment, totalSemesters === opt && local.segmentActive]}
								onPress={() => setTotalSemesters(opt)}
								activeOpacity={0.8}
							>
								<Text style={[local.segmentText, totalSemesters === opt && local.segmentTextActive]}>
									{opt}
								</Text>
							</TouchableOpacity>
						))}
					</View>
				</View>

				<View style={local.divider} />

				{/* Target section */}
				<View style={local.sectionHeader}>
					<Target size={16} color={Colors.warning} />
					<Text style={local.sectionTitle}>Target CGPA</Text>
				</View>

				<View style={local.stepperWrap}>
					<TouchableOpacity style={local.stepBtn} onPress={() => adjustTarget(-0.5)} activeOpacity={0.7}>
						<Minus size={20} color={Colors.textPrimary} />
					</TouchableOpacity>
					<TextInput
						ref={targetRef}
						style={local.stepValue}
						value={targetCgpa}
						onChangeText={setTargetCgpa}
						keyboardType="decimal-pad"
						placeholder="8.50"
						placeholderTextColor={Colors.textSubtle}
						textAlign="center"
						selectTextOnFocus
						returnKeyType="done"
					/>
					<TouchableOpacity style={local.stepBtn} onPress={() => adjustTarget(+0.5)} activeOpacity={0.7}>
						<Plus size={20} color={Colors.textPrimary} />
					</TouchableOpacity>
				</View>

				<View style={local.rangeHint}>
					<Text style={local.rangeHintText}>Current: {currentCgpa || "—"}</Text>
					<Text style={local.rangeHintText}>Target: {targetNum.toFixed(2)} · Max: 10.00</Text>
				</View>
			</View>

			{/* Result hero card */}
			{result && (
				<View style={[local.resultCard, { borderTopColor: resultColor }]}>
					<Text style={[local.resultValue, { color: resultColor }]}>{result.required.toFixed(2)}</Text>
					<Text style={local.resultLabel}>Required Avg. SGPA</Text>
					<Text style={local.resultSub}>
						per semester · next {result.remaining} semesters · {resultLabel}
					</Text>
				</View>
			)}

			{/* Forecast */}
			<View style={local.card}>
				<View style={local.sectionHeader}>
					<BarChart3 size={16} color={Colors.secondary} />
					<Text style={local.sectionTitle}>Semester Forecast</Text>
					<View style={local.legendRow}>
						<View style={local.legendItem}>
							<View style={[local.legendDot, { backgroundColor: Colors.textSubtle }]} />
							<Text style={local.legendText}>Past</Text>
						</View>
						<View style={local.legendItem}>
							<View style={[local.legendDot, { backgroundColor: Colors.primary }]} />
							<Text style={local.legendText}>Required</Text>
						</View>
					</View>
				</View>

				{!result && (
					<View style={local.forecastEmpty}>
						<Text style={local.forecastEmptyText}>Fill in your details above to see the forecast</Text>
					</View>
				)}

				{/* Horizontal scroll pills */}
				<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={local.pillScroll}>
					{pastSemesters > 0 && (
						<View style={[local.pill, local.pillPast]}>
							<Text style={local.pillSemLabel}>Sem 1–{pastSemesters}</Text>
							<Text style={[local.pillVal, local.pillValPast]}>
								{parseFloat(currentCgpa || "0").toFixed(2)}
							</Text>
							<Text style={local.pillSubLabel}>avg</Text>
						</View>
					)}
					{Array.from({ length: Math.min(futureSemesters, 8) }, (_, i) => (
						<View key={i} style={[local.pill, local.pillFuture]}>
							<Text style={local.pillSemLabel}>Sem {pastSemesters + i + 1}</Text>
							<Text style={[local.pillVal, local.pillValFuture]}>
								{result ? result.required.toFixed(2) : "—"}
							</Text>
						</View>
					))}
				</ScrollView>
			</View>

			{/* Reset */}
			<TouchableOpacity style={local.resetBtn} onPress={handleReset} activeOpacity={0.7}>
				<RotateCw size={16} color={Colors.textMuted} />
				<Text style={local.resetText}>Reset Planner</Text>
			</TouchableOpacity>
		</KeyboardAwareScrollView>
	);
}

const local = StyleSheet.create({
	scroll: {
		padding: Spacing.lg,
		paddingTop: Spacing.xs,
		paddingBottom: 80,
		gap: Spacing.md,
	},
	pageTitle: {
		paddingVertical: Spacing.sm,
	},
	pageTitleText: {
		fontSize: FontSize.h1,
		fontWeight: FontWeight.bold,
		color: Colors.textPrimary,
	},
	pageTitleSub: {
		fontSize: FontSize.sm,
		color: Colors.textSubtle,
		marginTop: 4,
	},
	card: {
		backgroundColor: Colors.surface,
		borderRadius: Radius.xl,
		borderWidth: 1,
		borderColor: Colors.border,
		padding: Spacing.lg,
		gap: Spacing.md,
	},
	sectionHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
	},
	sectionTitle: {
		fontSize: FontSize.base,
		fontWeight: FontWeight.bold,
		color: Colors.textPrimary,
		flex: 1,
	},
	twoCol: {
		flexDirection: "row",
		gap: Spacing.md,
	},
	fieldGroup: {
		flex: 1,
		gap: 6,
	},
	label: {
		fontSize: FontSize.xs,
		fontWeight: FontWeight.semibold,
		color: Colors.textMuted,
		textTransform: "uppercase",
		letterSpacing: 0.8,
	},
	labelRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	badge: {
		backgroundColor: `${Colors.primary}1A`,
		borderWidth: 1,
		borderColor: `${Colors.primary}33`,
		borderRadius: Radius.sm,
		paddingHorizontal: Spacing.sm,
		paddingVertical: 2,
	},
	badgeText: {
		fontSize: FontSize.xs,
		fontWeight: FontWeight.semibold,
		color: Colors.primary,
	},
	segmentRow: {
		flexDirection: "row",
		gap: Spacing.sm,
	},
	segment: {
		flex: 1,
		height: 40,
		borderRadius: Radius.md,
		backgroundColor: Colors.surfaceElevated,
		borderWidth: 1,
		borderColor: Colors.border,
		alignItems: "center",
		justifyContent: "center",
	},
	segmentActive: {
		backgroundColor: `${Colors.primary}1A`,
		borderColor: Colors.primary,
	},
	segmentText: {
		fontSize: FontSize.sm,
		fontWeight: FontWeight.semibold,
		color: Colors.textSubtle,
	},
	segmentTextActive: {
		color: Colors.primary,
	},
	divider: {
		height: 1,
		backgroundColor: Colors.border,
		marginHorizontal: -Spacing.lg,
	},
	stepperWrap: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: Colors.surfaceElevated,
		borderRadius: Radius.lg,
		borderWidth: 1,
		borderColor: Colors.borderLight,
		overflow: "hidden",
	},
	stepBtn: {
		width: 52,
		height: 52,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: Colors.surfaceElevated,
	},
	stepValue: {
		flex: 1,
		textAlign: "center",
		fontSize: FontSize.xxl,
		fontWeight: FontWeight.bold,
		color: Colors.warning,
		fontVariant: ["tabular-nums"],
	},
	rangeHint: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: -Spacing.xs,
	},
	rangeHintText: {
		fontSize: FontSize.xs,
		color: Colors.textSubtle,
	},

	// Result hero
	resultCard: {
		backgroundColor: Colors.surface,
		borderRadius: Radius.xl,
		borderWidth: 1,
		borderColor: Colors.border,
		borderTopWidth: 3,
		padding: Spacing.xl,
		alignItems: "center",
		gap: 4,
		overflow: "hidden",
	},
	resultValue: {
		fontSize: 56,
		fontWeight: FontWeight.extrabold,
		fontVariant: ["tabular-nums"],
		lineHeight: 60,
		letterSpacing: -1,
	},
	resultLabel: {
		fontSize: FontSize.xs,
		fontWeight: FontWeight.bold,
		color: Colors.textSubtle,
		textTransform: "uppercase",
		letterSpacing: 1.2,
		marginTop: Spacing.xs,
	},
	resultSub: {
		fontSize: FontSize.sm,
		color: Colors.textMuted,
		textAlign: "center",
	},

	// Forecast
	forecastEmpty: {
		alignItems: "center",
		paddingVertical: Spacing.lg,
	},
	forecastEmptyText: {
		fontSize: FontSize.sm,
		color: Colors.textSubtle,
		textAlign: "center",
	},
	pillScroll: {
		gap: Spacing.sm,
		paddingBottom: 2,
	},
	pill: {
		borderRadius: Radius.md,
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.sm,
		minWidth: 76,
		gap: 2,
	},
	pillPast: {
		backgroundColor: Colors.surfaceElevated,
		borderWidth: 1,
		borderColor: Colors.border,
		opacity: 0.6,
	},
	pillFuture: {
		backgroundColor: `${Colors.primary}0D`,
		borderWidth: 1,
		borderColor: `${Colors.primary}33`,
	},
	pillSemLabel: {
		fontSize: FontSize.xs,
		color: Colors.textSubtle,
	},
	pillVal: {
		fontSize: FontSize.base,
		fontWeight: FontWeight.bold,
		fontVariant: ["tabular-nums"],
	},
	pillValPast: { color: Colors.textPrimary },
	pillValFuture: { color: Colors.primary },
	pillSubLabel: {
		fontSize: FontSize.xs,
		color: Colors.textSubtle,
	},
	legendRow: {
		flexDirection: "row",
		gap: Spacing.sm,
	},
	legendItem: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	legendDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
	},
	legendText: {
		fontSize: FontSize.xs,
		color: Colors.textMuted,
	},
	resetBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: Spacing.sm,
		height: 48,
		borderRadius: Radius.xl,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	resetText: {
		fontSize: FontSize.sm,
		fontWeight: FontWeight.medium,
		color: Colors.textMuted,
	},
});
