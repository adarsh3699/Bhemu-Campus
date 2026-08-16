import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { InteractionManager } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { MessageProvider } from "@/contexts/MessageContext";
import { markStartup } from "@/features/startup/performance";
import AppUpdateGate from "@/features/app-updates/AppUpdateGate";

void SplashScreen.preventAutoHideAsync().catch(() => {});
markStartup("native_launch");

function RootContent() {
	const { authLoading, launchReady, launchUser } = useAuth();
	const initialRouteReady = launchReady && (!authLoading || launchUser !== null);

	useEffect(() => {
		if (!initialRouteReady) return;

		markStartup("first_route_rendered");
		// Keep the native splash visible until authentication has selected the
		// initial route. This avoids a second React loading screen and prevents a
		// blank frame between the splash and the first usable screen.
		let secondFrame: number | undefined;
		const firstFrame = requestAnimationFrame(() => {
			secondFrame = requestAnimationFrame(() => {
				void SplashScreen.hideAsync().catch(() => {});
			});
		});
		return () => {
			cancelAnimationFrame(firstFrame);
			if (secondFrame !== undefined) cancelAnimationFrame(secondFrame);
		};
	}, [initialRouteReady]);

	useEffect(() => {
		// Notifications are not needed to render the first screen. Load the native
		// module after initial interactions so it stays off the startup path.
		const task = InteractionManager.runAfterInteractions(() => {
			void import("@/features/notifications/notificationService").then(({ configureNotifications }) => {
				configureNotifications();
			});
		});
		return () => task.cancel();
	}, []);

	return (
		<>
			<Stack screenOptions={{ headerShown: false }} />
			<AppUpdateGate />
		</>
	);
}

export default function RootLayout() {
	return (
		<KeyboardProvider>
			<MessageProvider>
				<AuthProvider>
					<StatusBar style="light" />
					<RootContent />
				</AuthProvider>
			</MessageProvider>
		</KeyboardProvider>
	);
}
