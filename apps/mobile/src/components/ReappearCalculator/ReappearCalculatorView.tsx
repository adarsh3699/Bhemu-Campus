import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { GraduationCap, BookOpen, Beaker, RotateCw, PartyPopper, AlertTriangle, BarChart3 } from "lucide-react-native";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";
import MarkInput from "./MarkInput";
import type { TheoryMarks, HybridMarks, PracticalMarks, ResultType } from "./types";

type TabId = "theory" | "hybrid" | "practical";

const TABS: { id: TabId; label: string; icon: typeof BookOpen }[] = [
	{ id: "theory", label: "Theory", icon: BookOpen },
	{ id: "practical", label: "Practical", icon: Beaker },
	{ id: "hybrid", label: "Hybrid", icon: GraduationCap },
];

// ─── Calculations ──────────────────────────────────────────────────────────────

function calcTheory(marks: TheoryMarks): ResultType {
	const attObt = parseFloat(marks.att.obt) || 0;
	const caObt = parseFloat(marks.ca.obt) || 0;
	const mteObt = parseFloat(marks.mte.obt) || 0;
	const eteObt = parseFloat(marks.ete.obt) || 0;
	const totalObt = attObt + caObt + mteObt + eteObt;
	const totalMax = marks.att.max + marks.ca.max + marks.mte.max + marks.ete.max;
	const eteP = (eteObt / marks.ete.max) * 100;
	const combinedP = ((mteObt + eteObt) / (marks.mte.max + marks.ete.max)) * 100;
	const overallP = (totalObt / totalMax) * 100;
	const cond1 = eteP >= 30 || combinedP >= 30;
	const cond2 = overallP >= 40;
	if (cond1 && cond2) {
		return {
			status: "PASS",
			message: "Congratulations! You have passed all the required criteria.",
			score: `Score: ${totalObt}/${totalMax} (${overallP.toFixed(1)}%)`,
			required: `${totalObt} / ${totalMax}`,
		};
	}
	const msgs: string[] = [];
	if (!cond1) msgs.push("Minimum 30% in ETE or combined (MTE + ETE) required");
	if (!cond2) msgs.push(`Overall ${overallP.toFixed(1)}% is below the 40% passing threshold`);
	const eteForCond1 = Math.min(
		Math.ceil(marks.ete.max * 0.3),
		Math.ceil((marks.mte.max + marks.ete.max) * 0.3 - mteObt)
	);
	const eteForCond2 = Math.ceil(totalMax * 0.4 - attObt - caObt - mteObt);
	const eteNeeded = Math.max(eteForCond1, eteForCond2);
	const moreNeeded = Math.max(0, eteNeeded - eteObt);
	return { status: "FAIL", message: msgs.join(". "), required: `Need ${moreNeeded} more marks in ETE` };
}

function calcHybrid(marks: HybridMarks): ResultType {
	const attObt = parseFloat(marks.att.obt) || 0;
	const caObt = parseFloat(marks.ca.obt) || 0;
	const tMteObt = parseFloat(marks.theoryMte.obt) || 0;
	const tEteObt = parseFloat(marks.theoryEte.obt) || 0;
	const pEteObt = parseFloat(marks.practicalEte.obt) || 0;
	const tEteP = (tEteObt / marks.theoryEte.max) * 100;
	const tCombP = ((tMteObt + tEteObt) / (marks.theoryMte.max + marks.theoryEte.max)) * 100;
	const pEteP = (pEteObt / marks.practicalEte.max) * 100;
	const totalObt = attObt + caObt + tMteObt + tEteObt + pEteObt;
	const totalMax = marks.att.max + marks.ca.max + marks.theoryMte.max + marks.theoryEte.max + marks.practicalEte.max;
	const overallP = (totalObt / totalMax) * 100;
	const cond1 = tEteP >= 30 || tCombP >= 30;
	const cond2 = pEteP >= 30;
	const cond3 = overallP >= 40;
	if (cond1 && cond2 && cond3) {
		return {
			status: "PASS",
			message: "All criteria met! You have passed this subject.",
			score: `Score: ${totalObt}/${totalMax} (${overallP.toFixed(1)}%)`,
			required: `${totalObt} / ${totalMax}`,
		};
	}
	const msgs: string[] = [];
	if (!cond1) msgs.push("Theory ETE/MTE threshold not met (min 30%)");
	if (!cond2) msgs.push("Practical ETE threshold not met (min 30%)");
	if (!cond3) msgs.push(`Overall ${overallP.toFixed(1)}% below 40%`);
	return { status: "FAIL", message: msgs.join(". ") };
}

