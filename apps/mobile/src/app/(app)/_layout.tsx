import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { GpaDataProvider } from "@/contexts/GpaDataContext";
import { MarksDataProvider } from "@/contexts/MarksDataContext";

export default function AppLayout() {
	const { currentUser } = useAuth();

	if (!currentUser) {
		return <Redirect href="/(auth)/sign-in" />;
	}

	return (
		<GpaDataProvider>
			<MarksDataProvider>
				<Stack screenOptions={{ headerShown: false }} />
			</MarksDataProvider>
		</GpaDataProvider>
	);
}
