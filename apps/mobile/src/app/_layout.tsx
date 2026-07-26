import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { AuthProvider } from "@/contexts/AuthContext";
import { MessageProvider } from "@/contexts/MessageContext";

export default function RootLayout() {
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
