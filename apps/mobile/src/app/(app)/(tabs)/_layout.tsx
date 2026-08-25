import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Pressable, StyleSheet, View, Text } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from "react-native-reanimated";
import { Tabs } from "expo-router";
import { Home, Calculator, RefreshCw, MessageCircle, Settings } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors, Radius, FontSize, FontWeight } from "@/constants/Theme";
import { useAuth } from "@/contexts/AuthContext";
import { useGpaProfiles } from "@/contexts/GpaDataContext";
import { db } from "@/firebase/config";
import { saveUmsData, getUmsData } from "@/features/ums-data/storage";
import { useUmsData } from "@/features/ums-data/useUmsData";
import type { NotificationProfileData } from "@/features/notifications/notificationService";
import { STORAGE_KEYS, type UMSLocalData } from "@bhemu/shared";
import type { UMSSyncResult } from "@bhemu/firebase";

const LAST_SYNC_KEY = STORAGE_KEYS.umsLastSync;
const LazyUMSWebView = lazy(() => import("@/features/sync/UMSWebView"));

type SyncState = "idle" | "syncing" | "login_needed" | "success" | "error";

async function rescheduleNotifications(
	activeProfileId: string | number | null,
	profiles: Array<{ id: string | number; name?: string }>,
	allowPermissionPrompt = false,
	isCurrentRequest?: () => boolean
) {
	const [{ getNotificationSettings }, { rescheduleUmsNotifications }] = await Promise.all([
		import("@/features/notifications/notificationSettings"),
		import("@/features/notifications/notificationService"),
	]);
	const profileData = await Promise.all<NotificationProfileData>(
		profiles.map(async (profile) => ({
			profileId: profile.id,
			profileName: profile.name?.trim() || "Profile",
			data: await getUmsData(profile.id),
		}))
	);
	const activeProfile = profileData.find((profile) => String(profile.profileId) === String(activeProfileId)) ?? null;
	const settings = await getNotificationSettings();
	if (isCurrentRequest && !isCurrentRequest()) return;
	await rescheduleUmsNotifications(activeProfile, profileData, settings, allowPermissionPrompt);
}

function SyncButton({
	onPress,
	syncState,
	disabled,
}: {
	onPress: () => void;
	syncState: SyncState;
	disabled: boolean;
}) {
	const isBusy = syncState === "syncing";
	const buttonColor = disabled
		? Colors.textSubtle
		: syncState === "success"
			? Colors.success
			: syncState === "error"
				? Colors.destructive
				: Colors.primary;

	const rotation = useSharedValue(0);

	useEffect(() => {
		rotation.value = isBusy
			? withRepeat(withTiming(360, { duration: 1000, easing: Easing.linear }), -1)
			: withTiming(0);
	}, [isBusy, rotation]);

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ rotate: `${rotation.value}deg` }],
	}));

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel="Sync university data"
			onPress={disabled || isBusy ? undefined : onPress}
			disabled={disabled || isBusy}
			style={local.syncBtnOuter}
		>
			<View style={[local.syncBtn, { backgroundColor: buttonColor }]}>
				<Animated.View style={animatedStyle}>
					<RefreshCw size={22} color={Colors.textPrimary} />
				</Animated.View>
			</View>
		</Pressable>
	);
}

