import { SafeAreaView } from "react-native-safe-area-context";
import { Layout } from "@/styles";
import ScreenHeader from "@/components/ui/ScreenHeader";
import ReappearCalculatorView from "@/components/ReappearCalculator/ReappearCalculatorView";

export default function ReappearCalculatorScreen() {
	return (
		<SafeAreaView style={Layout.flex} edges={["top"]}>
			<ScreenHeader title="Reappear Calculator" />
			<ReappearCalculatorView />
		</SafeAreaView>
	);
}
