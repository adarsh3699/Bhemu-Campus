import { SafeAreaView } from "react-native-safe-area-context";
import ScreenHeader from "@/components/ui/ScreenHeader";
import LeaderboardView from "@/components/Leaderboard/LeaderboardView";
import { Layout } from "@/styles";

export default function LeaderboardScreen() {
	return (
		<SafeAreaView style={Layout.flex} edges={["top"]}>
			<ScreenHeader title="Leaderboard" />
			<LeaderboardView />
		</SafeAreaView>
	);
}
