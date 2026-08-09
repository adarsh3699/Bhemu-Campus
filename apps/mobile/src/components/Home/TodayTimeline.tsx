/**
 * TodayTimeline — horizontal flex row of 3 cards showing previous/current/next
 * class or exam. Merges timetable + seating plan data chronologically.
 *
 * Previous & Next cards are faded (opacity 0.45).
 * Current card is highlighted (accent border, pulsing dot).
 * Attendance info (%, skip/attend) shown on the current card.
 */

import { memo, useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { CheckCircle2, MapPin, Clock, FileText, ArrowRight, CalendarX2 } from "lucide-react-native";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";
import type { TimetableEntry, UMSSeatingPlan } from "@bhemu/shared";
import { formatMinutesTo12h } from "@bhemu/shared";
import {
	buildTimeline,
	classifyTimeline,
	getNextUpcomingItem,
	DAY_NAMES,
	type TimelineItem,
} from "./timelineUtils";

interface Props {
	timetable: TimetableEntry[];
	seatingPlan: UMSSeatingPlan[];
	hasTimetableData: boolean; // whether user has synced timetable at all
}

// ─── Single timeline card ───────────────────────────────────────────────────

const PlaceholderCard = memo(function PlaceholderCardView({
	title,
	subtitle,
	isCurrent,
}: {
	title: string;
	subtitle?: string;
	isCurrent?: boolean;
}) {
	return (
		<View
			style={[
				local.card,
				isCurrent && local.cardCurrent,
				{ justifyContent: "center", alignItems: "center", gap: 8 },
			]}
		>
			{isCurrent ? <View style={local.pulseDot} /> : null}
			<Text
				style={{
					fontSize: FontSize.sm,
					fontWeight: FontWeight.bold,
					color: Colors.textPrimary,
					textAlign: "center",
				}}
			>
				{title}
			</Text>
			{subtitle && (
				<Text style={{ fontSize: FontSize.xs, color: Colors.textMuted, textAlign: "center" }}>{subtitle}</Text>
			)}
		</View>
	);
});

interface CardProps {
	item: TimelineItem;
	position: "previous" | "current" | "next";
	isCurrent: boolean; // true only if time is within this item's range
	onPress: () => void;
}

const TimelineCard = memo(function TimelineCardView({ item, position, isCurrent, onPress }: CardProps) {
	const isExam = item.type === "exam";
	const isFaded = position !== "current";

	const cardStyle = [
		local.card,
		isCurrent && local.cardCurrent,
		isExam && !isCurrent && local.cardExam,
		isExam && isCurrent && local.cardExamCurrent,
	];

	return (
		<Pressable style={[cardStyle, isFaded && { opacity: 0.45 }]} onPress={onPress}>
			{/* Header: icon + course code */}
			<View style={local.cardHeader}>
				{isExam ? (
					<FileText size={12} color={isCurrent ? Colors.warning : Colors.textMuted} />
				) : position === "previous" ? (
					<CheckCircle2 size={12} color={Colors.primary} />
				) : isCurrent ? (
					<View style={local.pulseDot} />
				) : (
					<Clock size={12} color={Colors.textMuted} />
				)}
				{isExam && (
					<View style={local.examTypeBadge}>
						<Text style={local.examTypeText}>{item.exam?.ExamType || "Exam"}</Text>
					</View>
				)}
			</View>

			{/* Course code / name */}
			<Text style={local.courseCode} numberOfLines={2}>
				{item.label}
			</Text>

			{/* Time */}
			<Text style={local.timeText}>
				{item.upcomingDayOffset === 1
					? `Tomorrow • ${formatMinutesTo12h(item.startMinutes)}`
					: item.upcomingDayOffset && item.upcomingDayOffset > 1
						? `${DAY_NAMES[(new Date().getDay() + item.upcomingDayOffset) % 7]} • ${formatMinutesTo12h(item.startMinutes)}`
						: item.upcomingDate
							? item.upcomingDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
							: isExam
								? (item.exam?.ExamDate ?? "")
								: `${formatMinutesTo12h(item.startMinutes)}–${formatMinutesTo12h(item.endMinutes)}`}
			</Text>

			{/* Room */}
			{!!item.room && (
				<View style={local.roomRow}>
					<MapPin size={10} color={Colors.secondary} />
					<Text style={local.roomText} numberOfLines={1}>
						{item.room}
					</Text>
				</View>
			)}
		</Pressable>
	);
});

// ─── Main component ─────────────────────────────────────────────────────────

export default memo(function TodayTimeline({ timetable, seatingPlan, hasTimetableData }: Props) {
	const router = useRouter();
	const now = new Date();
	const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

	const { timeline, classified, nextUpcoming } = useMemo(() => {
		const items = buildTimeline(timetable, seatingPlan);
		const result = classifyTimeline(items, currentTimeMinutes);
		const upcoming = getNextUpcomingItem(timetable, seatingPlan);
		return { timeline: items, classified: result, nextUpcoming: upcoming };
	}, [timetable, seatingPlan, currentTimeMinutes]);

	// Determine if we're currently in a class (for highlighting)
	const isCurrentLive =
		classified.current !== null &&
		currentTimeMinutes >= classified.current.startMinutes &&
		currentTimeMinutes < classified.current.endMinutes;

	// Build the 3 items to display: previous, current, next
	const displayItems = useMemo(() => {
		const items: Array<
			| { type: "item"; item: TimelineItem; position: "previous" | "current" | "next" }
			| { type: "placeholder"; title: string; subtitle?: string; position: "current" }
		> = [];

		const hasAnyToday = timeline.length > 0;

		if (!hasAnyToday) {
			items.push({ type: "placeholder", title: "Free day today 🎉", position: "current" });
			if (nextUpcoming) {
				items.push({ type: "item", item: nextUpcoming, position: "next" });
			}
			return items;
		}

		if (classified.previous) {
			items.push({ type: "item", item: classified.previous, position: "previous" });
		}

		if (classified.current) {
			items.push({ type: "item", item: classified.current, position: "current" });
		} else {
			const allDone = timeline.every((item) => currentTimeMinutes >= item.endMinutes);
			if (allDone) {
				items.push({ type: "placeholder", title: "All done for today", position: "current" });
			} else if (classified.next) {
				items.push({
					type: "placeholder",
					title: "Break time",
					subtitle: "No ongoing class",
					position: "current",
				});
			} else {
				items.push({ type: "placeholder", title: "No ongoing class", position: "current" });
			}
		}

		if (classified.next) {
			items.push({ type: "item", item: classified.next, position: "next" });
		} else if (nextUpcoming) {
			items.push({ type: "item", item: nextUpcoming, position: "next" });
		}

		return items;
	}, [classified, nextUpcoming, timeline, currentTimeMinutes]);



	// Empty state
	if (!hasTimetableData) {
		return (
			<View style={local.emptyContainer}>
				<View style={local.sectionHeader}>
					<Text style={local.sectionTitle}>Today&apos;s Classes</Text>
				</View>
				<View style={local.emptyCard}>
					<CalendarX2 size={28} color={Colors.textSubtle} />
					<Text style={local.emptyText}>Sync to see today&apos;s schedule</Text>
				</View>
			</View>
		);
	}

	if (displayItems.length === 0) {
		return (
			<View style={local.emptyContainer}>
				<View style={local.sectionHeader}>
					<Text style={local.sectionTitle}>Today&apos;s Classes</Text>
					<Pressable onPress={() => router.push("/timetable" as never)} hitSlop={8}>
						<ArrowRight size={18} color={Colors.primary} />
					</Pressable>
				</View>
				<View style={local.emptyCard}>
					<Text style={local.emptyEmoji}>🎉</Text>
					<Text style={local.emptyText}>No classes today</Text>
				</View>
			</View>
		);
	}

	return (
		<View>
			{/* Section header */}
			<View style={local.sectionHeader}>
				<Text style={local.sectionTitle}>Today&apos;s Classes</Text>
				<Pressable onPress={() => router.push("/timetable" as never)} hitSlop={8}>
					<ArrowRight size={18} color={Colors.primary} />
				</Pressable>
			</View>

			{/* Flex row of cards */}
			<View style={local.cardRow}>
				{displayItems.map((entry, index) => {
					if (entry.type === "placeholder") {
						return (
							<PlaceholderCard
								key={`placeholder-${index}`}
								title={entry.title}
								subtitle={entry.subtitle}
								isCurrent={entry.position === "current"}
							/>
						);
					}
					return (
						<TimelineCard
							key={`${entry.item.courseCode}-${entry.item.startMinutes}-${entry.position}-${index}`}
							item={entry.item}
							position={entry.position}
							isCurrent={entry.position === "current" && isCurrentLive}
							onPress={() => {
								if (entry.item.type === "exam") {
									router.push("/seating-plan" as never);
								} else {
									router.push("/attendance" as never);
								}
							}}
						/>
					);
				})}
			</View>
		</View>
	);
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const local = StyleSheet.create({
	// Section header
	sectionHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: Spacing.md,
	},
	sectionTitle: {
		fontSize: FontSize.lg,
		fontWeight: FontWeight.semibold,
		color: Colors.textPrimary,
	},

	// Card row — horizontal flex
	cardRow: {
		flexDirection: "row",
		gap: Spacing.sm,
	},

	// Individual card
	card: {
		flex: 1,
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		borderWidth: 1,
		borderColor: Colors.border,
		padding: Spacing.md,
		gap: Spacing.xs,
	},
	cardCurrent: {
		backgroundColor: Colors.secondary + "10",
		borderColor: Colors.secondary,
	},
	cardExam: {
		borderColor: Colors.warning + "30",
	},
	cardExamCurrent: {
		backgroundColor: Colors.warning + "10",
		borderColor: Colors.warning,
	},

	// Card header
	cardHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: Spacing.xs,
	},
	pulseDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: Colors.secondary,
	},
	examTypeBadge: {
		backgroundColor: Colors.warning + "20",
		paddingHorizontal: Spacing.xs,
		paddingVertical: 1,
		borderRadius: Radius.sm,
	},
	examTypeText: {
		fontSize: 9,
		fontWeight: FontWeight.bold,
		color: Colors.warning,
		textTransform: "uppercase",
	},

	// Course & time
	courseCode: {
		fontSize: FontSize.sm,
		fontWeight: FontWeight.bold,
		color: Colors.textPrimary,
		marginTop: 2,
	},
	timeText: {
		fontSize: FontSize.xs,
		color: Colors.textMuted,
		fontWeight: FontWeight.medium,
	},

	// Room
	roomRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 3,
	},
	roomText: {
		fontSize: FontSize.xs,
		color: Colors.textMuted,
		fontWeight: FontWeight.medium,
		flex: 1,
	},



	// Empty state
	emptyContainer: {},
	emptyCard: {
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		borderWidth: 1,
		borderColor: Colors.border,
		padding: Spacing.xl,
		alignItems: "center",
		justifyContent: "center",
		gap: Spacing.sm,
	},
	emptyEmoji: {
		fontSize: 28,
	},
	emptyText: {
		fontSize: FontSize.sm,
		color: Colors.textMuted,
		fontWeight: FontWeight.medium,
		textAlign: "center",
	},
});
