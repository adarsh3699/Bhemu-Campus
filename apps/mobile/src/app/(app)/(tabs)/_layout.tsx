import { useRef, useState, useCallback } from "react";
import { View, StyleSheet, TouchableOpacity, Animated, Easing } from "react-native";
import { Tabs } from "expo-router";
import { Home, Calculator, RefreshCw, CalendarCheck, Settings } from "lucide-react-native";
import { Colors } from "@/constants/Theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/contexts/AuthContext";
import { useGpaData } from "@/contexts/GpaDataContext";
import { db } from "@/firebase/config";
import UMSWebView, { type UMSWebViewHandle } from "@/features/sync/UMSWebView";
import { writeToFirestore } from "@/features/sync/syncCoordinator";
import type { UMSSyncResult } from "@bhemu/firebase";

const LAST_SYNC_KEY = "ums_last_sync";

type SyncState = "idle" | "syncing" | "login_needed" | "success" | "error";

function SyncButton({ onPress, syncState }: { onPress: () => void; syncState: SyncState }) {
	const spinAnim = useRef(new Animated.Value(0)).current;
	const loopRef = useRef<Animated.CompositeAnimation | null>(null);
	const prevState = useRef<SyncState>("idle");

	if (syncState === "syncing" && prevState.current !== "syncing") {
		prevState.current = "syncing";
		spinAnim.setValue(0);
		loopRef.current = Animated.loop(
			Animated.timing(spinAnim, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true })
		);
		loopRef.current.start();
	} else if (syncState !== "syncing" && prevState.current === "syncing") {
		prevState.current = syncState;
		loopRef.current?.stop();
		spinAnim.setValue(0);
	}

	const rotate = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
	const btnColor = syncState === "success" ? Colors.success : syncState === "error" ? Colors.destructive : Colors.primary;

	return (
		<TouchableOpacity
			onPress={syncState === "syncing" ? undefined : onPress}
			activeOpacity={syncState === "syncing" ? 1 : 0.7}
			style={local.syncBtnOuter}
		>
			<View style={[local.syncBtn, { backgroundColor: btnColor }]}>
				<Animated.View style={{ transform: [{ rotate }] }}>
					<RefreshCw size={22} color={Colors.textPrimary} />
				</Animated.View>
			</View>
		</TouchableOpacity>
	);
}

export default function TabsLayout() {
	const { currentUser } = useAuth();
	const { activeProfile } = useGpaData();
	const webViewRef = useRef<UMSWebViewHandle>(null);

	const [syncState, setSyncState] = useState<SyncState>("idle");
	const [engineActive, setEngineActive] = useState(false);
	const [loginVisible, setLoginVisible] = useState(false);

	const startSync = useCallback(() => {
		setSyncState("syncing");
		setLoginVisible(false);
		setEngineActive(true);
	}, []);

	const handleSyncData = useCallback(async (data: UMSSyncResult) => {
		setEngineActive(false);
		if (!currentUser || !activeProfile) {
			setSyncState("error");
			setTimeout(() => setSyncState("idle"), 3000);
			return;
		}
		try {
			await writeToFirestore(data, activeProfile, db, currentUser.uid);
			await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
			setSyncState("success");
			setTimeout(() => setSyncState("idle"), 2500);
		} catch {
			setSyncState("error");
			setTimeout(() => setSyncState("idle"), 3000);
		}
	}, [currentUser, activeProfile]);

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

	const handleError = useCallback(() => {
		setEngineActive(false);
		setSyncState("error");
		setTimeout(() => setSyncState("idle"), 3000);
	}, []);

	return (
		<>
			<View style={local.container}>
				{engineActive && (
					<View style={loginVisible ? local.browserFull : local.browserHidden}>
						<UMSWebView
							ref={webViewRef}
							loginVisible={loginVisible}
							onSyncData={handleSyncData}
							onProgress={() => {}}
							onNeedsLogin={handleNeedsLogin}
							onLoginDone={handleLoginDone}
							onError={handleError}
							onClose={handleClose}
						/>
					</View>
				)}

				<View style={local.tabsContainer}>
					<Tabs
						screenOptions={{
							headerShown: false,
							tabBarShowLabel: false,
							tabBarStyle: {
								backgroundColor: Colors.surface,
								borderTopColor: Colors.border,
								borderTopWidth: 1,
								height: 60,
							},
							tabBarActiveTintColor: Colors.primary,
							tabBarInactiveTintColor: Colors.textSubtle,
						}}
					>
						<Tabs.Screen
							name="index"
							options={{ title: "Home", tabBarIcon: ({ color, size }) => <Home size={size} color={color} /> }}
						/>
						<Tabs.Screen
							name="gpa"
							options={{ title: "GPA", tabBarIcon: ({ color, size }) => <Calculator size={size} color={color} /> }}
						/>
						<Tabs.Screen
							name="sync"
							options={{ tabBarButton: () => <SyncButton onPress={startSync} syncState={syncState} /> }}
						/>
						<Tabs.Screen
							name="attendance"
							options={{ title: "Attendance", tabBarIcon: ({ color, size }) => <CalendarCheck size={size} color={color} /> }}
						/>
						<Tabs.Screen
							name="settings"
							options={{ title: "Settings", tabBarIcon: ({ color, size }) => <Settings size={size} color={color} /> }}
						/>
						</Tabs>
				</View>
			</View>
		</>
	);
}

const local = StyleSheet.create({
	container: { flex: 1 },
	tabsContainer: { flex: 1 },
	browserFull: {
		position: "absolute",
		top: 0, left: 0, right: 0, bottom: 0,
		zIndex: 100,
		backgroundColor: Colors.background,
	},
	browserHidden: {
		position: "absolute",
		width: 0, height: 0,
		overflow: "hidden",
		opacity: 0,
	},
	syncBtnOuter: {
		position: "relative",
		top: -12,
		alignItems: "center",
		justifyContent: "center",
		width: 60,
	},
	syncBtn: {
		width: 50,
		height: 50,
		borderRadius: 25,
		alignItems: "center",
		justifyContent: "center",
		shadowColor: Colors.primary,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.5,
		shadowRadius: 10,
		elevation: 8,
	},
});
