import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/constants/Colors";

export default function Index() {
	const { currentUser } = useAuth();

	if (currentUser === undefined) {
		return (
			<View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background }}>
				<ActivityIndicator color={Colors.primary} />
			</View>
		);
	}

	return <Redirect href={currentUser ? "/(app)/(tabs)/" : "/(auth)/sign-in"} />;
}
