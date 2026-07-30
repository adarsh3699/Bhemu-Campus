import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { AuthProvider } from "@/contexts/AuthContext";
import { MessageProvider } from "@/contexts/MessageContext";
import { configureNotifications } from "@/features/notifications/notificationService";

export default function RootLayout() {
	useEffect(() => {
		configureNotifications();
	}, []);

	return (
		<KeyboardProvider>
			<MessageProvider>
				<AuthProvider>
					<StatusBar style="light" />
					<Stack screenOptions={{ headerShown: false }} />
				</AuthProvider>
			</MessageProvider>
		</KeyboardProvider>
	);
}
