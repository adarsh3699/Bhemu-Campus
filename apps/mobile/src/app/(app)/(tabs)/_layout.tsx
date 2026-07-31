import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Tabs } from "expo-router";
import { Home, Calculator, RefreshCw, CalendarCheck, Settings } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/constants/Theme";
import { useAuth } from "@/contexts/AuthContext";
import { useGpaProfiles } from "@/contexts/GpaDataContext";
import { db } from "@/firebase/config";
import { saveUmsData, getUmsData } from "@/features/ums-data/storage";
import type { NotificationProfileData } from "@/features/notifications/notificationService";
import { STORAGE_KEYS, type UMSLocalData } from "@bhemu/shared";
import type { UMSWebViewHandle } from "@/features/sync/UMSWebView";
import type { UMSSyncResult } from "@bhemu/firebase";

const LAST_SYNC_KEY = STORAGE_KEYS.umsLastSync;
const LazyUMSWebView = lazy(() => import("@/features/sync/UMSWebView"));
const noop = () => {};

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

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel="Sync university data"
			onPress={disabled || isBusy ? undefined : onPress}
			disabled={disabled || isBusy}
			style={local.syncBtnOuter}
		>
			<View style={[local.syncBtn, { backgroundColor: buttonColor }]}>
				{isBusy ? (
					<ActivityIndicator color={Colors.textPrimary} />
				) : (
					<RefreshCw size={22} color={Colors.textPrimary} />
				)}
			</View>
		</Pressable>
	);
}

export default function TabsLayout() {
	const { currentUser, authLoading } = useAuth();
	const { activeProfile, currentProfile, allProfiles } = useGpaProfiles();
	const isSharedProfile = !!currentProfile?.isShared;
	const webViewRef = useRef<UMSWebViewHandle>(null);

	const [syncState, setSyncState] = useState<SyncState>("idle");
	const [engineActive, setEngineActive] = useState(false);
	const [loginVisible, setLoginVisible] = useState(false);
	const previousNotificationScopeRef = useRef<string | null>(null);
	const notificationRequestRef = useRef(0);
	const queueNotificationRefresh = useCallback(
		(
			profileId: string | number | null,
			profiles: Array<{ id: string | number; name?: string }>,
			allowPermissionPrompt: boolean
		) => {
			const requestId = ++notificationRequestRef.current;
			void rescheduleNotifications(profileId, profiles, allowPermissionPrompt, () => notificationRequestRef.current === requestId);
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

	// Do not request notification permission during startup. A profile switch is
	// an explicit user interaction, so it is a safe point to refresh reminders.
	useEffect(() => {
		if (!currentUser || (activeProfile == null && allProfiles.length === 0)) return;
		if (previousNotificationScopeRef.current === notificationScope) return;
		previousNotificationScopeRef.current = notificationScope;
		queueNotificationRefresh(activeProfile, allProfiles, false);
	}, [currentUser, activeProfile, allProfiles, notificationScope, queueNotificationRefresh]);

	const startSync = useCallback(() => {
		setSyncState("syncing");
		setLoginVisible(false);
		setEngineActive(true);
	}, []);

	const handleSyncData = useCallback(
		async (data: UMSSyncResult) => {
			setEngineActive(false);
			if (!currentUser || !activeProfile) {
				setSyncState("error");
				setTimeout(() => setSyncState("idle"), 3000);
				return;
			}
			try {
				const { writeToFirestore } = await import("@/features/sync/syncCoordinator");
				await writeToFirestore(data, activeProfile, db, currentUser.uid);
				await AsyncStorage.setItem(
					LAST_SYNC_KEY,
					new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
				);
				setSyncState("success");
				setTimeout(() => setSyncState("idle"), 2500);
			} catch {
				setSyncState("error");
				setTimeout(() => setSyncState("idle"), 3000);
			}
		},
		[currentUser, activeProfile]
	);

	const handleNeedsLogin = useCallback(() => {
		setSyncState("login_needed");
		setLoginVisible(true);
	}, []);

	const handleLoginDone = useCallback(() => {
		setLoginVisible(false);
		setSyncState("syncing");
	}, []);

	const handleClose = useCallback(() => {
		setLoginVisible(false);
		setEngineActive(false);
		setSyncState("idle");
	}, []);

	const handleUmsLocalData = useCallback(
		async (data: UMSLocalData) => {
			if (activeProfile == null) return;
			await saveUmsData({ ...data, lastSyncedAt: new Date().toISOString() }, activeProfile);
			queueNotificationRefresh(activeProfile, allProfiles, true);
		},
		[activeProfile, allProfiles, queueNotificationRefresh]
	);

	const handleError = useCallback(() => {
		setEngineActive(false);
		setSyncState("error");
		setTimeout(() => setSyncState("idle"), 3000);
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
							ref={webViewRef}
							loginVisible={loginVisible}
							onSyncData={handleSyncData}
							onUmsLocalData={handleUmsLocalData}
							onProgress={noop}
							onNeedsLogin={handleNeedsLogin}
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
								<SyncButton
									onPress={startSync}
									syncState={syncState}
									disabled={isSharedProfile || authLoading || !currentUser || activeProfile == null}
								/>
							),
						}}
					/>
					<Tabs.Screen
						name="attendance"
						options={{
							title: "Attendance",
							tabBarIcon: ({ color, size }) => <CalendarCheck size={size} color={color} />,
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
});