function calcPractical(marks: PracticalMarks): ResultType {
	const attObt = parseFloat(marks.att.obt) || 0;
	const caObt = parseFloat(marks.ca.obt) || 0;
	const eteObt = parseFloat(marks.ete.obt) || 0;
	const eteP = (eteObt / marks.ete.max) * 100;
	const totalObt = attObt + caObt + eteObt;
	const totalMax = marks.att.max + marks.ca.max + marks.ete.max;
	const overallP = (totalObt / totalMax) * 100;
	const cond1 = eteP >= 30;
	const cond2 = overallP >= 40;
	if (cond1 && cond2) {
		return {
			status: "PASS",
			message: "All practical criteria met! You have passed.",
			score: `Score: ${totalObt}/${totalMax} (${overallP.toFixed(1)}%)`,
			required: `${totalObt} / ${totalMax}`,
		};
	}
	const msgs: string[] = [];
	if (!cond1) msgs.push("Practical ETE minimum 30% not met");
	if (!cond2) msgs.push(`Overall ${overallP.toFixed(1)}% below 40%`);
	return { status: "FAIL", message: msgs.join(". ") };
}

// ─── Result Panel ──────────────────────────────────────────────────────────────

function ResultPanel({ result }: { result: ResultType | null }) {
	if (!result) {
		return (
			<View style={panel.empty}>
				<BarChart3 size={40} color={Colors.textSubtle} style={{ opacity: 0.4 }} />
				<Text style={panel.emptyText}>
					Enter your marks and tap{"\n"}
					<Text style={{ color: Colors.textPrimary }}>Calculate</Text> to see the result
				</Text>
			</View>
		);
	}

	const isPass = result.status === "PASS";
	const statusColor = isPass ? Colors.success : Colors.destructive;

	return (
		<View style={panel.wrap}>
			<View style={[panel.banner, { backgroundColor: `${statusColor}0D`, borderBottomColor: Colors.border }]}>
				<View style={[panel.bannerBg, { backgroundColor: `${statusColor}1A` }]} />
				{isPass ? (
					<PartyPopper size={44} color={statusColor} />
				) : (
					<AlertTriangle size={44} color={statusColor} />
				)}
				<Text style={[panel.statusLabel, { color: statusColor }]}>Reappear Status</Text>
				<Text style={[panel.statusValue, { color: statusColor }]}>{isPass ? "PASSED" : "FAILED"}</Text>
				{result.score && <Text style={panel.scoreText}>{result.score}</Text>}
			</View>
			<View style={panel.details}>
				<Text style={panel.detailsHeading}>Result Details</Text>
				<Text style={panel.detailsMsg}>{result.message}</Text>
				{result.required && (
					<View
						style={[
							panel.requiredBox,
							{ borderColor: `${statusColor}4D`, backgroundColor: `${statusColor}0D` },
						]}
					>
						<View style={[panel.requiredBar, { backgroundColor: statusColor }]} />
						<Text style={[panel.requiredLabel, { color: statusColor }]}>
							{isPass ? "Your Score" : "Required to Pass"}
						</Text>
						<Text style={panel.requiredValue}>{result.required}</Text>
					</View>
				)}
			</View>
		</View>
	);
}

