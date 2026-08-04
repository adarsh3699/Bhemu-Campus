import { memo, useMemo, useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
	Trophy,
	TrendingUp,
	RotateCcw,
	ChevronDown,
	Bell,
	Megaphone,
	ClipboardList,
	CalendarClock,
} from "lucide-react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useGpaProfiles } from "@/contexts/GpaDataContext";

import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";
import { Layout } from "@/styles";
import ProfileDrawer from "@/components/profile/ProfileDrawer";
import ShareModal from "@/components/profile/ShareModal";
import TodayTimeline from "@/components/Home/TodayTimeline";
import { getMessagesLastSeenCount } from "@/features/ums-data/storage";
import { useUmsData } from "@/features/ums-data/useUmsData";
import { markStartup } from "@/features/startup/performance";

const DAY_NAMES_ANNOUNCE = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_MAP: Record<string, number> = {
	Jan: 0,
	Feb: 1,
	Mar: 2,
	Apr: 3,
	May: 4,
	Jun: 5,
	Jul: 6,
	Aug: 7,
	Sep: 8,
	Oct: 9,
	Nov: 10,
	Dec: 11,
};

// LPU format: "Wed, Jul 29, 2026"
function isTodayStr(dateStr: string): boolean {
	if (!dateStr) return false;
	// Split: ["Wed", "Jul 29", "2026"]
	const parts = dateStr.split(", ");
	if (parts.length < 3) return false;
	const [mon, day] = parts[1].split(" ");
	const year = parseInt(parts[2], 10);
	const month = MONTH_MAP[mon];
	if (month === undefined || !day || !year) return false;
	const now = new Date();
	return parseInt(day, 10) === now.getDate() && month === now.getMonth() && year === now.getFullYear();
}

interface QuickAction {
	title: string;
	subtitle: string;
	icon: React.ReactNode;
	route?: string;
	tab?: string;
	color: string;
	badge?: number;
}

const QuickActionCard = memo(function QuickActionCardView({
	action,
	onPress,
}: {
	action: QuickAction;
	onPress: (action: QuickAction) => void;
}) {
	return (
		<Pressable style={local.actionCard} onPress={() => onPress(action)}>
			<View style={local.actionIconWrap}>
				<View style={[local.actionIcon, { borderColor: action.color + "40" }]}>{action.icon}</View>
				{action.badge ? (
					<View style={[local.actionBadge, { backgroundColor: action.color }]}>
						<Text style={local.actionBadgeText}>{action.badge > 99 ? "99+" : action.badge}</Text>
					</View>
				) : null}
			</View>
			<Text style={local.actionTitle}>{action.title}</Text>
			<Text style={local.actionSubtitle}>{action.subtitle}</Text>
		</Pressable>
	);
});

