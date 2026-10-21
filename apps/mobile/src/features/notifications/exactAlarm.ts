import * as Application from "expo-application";
import * as IntentLauncher from "expo-intent-launcher";
import { Linking, Platform } from "react-native";

const ANDROID_EXACT_ALARM_MIN_VERSION = 31;

export function supportsAndroidExactAlarmSettings(): boolean {
	return Platform.OS === "android" && Number(Platform.Version) >= ANDROID_EXACT_ALARM_MIN_VERSION;
}

/**
 * Opens Android's per-app "Alarms & reminders" access screen.
 *
 * Android keeps this as special access, separate from normal notification
 * permission. The setting is intentionally opened only after an explicit tap.
 */
export async function openExactAlarmSettings(): Promise<boolean> {
	if (!supportsAndroidExactAlarmSettings()) return false;

	const packageId = Application.applicationId;
	if (!packageId) return false;

	try {
		await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.REQUEST_SCHEDULE_EXACT_ALARM, {
			data: `package:${packageId}`,
		});
		return true;
	} catch {
		// A few OEM Settings apps do not implement the Android 12 deep link.
		// Fall back to the app details page instead of leaving the user stuck.
		try {
			await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS, {
				data: `package:${packageId}`,
			});
			return true;
		} catch {
			try {
				await Linking.openSettings();
				return true;
			} catch {
				return false;
			}
		}
	}
}
