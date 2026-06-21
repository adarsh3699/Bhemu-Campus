import React from "react";
import ProfileView from "@/components/Settings/ProfileView";
import { generatePageMetadata } from "@/lib/seo";

export const metadata = generatePageMetadata({
	title: "Settings",
	description:
		"Manage your Bhemu Calculator account — update credentials, sync profile data, and configure workspace preferences.",
	path: "/settings",
	noIndex: true, // private user page — don't index
});

export default function SettingsPage() {
	return <ProfileView />;
}
