import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { GpaDataProvider } from "@/contexts/GpaDataContext";
import { MarksDataProvider } from "@/contexts/MarksDataContext";
import { AttendanceDataProvider } from "@/contexts/AttendanceDataContext";

export default function AppLayout() {
	const { currentUser } = useAuth();

	if (!currentUser) {
		return <Redirect href="/(auth)/sign-in" />;
	}

	return (
		<GpaDataProvider>
			<MarksDataProvider>
				<AttendanceDataProvider>
					<Stack screenOptions={{ headerShown: false }} />
				</AttendanceDataProvider>
			</MarksDataProvider>
		</GpaDataProvider>
	);
}
