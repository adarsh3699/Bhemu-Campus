import { SafeAreaView } from "react-native-safe-area-context";
import { Layout } from "@/styles";
import ScreenHeader from "@/components/ui/ScreenHeader";
import AttendanceView from "@/components/AttendanceCalculator/AttendanceView";

export default function AttendanceScreen() {
	return (
		<SafeAreaView style={Layout.flex} edges={["top"]}>
			<ScreenHeader title="Attendance" />
			<AttendanceView />
		</SafeAreaView>
	);
}
