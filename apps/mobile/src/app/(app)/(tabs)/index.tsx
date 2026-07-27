import { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Trophy, TrendingUp, RotateCcw, ChevronDown, Share2 } from "lucide-react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useGpaData } from "@/contexts/GpaDataContext";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";
import { Layout } from "@/styles";
import ProfileDrawer from "@/components/profile/ProfileDrawer";
import ShareModal from "@/components/profile/ShareModal";

interface QuickAction {
	title: string;
	subtitle: string;
	icon: React.ReactNode;
	route?: string;
	tab?: string;
	color: string;
}

export default function HomeTab() {
	const router = useRouter();
	const { currentUser } = useAuth();
	const { semesters, currentProfile, profiles, shareProfileWithUser, mySharedProfiles } = useGpaData();

	const [drawerOpen, setDrawerOpen] = useState(false);
	const [shareProfileId, setShareProfileId] = useState<string | number | null>(null);

	const totalSubjects = useMemo(() => semesters.reduce((acc, s) => acc + s.subjects.length, 0), [semesters]);
	const totalCredits = useMemo(() => semesters.reduce((acc, s) => acc + s.subjects.reduce((a, sub) => a + sub.credit, 0), 0), [semesters]);

	const quickActions = useMemo<QuickAction[]>(() => [
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
	], []);

	const handlePress = (action: QuickAction) => {
		if (action.tab) router.push(action.tab as never);
		else if (action.route) router.push(action.route as never);
	};

	const profileForShare = shareProfileId != null
		? profiles.find(p => p.id === shareProfileId)
		: undefined;

	const currentSharesForProfile = (mySharedProfiles as Array<{ profileId: string | number; shareId: string; targetUserEmail: string; permission: "read" | "edit"; isActive: boolean }>)
		.filter(s => s.profileId === shareProfileId && s.isActive);

	return (
		<SafeAreaView style={Layout.flex} edges={["top"]}>
			<ScrollView contentContainerStyle={local.scroll} showsVerticalScrollIndicator={false}>

				{/* Greeting + profile chip */}
				<View style={local.greetingSection}>
					<Text style={local.greeting}>
						Hello, {currentUser?.displayName?.split(" ")[0] || "Student"}
					</Text>
					<Text style={local.greetingSub}>
						{totalCredits} credits across {semesters.length} semesters
					</Text>

					{/* Profile switcher chip */}
					<TouchableOpacity
						style={local.profileChip}
						onPress={() => setDrawerOpen(true)}
						activeOpacity={0.7}
					>
						<View style={local.profileDot} />
						<Text style={local.profileChipName} numberOfLines={1}>
							{currentProfile?.name ?? "Select Profile"}
						</Text>
						<ChevronDown size={13} color={Colors.textSubtle} />
					</TouchableOpacity>
				</View>

				{/* Quick Stats */}
				{semesters.length > 0 && (
					<View style={local.statsRow}>
						<View style={local.statCard}>
							<Text style={local.statValue}>{semesters.length}</Text>
							<Text style={local.statLabel}>Semesters</Text>
						</View>
						<View style={local.statCard}>
							<Text style={local.statValue}>{totalSubjects}</Text>
							<Text style={local.statLabel}>Subjects</Text>
						</View>
						<View style={local.statCard}>
							<Text style={local.statValue}>{totalCredits}</Text>
							<Text style={local.statLabel}>Credits</Text>
						</View>
					</View>
				)}

				{/* Quick Actions */}
				<View style={local.sectionHeader}>
					<Text style={local.sectionTitle}>Quick Actions</Text>
				</View>

				<View style={local.actionsGrid}>
					{quickActions.map((action) => (
						<TouchableOpacity
							key={action.title}
							style={local.actionCard}
							onPress={() => handlePress(action)}
							activeOpacity={0.7}
						>
							<View style={[local.actionIcon, { borderColor: action.color + "40" }]}>
								{action.icon}
							</View>
							<Text style={local.actionTitle}>{action.title}</Text>
							<Text style={local.actionSubtitle}>{action.subtitle}</Text>
						</TouchableOpacity>
					))}
				</View>

			</ScrollView>

			{/* Profile Drawer */}
			<ProfileDrawer
				visible={drawerOpen}
				onClose={() => setDrawerOpen(false)}
				onShareProfile={(id) => {
					setDrawerOpen(false);
					setShareProfileId(id);
				}}
			/>

			{/* Share Modal */}
			{profileForShare && (
				<ShareModal
					visible={shareProfileId != null}
					onClose={() => setShareProfileId(null)}
					profileName={profileForShare.name}
					currentShares={currentSharesForProfile}
					onShareWithUser={async (emailOrId, permissionOrAction, actionType) => {
						await shareProfileWithUser(profileForShare, emailOrId, permissionOrAction as "read" | "edit" | "unshare", actionType);
					}}
				/>
			)}
		</SafeAreaView>
	);
}

const local = StyleSheet.create({
	scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxxl, gap: Spacing.xl },

	greetingSection: { paddingTop: Spacing.sm, gap: Spacing.sm },
	greeting: { fontSize: FontSize.xxxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
	greetingSub: { fontSize: FontSize.base, color: Colors.textMuted },

	profileChip: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.xs + 2,
		alignSelf: "flex-start",
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.xs + 2,
		borderRadius: Radius.full,
		backgroundColor: Colors.surfaceElevated,
		borderWidth: 1,
		borderColor: Colors.border,
		marginTop: Spacing.xs,
	},
	profileDot: {
		width: 7,
		height: 7,
		borderRadius: 4,
		backgroundColor: Colors.primary,
	},
	profileChipName: {
		fontSize: FontSize.xs,
		fontWeight: FontWeight.semibold,
		color: Colors.textMuted,
		maxWidth: 180,
	},

	statsRow: { flexDirection: "row", gap: Spacing.sm },
	statCard: {
		flex: 1,
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		borderWidth: 1,
		borderColor: Colors.border,
		padding: Spacing.md,
		alignItems: "center",
		gap: 2,
	},
	statValue: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.primary },
	statLabel: { fontSize: FontSize.xs, color: Colors.textMuted },

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
	actionIcon: {
		width: 42,
		height: 42,
		borderRadius: Radius.md,
		backgroundColor: Colors.surfaceElevated,
		borderWidth: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	actionTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
	actionSubtitle: { fontSize: FontSize.xs, color: Colors.textMuted },
});