function AnimatedTooltip({ message, color = Colors.primary }: { message: string; color?: string }) {
	const translateY = useSharedValue(0);

	useEffect(() => {
		translateY.value = withRepeat(
			withTiming(-6, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
			-1,
			true // reverse
		);
	}, [translateY]);

	const style = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

	return (
		<Animated.View
			style={[local.syncTooltip, { backgroundColor: color }, style]}
			accessibilityRole="text"
			accessible={true}
		>
			<Text style={local.syncTooltipText}>{message}</Text>
			<View style={[local.syncTooltipTriangle, { borderTopColor: color }]} />
		</Animated.View>
	);
}

export default function TabsLayout() {
	const { currentUser, authLoading } = useAuth();
	const { activeProfile, currentProfile, allProfiles } = useGpaProfiles();
	const isSharedProfile = !!currentProfile?.isShared;
	const { data: umsData, loading: umsLoading } = useUmsData();
	const hasSynced = !!umsData?.lastSyncedAt;
	const pendingUmsDataRef = useRef<UMSLocalData | null>(null);

	const [syncState, setSyncState] = useState<SyncState>("idle");
	const [engineActive, setEngineActive] = useState(false);
	const [loginVisible, setLoginVisible] = useState(false);
	const previousNotificationScopeRef = useRef<string | null>(null);
	const notificationRequestRef = useRef(0);
	const notificationAppStateRef = useRef(AppState.currentState);
	const queueNotificationRefresh = useCallback(
		(
			profileId: string | number | null,
			profiles: Array<{ id: string | number; name?: string }>,
			allowPermissionPrompt: boolean
		) => {
			const requestId = ++notificationRequestRef.current;
			void rescheduleNotifications(
				profileId,
				profiles,
				allowPermissionPrompt,
				() => notificationRequestRef.current === requestId
			);
		},
		[]
	);
	const notificationScope = `${currentUser?.uid ?? ""}|${activeProfile == null ? "" : String(activeProfile)}|${allProfiles
		.map((profile) => `${String(profile.id)}:${profile.name}`)
		.join(",")}`;

	useEffect(() => {
		let cancelled = false;
		let unsubscribeSettings: (() => void) | undefined;

		const timer = setTimeout(() => {
			void Promise.all([
				import("@/features/notifications/notificationSettings"),
				import("@/features/notifications/notificationService"),
			]).then(([settingsModule]) => {
				if (cancelled) return;
				const refresh = () => {
					if (!cancelled && currentUser) queueNotificationRefresh(activeProfile, allProfiles, true);
				};
				unsubscribeSettings = settingsModule.subscribeToNotificationSettings(refresh);
			});
		}, 600);

		return () => {
			cancelled = true;
			clearTimeout(timer);
			unsubscribeSettings?.();
		};
	}, [activeProfile, allProfiles, currentUser, queueNotificationRefresh]);

	useEffect(() => {
		const subscription = AppState.addEventListener("change", (nextState) => {
			const wasInactive = notificationAppStateRef.current !== "active";
			notificationAppStateRef.current = nextState;

			if (!wasInactive || nextState !== "active" || !currentUser) return;
			if (activeProfile == null && allProfiles.length === 0) return;
			// Recheck permission after returning from phone settings without showing
			// a permission prompt merely because the app became active.
			queueNotificationRefresh(activeProfile, allProfiles, false);
		});

		return () => subscription.remove();
	}, [activeProfile, allProfiles, currentUser, queueNotificationRefresh]);

	useEffect(() => {
		if (currentUser) return;
		// Logout removes all managed reminders. Reset the scope guard so the same
		// account gets a fresh scheduling pass when it logs in again.
		previousNotificationScopeRef.current = null;
		notificationRequestRef.current += 1;
	}, [currentUser]);

	// Do not request notification permission during startup. A profile switch is
	// an explicit user interaction, so it is a safe point to refresh reminders.
	useEffect(() => {
		if (!currentUser || (activeProfile == null && allProfiles.length === 0)) return;
		if (previousNotificationScopeRef.current === notificationScope) return;
		previousNotificationScopeRef.current = notificationScope;
		queueNotificationRefresh(activeProfile, allProfiles, false);
	}, [currentUser, activeProfile, allProfiles, notificationScope, queueNotificationRefresh]);

	const startSync = useCallback(() => {
		pendingUmsDataRef.current = null;
		setSyncState("syncing");
		setLoginVisible(false);
		setEngineActive(true);
	}, []);

	const handleSyncData = useCallback(
		async (data: UMSSyncResult) => {
			if (!currentUser || activeProfile == null) {
				pendingUmsDataRef.current = null;
				setEngineActive(false);
				setLoginVisible(false);
				setSyncState("error");
				return;
			}
			try {
				const { writeToFirestore } = await import("@/features/sync/syncCoordinator");
				await writeToFirestore(data, activeProfile, db, currentUser.uid);
				const pendingUmsData = pendingUmsDataRef.current;
				if (pendingUmsData) {
					await saveUmsData({ ...pendingUmsData, lastSyncedAt: new Date().toISOString() }, activeProfile);
					queueNotificationRefresh(activeProfile, allProfiles, true);
				}
				pendingUmsDataRef.current = null;
				await AsyncStorage.setItem(
					LAST_SYNC_KEY,
					new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
				);
				setSyncState("success");
				setEngineActive(false);
				setLoginVisible(false);
				setTimeout(() => setSyncState("idle"), 3000);
			} catch {
				pendingUmsDataRef.current = null;
				setSyncState("error");
				setEngineActive(false);
				setLoginVisible(false);
			}
		},
		[activeProfile, allProfiles, currentUser, queueNotificationRefresh]
	);

	const handleNeedsLogin = useCallback(() => {
		setLoginVisible(true);
		setSyncState("login_needed");
	}, []);

	const handleChallengeDetected = useCallback(() => {
		setLoginVisible(true);
		setSyncState("login_needed");
	}, []);

	const handleLoginDone = useCallback(() => {
		setLoginVisible(false);
		setSyncState("syncing");
	}, []);

	const handleClose = useCallback(() => {
		pendingUmsDataRef.current = null;
		setLoginVisible(false);
		setEngineActive(false);
		setSyncState("idle");
	}, []);

	const handleUmsLocalData = useCallback((data: UMSLocalData) => {
		pendingUmsDataRef.current = data;
	}, []);

	const handleError = useCallback(() => {
		pendingUmsDataRef.current = null;
		setSyncState("error");
		setLoginVisible(false);
		setEngineActive(false);
	}, []);

	return (
		<View style={local.container}>
			{engineActive ? (
				<View style={loginVisible ? local.browserFull : local.browserHidden}>
					<Suspense
						fallback={
							<View style={local.webViewFallback}>
								<ActivityIndicator color={Colors.primary} />
							</View>
						}
					>
						<LazyUMSWebView
							loginVisible={loginVisible}
							onSyncData={handleSyncData}
							onUmsLocalData={handleUmsLocalData}
							onNeedsLogin={handleNeedsLogin}
							onChallengeDetected={handleChallengeDetected}
							onLoginDone={handleLoginDone}
							onError={handleError}
							onClose={handleClose}
						/>
					</Suspense>
				</View>
			) : null}

			<View style={local.tabsContainer}>
				<Tabs
					screenOptions={{
						headerShown: false,
						tabBarShowLabel: false,
						tabBarStyle: local.tabBar,
						tabBarActiveTintColor: Colors.primary,
						tabBarInactiveTintColor: Colors.textSubtle,
					}}
				>
					<Tabs.Screen
						name="index"
						options={{
							title: "Home",
							tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
						}}
					/>
					<Tabs.Screen
						name="gpa"
						options={{
							title: "GPA",
							tabBarIcon: ({ color, size }) => <Calculator size={size} color={color} />,
						}}
					/>
					<Tabs.Screen
						name="sync"
						options={{
							tabBarButton: () => (
								<View style={local.syncBtnContainer}>
									{syncState === "success" ? (
										<AnimatedTooltip message="Sync Successful!" color={Colors.success} />
									) : syncState === "error" ? (
										<AnimatedTooltip message="Sync Failed!" color={Colors.destructive} />
									) : syncState === "idle" && !hasSynced && !umsLoading && !isSharedProfile ? (
										<AnimatedTooltip message="Sync with UMS" color={Colors.primary} />
									) : null}
									<SyncButton
										onPress={startSync}
										syncState={syncState}
										disabled={
											isSharedProfile ||
											authLoading ||
											!currentUser ||
											activeProfile == null ||
											engineActive
										}
									/>
								</View>
							),
						}}
					/>
					<Tabs.Screen
						name="chat"
						options={{
							title: "Chat",
							tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
						}}
					/>
					<Tabs.Screen
						name="settings"
						options={{
							title: "Settings",
							tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
						}}
					/>
				</Tabs>
			</View>
		</View>
	);
}

const local = StyleSheet.create({
	container: { flex: 1 },
	tabsContainer: { flex: 1 },
	tabBar: {
		backgroundColor: Colors.surface,
		borderTopColor: Colors.border,
		borderTopWidth: 1,
		height: 60,
	},
	browserFull: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		zIndex: 100,
		backgroundColor: Colors.background,
	},
	browserHidden: {
		position: "absolute",
		width: 0,
		height: 0,
		overflow: "hidden",
		opacity: 0,
	},
	webViewFallback: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: Colors.background,
	},
	syncBtnContainer: {
		flex: 1,
		alignItems: "center",
		justifyContent: "flex-start",
	},
	syncBtnOuter: {
		top: -18,
		alignItems: "center",
		justifyContent: "center",
		width: 64,
	},
	syncBtn: {
		width: 58,
		height: 58,
		borderRadius: 29,
		alignItems: "center",
		justifyContent: "center",
		shadowColor: Colors.primary,
		shadowOffset: { width: 0, height: 6 },
		shadowOpacity: 0.5,
		shadowRadius: 14,
		elevation: 10,
	},
	syncTooltip: {
		position: "absolute",
		top: -55,
		backgroundColor: Colors.primary,
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: Radius.lg,
		alignItems: "center",
		justifyContent: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 6,
		elevation: 8,
		zIndex: 10,
		width: 120,
	},
	syncTooltipText: {
		color: Colors.background,
		fontSize: FontSize.xs,
		fontWeight: FontWeight.bold,
		textAlign: "center",
	},
	syncTooltipTriangle: {
		position: "absolute",
		bottom: -6,
		width: 0,
		height: 0,
		borderLeftWidth: 6,
		borderRightWidth: 6,
		borderTopWidth: 6,
		borderStyle: "solid",
		backgroundColor: "transparent",
		borderLeftColor: "transparent",
		borderRightColor: "transparent",
		borderTopColor: Colors.primary,
	},
});
