import { Tabs } from "expo-router";
import { Home, Calculator, Trophy, Settings } from "lucide-react-native";
import { Colors } from "@/constants/Colors";

export default function TabsLayout() {
	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				tabBarStyle: {
					backgroundColor: Colors.surface,
					borderTopColor: Colors.border,
					borderTopWidth: 1,
				},
				tabBarActiveTintColor: Colors.primary,
				tabBarInactiveTintColor: Colors.textSubtle,
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: "Home",
					tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
				}}
			/>
			<Tabs.Screen
				name="gpa"
				options={{
					title: "GPA",
					tabBarIcon: ({ color, size }) => <Calculator size={size} color={color} />,
				}}
			/>
			<Tabs.Screen
				name="leaderboard"
				options={{
					title: "Leaderboard",
					tabBarIcon: ({ color, size }) => <Trophy size={size} color={color} />,
				}}
			/>
			<Tabs.Screen
				name="settings"
				options={{
					title: "Settings",
					tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
				}}
			/>
		</Tabs>
	);
}
