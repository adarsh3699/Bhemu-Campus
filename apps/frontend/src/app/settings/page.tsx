import React from "react";
import SettingsView from "@/components/Settings/SettingsView";
import { generatePageMetadata } from "@/lib/seo";

export const metadata = generatePageMetadata({
	title: "Settings",
	description:
		"Manage your bCampus account — update credentials, sync profile data, and configure workspace preferences.",
	path: "/settings",
	noIndex: true, // private user page — don't index
});

export default function SettingsPage() {
	return <SettingsView />;
}
