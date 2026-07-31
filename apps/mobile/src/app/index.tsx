import { Redirect } from "expo-router";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { markStartup } from "@/features/startup/performance";

export default function Index() {
	const { currentUser, authLoading, launchUser, launchReady } = useAuth();
	useEffect(() => {
		if (!authLoading) markStartup("auth_ready");
	}, [authLoading]);

	// Returning students can enter cached Home as soon as their local launch
	// identity is available; Firebase restores the authenticated user behind it.
	if (!launchReady || (authLoading && !launchUser)) return null;

	return <Redirect href={currentUser || launchUser ? "/(app)/(tabs)/" : "/(auth)/sign-in"} />;
}