const panel = StyleSheet.create({
	wrap: { flex: 1 },
	banner: {
		alignItems: "center",
		justifyContent: "center",
		padding: Spacing.xl,
		gap: Spacing.sm,
		borderBottomWidth: 1,
		overflow: "hidden",
	},
	bannerBg: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		height: "60%",
	},
	statusLabel: {
		fontSize: FontSize.xs,
		fontWeight: FontWeight.semibold,
		textTransform: "uppercase",
		letterSpacing: 1.2,
	},
	statusValue: {
		fontSize: 36,
		fontWeight: FontWeight.bold,
		fontVariant: ["tabular-nums"],
		letterSpacing: -0.5,
	},
	scoreText: {
		fontSize: FontSize.sm,
		color: Colors.textMuted,
	},
	details: {
		padding: Spacing.lg,
		gap: Spacing.md,
		flex: 1,
	},
	detailsHeading: {
		fontSize: FontSize.xs,
		fontWeight: FontWeight.semibold,
		color: Colors.textSubtle,
		textTransform: "uppercase",
		letterSpacing: 0.8,
	},
	detailsMsg: {
		fontSize: FontSize.sm,
		color: Colors.textMuted,
		lineHeight: 20,
	},
	requiredBox: {
		borderRadius: Radius.lg,
		borderWidth: 1,
		padding: Spacing.lg,
		alignItems: "center",
		overflow: "hidden",
		marginTop: Spacing.sm,
	},
	requiredBar: {
		position: "absolute",
		left: 0,
		top: "25%",
		bottom: "25%",
		width: 3,
		borderRadius: 2,
	},
	requiredLabel: {
		fontSize: FontSize.xs,
		fontWeight: FontWeight.semibold,
		textTransform: "uppercase",
		letterSpacing: 0.8,
		marginBottom: 4,
	},
	requiredValue: {
		fontSize: 28,
		fontWeight: FontWeight.bold,
		color: Colors.textPrimary,
		fontVariant: ["tabular-nums"],
	},
	empty: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		padding: Spacing.xl,
		gap: Spacing.md,
	},
	emptyText: {
		fontSize: FontSize.sm,
		color: Colors.textSubtle,
		textAlign: "center",
		lineHeight: 20,
	},
});

// ─── Main View ─────────────────────────────────────────────────────────────────

