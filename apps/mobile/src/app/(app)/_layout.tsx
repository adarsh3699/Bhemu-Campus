import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

export default function AppLayout() {
	const { currentUser } = useAuth();

	if (!currentUser) {
		return <Redirect href="/(auth)/sign-in" />;
	}

	return <Stack screenOptions={{ headerShown: false }} />;
}
