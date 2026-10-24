export const MOBILE_RELEASE = {
	version: "2.0.2",
	apkUrl: "https://github.com/adarsh3699/Bhemu-Campus/releases/download/mobile-v2.0.2/bcampus-mobile-v2.0.2.apk",
	websiteUrl: "https://campus.bhemu.in/",
	releaseNotes: [
		"Restored reliable chat notifications for announcements, pinned messages, replies, and batchmate messages.",
		"Improved notification payload compatibility, token handling, and delivery diagnostics.",
		"Improved Android update downloads so the installer opens automatically after completion.",
		"Added a polished Android v2.0.2 release on Expo SDK 57 with native updater fixes.",
	],
	mandatory: false,
} as const;
