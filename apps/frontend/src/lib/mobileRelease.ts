export const MOBILE_RELEASE = {
	version: "1.2.1",
	apkUrl: "https://github.com/adarsh3699/Bhemu-Campus/releases/download/mobile-v1.2.1/bcampus-mobile-v1.2.1.apk",
	websiteUrl: "https://campus.bhemu.in/",
	releaseNotes: [
		"Added chat notification preferences with batchmate room controls.",
		"Improved push notification delivery reliability on app launch.",
		"Fixed keyboard popping up unexpectedly after closing message actions.",
		"Optimized long-press response time for message interactions.",
	],
	mandatory: true,
} as const;