function HomeTabContent() {
	const router = useRouter();
	const { currentUser, launchUser } = useAuth();
	const { currentProfile, activeProfile, profiles, shareProfileWithUser, mySharedProfiles } = useGpaProfiles();
	useEffect(() => {
		markStartup("home_interactive");
	}, []);
	const isSharedProfile = !!currentProfile?.isShared;
	const { data: umsData } = useUmsData();

	const todayName = DAY_NAMES_ANNOUNCE[new Date().getDay()];
	const todayClassCount = isSharedProfile
		? 0
		: (umsData?.timetable?.filter((e) => e.dayOfWeek === todayName).length ?? 0);
	const announcementCount = isSharedProfile
		? 0
		: (umsData?.announcements?.filter((a) => isTodayStr(a.date)).length ?? 0);
	const examCount = isSharedProfile ? 0 : (umsData?.seatingPlan?.length ?? 0);
	const hasTimetableData = !isSharedProfile && (umsData?.timetable?.length ?? 0) > 0;

	const [drawerOpen, setDrawerOpen] = useState(false);
	const [shareProfileId, setShareProfileId] = useState<string | number | null>(null);
	const [lastSeenCount, setLastSeenCount] = useState(0);

	useEffect(() => {
		if (!activeProfile || isSharedProfile) {
			setLastSeenCount(0);
			return;
		}
		getMessagesLastSeenCount(activeProfile).then(setLastSeenCount);
	}, [activeProfile, isSharedProfile]);

	const unreadCount = isSharedProfile ? 0 : Math.max(0, (umsData?.messages?.length ?? 0) - lastSeenCount);

	const quickActions = useMemo<QuickAction[]>(() => {
		const all: QuickAction[] = [
			{
				title: "Timetable",
				subtitle: "Weekly class schedule",
				icon: <CalendarClock size={22} color={Colors.secondary} />,
				route: "/timetable",
				color: Colors.secondary,
				badge: todayClassCount,
			},
			{
				title: "Leaderboard",
				subtitle: "Compare with peers",
				icon: <Trophy size={22} color={Colors.warning} />,
				tab: "/leaderboard",
				color: Colors.warning,
			},
			{
				title: "Goal Planner",
				subtitle: "Set target GPA goals",
				icon: <TrendingUp size={22} color={Colors.accent} />,
				route: "/goal-planner",
				color: Colors.accent,
			},
			{
				title: "Reappear Calculator",
				subtitle: "Calculate reappear marks",
				icon: <RotateCcw size={22} color={Colors.destructive} />,
				route: "/reappear-calculator",
				color: Colors.destructive,
			},
			{
				title: "Announcements",
				subtitle: "University announcements",
				icon: <Megaphone size={22} color={Colors.primary} />,
				route: "/announcements",
				color: Colors.primary,
				badge: announcementCount,
			},
			{
				title: "Seating Plan",
				subtitle: "Exam room & seat details",
				icon: <ClipboardList size={22} color={Colors.success} />,
				route: "/seating-plan",
				color: Colors.success,
				badge: examCount,
			},
		];
		const UMS_ACTIONS = ["Timetable", "Announcements", "Seating Plan"];
		return isSharedProfile ? all.filter((a) => !UMS_ACTIONS.includes(a.title)) : all;
	}, [isSharedProfile, todayClassCount, announcementCount, examCount]);

	const handlePress = useCallback(
		(action: QuickAction) => {
			if (action.tab) router.push(action.tab as never);
			else if (action.route) router.push(action.route as never);
		},
		[router]
	);

	const profileForShare = shareProfileId != null ? profiles.find((p) => p.id === shareProfileId) : undefined;

	const currentSharesForProfile = (
		mySharedProfiles as Array<{
			profileId: string | number;
			shareId: string;
			targetUserEmail: string;
			permission: "read" | "edit";
			isActive: boolean;
		}>
	).filter((s) => s.profileId === shareProfileId && s.isActive);

	return (
		<SafeAreaView style={Layout.flex} edges={["top"]}>
			<ScrollView contentContainerStyle={local.scroll} showsVerticalScrollIndicator={false}>
				{/* Greeting + profile header */}
				<View style={local.greetingSection}>
					<View style={local.headerLeft}>
						<Pressable
							style={local.avatar}
							onPress={() => setDrawerOpen(true)}
							accessibilityLabel="Switch profile"
						>
							<Text style={local.avatarText}>{(currentProfile?.name || "S")[0].toUpperCase()}</Text>
						</Pressable>
						<View style={local.headerTextCol}>
							<Text style={local.greeting} numberOfLines={1}>
								Hello,{" "}
								{(currentUser?.displayName || launchUser?.displayName)?.split(" ")[0] || "Student"} 👋
							</Text>
							<Pressable
								style={local.profileSwitcher}
								onPress={() => setDrawerOpen(true)}
								accessibilityLabel="Switch profile"
								hitSlop={8}
							>
								<Text style={local.profileSwitcherText} numberOfLines={1}>
									{currentProfile?.name ?? "Select Profile"}
								</Text>
								<ChevronDown size={14} color={Colors.primary} />
							</Pressable>
						</View>
					</View>

					{/* Notification bell */}
					{!isSharedProfile && (
						<Pressable
							style={local.bellBtn}
							onPress={() => router.push("/messages" as never)}
							accessibilityLabel="Notifications"
						>
							<Bell size={20} color={Colors.textPrimary} />
							{unreadCount > 0 && (
								<View style={local.badge}>
									<Text style={local.badgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
								</View>
							)}
						</Pressable>
					)}
				</View>

				{/* Today's Timeline */}
				{!isSharedProfile && (
					<TodayTimeline
						timetable={umsData?.timetable ?? []}
						seatingPlan={umsData?.seatingPlan ?? []}
						hasTimetableData={hasTimetableData}
					/>
				)}

				{/* Quick Actions */}
				<View style={local.sectionHeader}>
					<Text style={local.sectionTitle}>Quick Actions</Text>
				</View>

				<View style={local.actionsGrid}>
					{quickActions.map((action) => (
						<QuickActionCard key={action.title} action={action} onPress={handlePress} />
					))}
				</View>
			</ScrollView>

			{/* Profile Drawer */}
			{drawerOpen ? (
				<ProfileDrawer
					visible
					onClose={() => setDrawerOpen(false)}
					onShareProfile={(id) => {
						setDrawerOpen(false);
						setShareProfileId(id);
					}}
				/>
			) : null}

			{/* Share Modal */}
			{profileForShare && (
				<ShareModal
					visible={shareProfileId != null}
					onClose={() => setShareProfileId(null)}
					profileName={profileForShare.name}
					currentShares={currentSharesForProfile}
					onShareWithUser={async (emailOrId, permissionOrAction, actionType) => {
						await shareProfileWithUser(
							profileForShare,
							emailOrId,
							permissionOrAction as "read" | "edit" | "unshare",
							actionType
						);
					}}
				/>
			)}
		</SafeAreaView>
	);
}

export default HomeTabContent;

const local = StyleSheet.create({
	scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxxl, gap: Spacing.xl },

	greetingSection: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingTop: Spacing.xs,
		marginBottom: Spacing.xs,
	},
	headerLeft: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.md,
		flex: 1,
	},
	avatar: {
		width: 48,
		height: 48,
		borderRadius: 24,
		backgroundColor: Colors.primary + "15",
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
		borderColor: Colors.primary + "30",
	},
	avatarText: {
		fontSize: 20,
		fontWeight: FontWeight.bold,
		color: Colors.primary,
	},
	headerTextCol: {
		flex: 1,
		justifyContent: "center",
		gap: 2,
	},
	greeting: {
		fontSize: FontSize.xl,
		fontWeight: FontWeight.bold,
		color: Colors.textPrimary,
	},
	profileSwitcher: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		alignSelf: "flex-start",
	},
	profileSwitcherText: {
		fontSize: FontSize.sm,
		fontWeight: FontWeight.medium,
		color: Colors.textMuted,
	},
	bellBtn: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: Colors.surfaceElevated,
		borderWidth: 1,
		borderColor: Colors.border,
		alignItems: "center",
		justifyContent: "center",
		position: "relative",
		marginLeft: Spacing.md,
	},
	badge: {
		position: "absolute",
		top: -2,
		right: -2,
		backgroundColor: Colors.destructive,
		borderRadius: 10,
		minWidth: 20,
		height: 20,
		borderWidth: 2,
		borderColor: Colors.background,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 4,
	},
	badgeText: {
		fontSize: 10,
		fontWeight: FontWeight.bold,
		color: "#FFFFFF",
		fontVariant: ["tabular-nums"],
	},

	sectionHeader: { marginBottom: -Spacing.sm },
	sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.textPrimary },

	actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
	actionCard: {
		width: "48%",
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		borderWidth: 1,
		borderColor: Colors.border,
		padding: Spacing.lg,
		gap: Spacing.sm,
	},
	actionIconWrap: { position: "relative", alignSelf: "flex-start" },
	actionIcon: {
		width: 42,
		height: 42,
		borderRadius: Radius.md,
		backgroundColor: Colors.surfaceElevated,
		borderWidth: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	actionBadge: {
		position: "absolute",
		top: -6,
		right: -8,
		borderRadius: 10,
		minWidth: 18,
		height: 18,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 4,
	},
	actionBadgeText: { fontSize: 10, fontWeight: FontWeight.bold, color: Colors.textPrimary },
	actionTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
	actionSubtitle: { fontSize: FontSize.xs, color: Colors.textMuted },
});
