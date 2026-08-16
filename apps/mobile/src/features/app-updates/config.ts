export const APP_UPDATE_MANIFEST_URL =
	process.env.EXPO_PUBLIC_APP_UPDATE_MANIFEST_URL ?? "https://campus.bhemu.in/mobile/update.json";

export const APP_UPDATE_DEFER_MS = 24 * 60 * 60 * 1000;
export const APP_UPDATE_REQUEST_TIMEOUT_MS = 60_000;
export const APP_UPDATE_DEFERRED_KEY = "@bcampus/app-update-deferred";
