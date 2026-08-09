import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { GpaDataProvider } from "@/contexts/GpaDataContext";
import { AttendanceDataProvider } from "@/contexts/AttendanceDataContext";

export default function AppLayout() {
	const { currentUser, launchUser, authLoading } = useAuth();

	// A cached launch identity is sufficient to hydrate local GPA data. The
	// authenticated Firebase user will replace it shortly after launch.
	if (!currentUser && !launchUser) {
		if (authLoading) return null;
		return <Redirect href="/(auth)/sign-in" />;
	}

	return (
		<GpaDataProvider>
			<AttendanceDataProvider>
				<Stack screenOptions={{ headerShown: false }} />
			</AttendanceDataProvider>
		</GpaDataProvider>
	);
}