export default function ReappearCalculatorView() {
	const [activeTab, setActiveTab] = useState<TabId>("theory");

	const [theoryMarks, setTheoryMarks] = useState<TheoryMarks>({
		att: { obt: "", max: 5 },
		ca: { obt: "", max: 25 },
		mte: { obt: "", max: 20 },
		ete: { obt: "", max: 50 },
	});
	const [hybridMarks, setHybridMarks] = useState<HybridMarks>({
		att: { obt: "", max: 5 },
		ca: { obt: "", max: 25 },
		theoryMte: { obt: "", max: 20 },
		theoryEte: { obt: "", max: 25 },
		practicalEte: { obt: "", max: 25 },
	});
	const [practicalMarks, setPracticalMarks] = useState<PracticalMarks>({
		att: { obt: "", max: 5 },
		ca: { obt: "", max: 50 },
		ete: { obt: "", max: 45 },
	});

	const [theoryResult, setTheoryResult] = useState<ResultType | null>(null);
	const [hybridResult, setHybridResult] = useState<ResultType | null>(null);
	const [practicalResult, setPracticalResult] = useState<ResultType | null>(null);

	const reset = () => {
		if (activeTab === "theory") {
			setTheoryMarks({
				att: { obt: "", max: 5 },
				ca: { obt: "", max: 25 },
				mte: { obt: "", max: 20 },
				ete: { obt: "", max: 50 },
			});
			setTheoryResult(null);
		} else if (activeTab === "hybrid") {
			setHybridMarks({
				att: { obt: "", max: 5 },
				ca: { obt: "", max: 25 },
				theoryMte: { obt: "", max: 20 },
				theoryEte: { obt: "", max: 25 },
				practicalEte: { obt: "", max: 25 },
			});
			setHybridResult(null);
		} else {
			setPracticalMarks({ att: { obt: "", max: 5 }, ca: { obt: "", max: 50 }, ete: { obt: "", max: 45 } });
			setPracticalResult(null);
		}
	};

	const currentTotalMax =
		activeTab === "theory"
			? theoryMarks.att.max + theoryMarks.ca.max + theoryMarks.mte.max + theoryMarks.ete.max
			: activeTab === "hybrid"
				? hybridMarks.att.max +
					hybridMarks.ca.max +
					hybridMarks.theoryMte.max +
					hybridMarks.theoryEte.max +
					hybridMarks.practicalEte.max
				: practicalMarks.att.max + practicalMarks.ca.max + practicalMarks.ete.max;

	const maxExceeded = currentTotalMax !== 100;

	const calculate = () => {
		if (maxExceeded) return;
		if (activeTab === "theory") setTheoryResult(calcTheory(theoryMarks));
		else if (activeTab === "hybrid") setHybridResult(calcHybrid(hybridMarks));
		else setPracticalResult(calcPractical(practicalMarks));
	};

	const currentResult =
		activeTab === "theory" ? theoryResult : activeTab === "hybrid" ? hybridResult : practicalResult;

	return (
		<KeyboardAwareScrollView
			bottomOffset={20}
			contentContainerStyle={local.scroll}
			showsVerticalScrollIndicator={false}
			keyboardShouldPersistTaps="handled"
		>
			<View style={local.pageTitle}>
				<Text style={local.pageTitleText}>Reappear Calculator</Text>
				<Text style={local.pageTitleSub}>Find the marks needed to clear your backlogs</Text>
			</View>

			{/* Tab Selector */}
			<View style={local.tabBar}>
				{TABS.map(({ id, label, icon: Icon }) => {
					const active = activeTab === id;
					return (
						<TouchableOpacity
							key={id}
							style={[local.tab, active && local.tabActive]}
							onPress={() => setActiveTab(id)}
							activeOpacity={0.8}
						>
							<Icon size={14} color={active ? Colors.primary : Colors.textSubtle} />
							<Text style={[local.tabText, active && local.tabTextActive]}>{label}</Text>
						</TouchableOpacity>
					);
				})}
			</View>

			{/* Input Card */}
			<View style={local.card}>
				{activeTab === "theory" && (
					<View style={local.markGrid}>
						<MarkInput
							label="Attendance"
							value={theoryMarks.att}
							onChange={(v) => setTheoryMarks({ ...theoryMarks, att: v })}
						/>
						<MarkInput
							label="Continuous Assessment (CA)"
							value={theoryMarks.ca}
							onChange={(v) => setTheoryMarks({ ...theoryMarks, ca: v })}
						/>
						<MarkInput
							label="Mid Term Exam (MTE)"
							value={theoryMarks.mte}
							onChange={(v) => setTheoryMarks({ ...theoryMarks, mte: v })}
						/>
						<MarkInput
							label="End Term Theory Exam (ETE)"
							value={theoryMarks.ete}
							onChange={(v) => setTheoryMarks({ ...theoryMarks, ete: v })}
						/>
					</View>
				)}

				{activeTab === "hybrid" && (
					<View style={local.markGrid}>
						<MarkInput
							label="Attendance"
							value={hybridMarks.att}
							onChange={(v) => setHybridMarks({ ...hybridMarks, att: v })}
						/>
						<MarkInput
							label="Continuous Assessment (CA)"
							value={hybridMarks.ca}
							onChange={(v) => setHybridMarks({ ...hybridMarks, ca: v })}
						/>
						<MarkInput
							label="Theory Mid Term (MTE)"
							value={hybridMarks.theoryMte}
							onChange={(v) => setHybridMarks({ ...hybridMarks, theoryMte: v })}
						/>
						<MarkInput
							label="Theory End Term (ETE)"
							value={hybridMarks.theoryEte}
							onChange={(v) => setHybridMarks({ ...hybridMarks, theoryEte: v })}
						/>
						<MarkInput
							label="Practical End Term (ETE)"
							value={hybridMarks.practicalEte}
							onChange={(v) => setHybridMarks({ ...hybridMarks, practicalEte: v })}
						/>
					</View>
				)}

				{activeTab === "practical" && (
					<View style={local.markGrid}>
						<MarkInput
							label="Attendance"
							value={practicalMarks.att}
							onChange={(v) => setPracticalMarks({ ...practicalMarks, att: v })}
						/>
						<MarkInput
							label="Continuous Assessment (CA)"
							value={practicalMarks.ca}
							onChange={(v) => setPracticalMarks({ ...practicalMarks, ca: v })}
						/>
						<MarkInput
							label="End Term Practical (ETE)"
							value={practicalMarks.ete}
							onChange={(v) => setPracticalMarks({ ...practicalMarks, ete: v })}
						/>
					</View>
				)}

				{/* Max exceeded warning */}
				{maxExceeded && (
					<View style={local.warningRow}>
						<Text style={local.warningText}>
							Total max marks must equal 100 (currently {currentTotalMax}) — adjust the max values above
						</Text>
					</View>
				)}

				{/* Actions */}
				<View style={local.actionRow}>
					<TouchableOpacity
						style={[local.calcBtn, maxExceeded && local.calcBtnDisabled]}
						onPress={calculate}
						activeOpacity={maxExceeded ? 1 : 0.85}
					>
						<Text style={local.calcBtnText}>Calculate Result</Text>
					</TouchableOpacity>
					<TouchableOpacity style={local.resetBtn} onPress={reset} activeOpacity={0.7}>
						<RotateCw size={16} color={Colors.textMuted} />
					</TouchableOpacity>
				</View>
			</View>

			{/* Result */}
			<View style={local.resultCard}>
				<ResultPanel result={currentResult} />
			</View>
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
	tabBar: {
		flexDirection: "row",
		backgroundColor: Colors.surface,
		borderRadius: Radius.xl,
		borderWidth: 1,
		borderColor: Colors.border,
		padding: 4,
		gap: 4,
	},
	tab: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 4,
		paddingVertical: Spacing.sm,
		paddingHorizontal: 6,
		borderRadius: Radius.lg,
	},
	tabActive: {
		backgroundColor: Colors.surfaceElevated,
		borderWidth: 1,
		borderColor: `${Colors.primary}33`,
	},
	tabText: {
		fontSize: FontSize.xs,
		fontWeight: FontWeight.semibold,
		color: Colors.textSubtle,
	},
	tabTextActive: {
		color: Colors.primary,
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
	},
	markGrid: {
		gap: Spacing.md,
	},
	actionRow: {
		flexDirection: "row",
		gap: Spacing.sm,
	},
	warningRow: {
		backgroundColor: `${Colors.warning}1A`,
		borderWidth: 1,
		borderColor: `${Colors.warning}4D`,
		borderRadius: Radius.md,
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.sm,
	},
	warningText: {
		fontSize: FontSize.xs,
		color: Colors.warning,
		lineHeight: 18,
	},
	calcBtn: {
		flex: 1,
		height: 48,
		backgroundColor: Colors.primary,
		borderRadius: Radius.lg,
		alignItems: "center",
		justifyContent: "center",
	},
	calcBtnDisabled: {
		opacity: 0.4,
	},
	calcBtnText: {
		fontSize: FontSize.sm,
		fontWeight: FontWeight.bold,
		color: Colors.textPrimary,
		textTransform: "uppercase",
		letterSpacing: 0.6,
	},
	resetBtn: {
		width: 48,
		height: 48,
		borderRadius: Radius.lg,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
		borderColor: Colors.border,
		backgroundColor: Colors.surfaceElevated,
	},
	resultCard: {
		backgroundColor: Colors.surface,
		borderRadius: Radius.xl,
		borderWidth: 1,
		borderColor: Colors.border,
		overflow: "hidden",
	},
});
