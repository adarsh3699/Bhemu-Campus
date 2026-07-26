import { RotateCcw } from "lucide-react-native";
import { Colors } from "@/constants/Theme";
import PlaceholderScreen from "@/components/ui/PlaceholderScreen";

export default function ReappearCalculatorScreen() {
	return <PlaceholderScreen title="Reappear Calculator" icon={<RotateCcw size={32} color={Colors.destructive} />} />;
}
