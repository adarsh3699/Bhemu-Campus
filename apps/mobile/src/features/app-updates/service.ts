import { Linking, Platform } from "react-native";
import * as Application from "expo-application";
import * as IntentLauncher from "expo-intent-launcher";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
	APP_UPDATE_DEFER_MS,
	APP_UPDATE_DEFERRED_KEY,
	APP_UPDATE_REQUEST_TIMEOUT_MS,
	APP_UPDATE_MANIFEST_URL,
} from "./config";
import { isNewerVersion, parseAppUpdateManifest } from "./version";
import type { AppUpdateManifest, AvailableAppUpdate } from "./types";
import BhemuUpdater from "../../../modules/bhemu-updater";

const APK_MIME_TYPE = "application/vnd.android.package-archive";
const FLAG_GRANT_READ_URI_PERMISSION = 1;
const INSTALL_PACKAGE_ACTION = "android.intent.action.INSTALL_PACKAGE";

interface DeferredUpdate {
	version: string;
	deferredAt: number;
}

function getCurrentVersion(): string {
	return Application.nativeApplicationVersion ?? "0.0.0";
}

async function fetchWithTimeout(url: string): Promise<Response> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), APP_UPDATE_REQUEST_TIMEOUT_MS);
	try {
		const separator = url.includes("?") ? "&" : "?";
		return await fetch(`${url}${separator}t=${Date.now()}`, {
			headers: { Accept: "application/json", "Cache-Control": "no-cache" },
			signal: controller.signal,
		});
	} finally {
		clearTimeout(timeout);
	}
}

async function wasDeferred(manifest: AppUpdateManifest): Promise<boolean> {
	if (manifest.mandatory) return false;
	const raw = await AsyncStorage.getItem(APP_UPDATE_DEFERRED_KEY);
	if (!raw) return false;

	try {
		const deferred = JSON.parse(raw) as DeferredUpdate;
		return deferred.version === manifest.version && Date.now() - deferred.deferredAt < APP_UPDATE_DEFER_MS;
	} catch {
		await AsyncStorage.removeItem(APP_UPDATE_DEFERRED_KEY).catch(() => {});
		return false;
	}
}

export async function checkForAppUpdate(): Promise<AvailableAppUpdate | null> {
	if (Platform.OS !== "android") return null;

	const response = await fetchWithTimeout(APP_UPDATE_MANIFEST_URL);
	if (!response.ok) throw new Error(`Update check failed with HTTP ${response.status}.`);

	const manifest = parseAppUpdateManifest(await response.json());
	const current = getCurrentVersion();
	if (!isNewerVersion(current, manifest)) return null;
	if (!manifest.apkUrl) throw new Error("The update manifest has no APK URL.");
	if (await wasDeferred(manifest)) return null;

	return { manifest };
}

export async function deferAppUpdate(manifest: AppUpdateManifest): Promise<void> {
	await AsyncStorage.setItem(
		APP_UPDATE_DEFERRED_KEY,
		JSON.stringify({ version: manifest.version, deferredAt: Date.now() } satisfies DeferredUpdate)
	);
}

export async function openUpdateWebsite(url: string): Promise<void> {
	if (!/^https:\/\//i.test(url)) throw new Error("The update website URL must use HTTPS.");
	await Linking.openURL(url);
}

export async function downloadAndLaunchApk(
	manifest: AppUpdateManifest
): Promise<void> {
	if (Platform.OS !== "android") throw new Error("APK updates are only available on Android.");
	
	const filename = `bcampus-update-v${manifest.version}.apk`;
	const title = "bCampus Update";
	const description = `Downloading version ${manifest.version}`;
	const downloadId = await BhemuUpdater.downloadApk(manifest.apkUrl, filename, title, description, APK_MIME_TYPE);
	
	const subscription = BhemuUpdater.addListener('onDownloadComplete', async (event) => {
		if (event.downloadId === downloadId) {
			subscription.remove();
			try {
				await IntentLauncher.startActivityAsync(INSTALL_PACKAGE_ACTION, {
					data: event.uri,
					type: APK_MIME_TYPE,
					flags: FLAG_GRANT_READ_URI_PERMISSION,
				});
			} catch (e) {
				console.error("Failed to launch package installer", e);
			}
		}
	});
}

export async function openInstallPermissionSettings(): Promise<void> {
	if (Platform.OS !== "android") return;
	const packageId = Application.applicationId;
	try {
		await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.MANAGE_UNKNOWN_APP_SOURCES, {
			data: packageId ? `package:${packageId}` : undefined,
		});
	} catch {
		await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.SECURITY_SETTINGS);
	}
}
