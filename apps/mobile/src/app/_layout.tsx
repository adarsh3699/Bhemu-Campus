import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { InteractionManager } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { MessageProvider } from "@/contexts/MessageContext";
import { markStartup } from "@/features/startup/performance";
import AppUpdateGate from "@/features/app-updates/AppUpdateGate";
import type { NotificationDestination } from "@/features/notifications/notificationService";

void SplashScreen.preventAutoHideAsync().catch(() => {});
markStartup("native_launch");

function RootContent() {
	const { authLoading, currentUser, launchReady, launchUser } = useAuth();
	const router = useRouter();
	const initialRouteReady = launchReady && (!authLoading || launchUser !== null);
	const canNavigateToApp = Boolean(currentUser || launchUser);

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
		let cancelled = false;
		let unsubscribeNavigation: (() => void) | undefined;
		const task = InteractionManager.runAfterInteractions(() => {
			void import("@/features/notifications/notificationService").then((notificationService) => {
				if (cancelled) return;
				notificationService.configureNotifications();
				if (!initialRouteReady || !canNavigateToApp) return;

				const navigate = (destination: NotificationDestination) => {
					router.push(destination as never);
				};
				unsubscribeNavigation = notificationService.subscribeToNotificationNavigation(navigate);
				const destination = notificationService.consumeLastNotificationNavigation();
				if (destination) navigate(destination);
			});
		});
		return () => {
			cancelled = true;
			task.cancel();
			unsubscribeNavigation?.();
		};
	}, [canNavigateToApp, initialRouteReady, router]);

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
