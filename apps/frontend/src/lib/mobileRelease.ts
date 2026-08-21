export const MOBILE_RELEASE = {
	version: "1.1.4",
	apkUrl: "https://github.com/adarsh3699/Bhemu-Campus/releases/download/mobile-v1.1.4/bcampus-mobile-v1.1.4.apk",
	websiteUrl: "https://campus.bhemu.in/",
	releaseNotes: [
		"Added a reliable UMS Cloudflare verification fallback.",
		"Improved sync resume behavior after verification or login.",
		"Added expo-system-ui support for the configured interface style.",
	],
	mandatory: true,
} as const;
