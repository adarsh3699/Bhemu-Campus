import { View, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { Home, Calculator, RefreshCw, Trophy, Settings } from "lucide-react-native";
import { Colors } from "@/constants/Theme";

export default function TabsLayout() {
	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				tabBarShowLabel: false,
				tabBarStyle: {
					backgroundColor: Colors.surface,
					borderTopColor: Colors.border,
					borderTopWidth: 1,
					height: 60,
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
				name="sync"
				options={{
					title: "",
					tabBarIcon: () => (
						<View style={local.syncBtnOuter}>
							<View style={local.syncBtn}>
								<RefreshCw size={22} color={Colors.textPrimary} />
							</View>
						</View>
					),
					tabBarLabel: () => null,
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
			{/* Hide attendance from tab bar — accessible from Home hub */}
			<Tabs.Screen
				name="attendance"
				options={{
					href: null,
				}}
			/>
		</Tabs>
	);
}

const local = StyleSheet.create({
	syncBtnOuter: {
		position: "relative",
		top: -12,
		alignItems: "center",
		justifyContent: "center",
	},
	syncBtn: {
		width: 50,
		height: 50,
		borderRadius: 25,
		backgroundColor: Colors.primary,
		alignItems: "center",
		justifyContent: "center",
		shadowColor: Colors.primary,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.5,
		shadowRadius: 10,
		elevation: 8,
	},
});
