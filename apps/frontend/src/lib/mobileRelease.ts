export const MOBILE_RELEASE = {
	version: "1.2.2",
	apkUrl: "https://github.com/adarsh3699/Bhemu-Campus/releases/download/mobile-v1.2.2/bcampus-mobile-v1.2.2.apk",
	websiteUrl: "https://campus.bhemu.in/",
	releaseNotes: [
		"Added native background downloading for app updates. You can now minimize the app while updates download!",
		"App installer now launches automatically in the foreground when a background download completes.",
		"Fixed unused variables and optimized memory usage in the update service.",
	],
	mandatory: false,
} as const;
