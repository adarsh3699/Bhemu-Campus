import { SafeAreaView } from "react-native-safe-area-context";
import { Layout } from "@/styles";
import ScreenHeader from "@/components/ui/ScreenHeader";
import GpaGoalPlannerView from "@/components/GpaGoalPlanner/GpaGoalPlannerView";

export default function GoalPlannerScreen() {
	return (
		<SafeAreaView style={Layout.flex} edges={["top"]}>
			<ScreenHeader title="Goal Planner" />
			<GpaGoalPlannerView />
		</SafeAreaView>
	);
}
