"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/firebase/AuthContext";
import { useRouter } from "next/navigation";
import { ChatProvider } from "@/contexts/ChatContext";
import ChatView from "./ChatView";

export default function ChatPageClient() {
	const { currentUser } = useAuth();
	const router = useRouter();

	useEffect(() => {
		// currentUser is null when not logged in (after Firebase initialises)
		// The auth context doesn't expose a loading state so we rely on redirect
		if (currentUser === null) {
			router.replace("/login");
		}
	}, [currentUser, router]);

	// currentUser undefined = Firebase not yet initialised → render nothing
	if (!currentUser) return null;

	return (
		<ChatProvider>
			<ChatView />
		</ChatProvider>
	);
}
