import { Linking, Platform } from "react-native";
import * as Application from "expo-application";
import * as IntentLauncher from "expo-intent-launcher";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
	APP_UPDATE_DEFER_MS,
	APP_UPDATE_DEFERRED_KEY,
	APP_UPDATE_PENDING_DOWNLOAD_KEY,
	APP_UPDATE_REQUEST_TIMEOUT_MS,
	APP_UPDATE_MANIFEST_URL,
} from "./config";
import { compareVersions, isNewerVersion, parseAppUpdateManifest } from "./version";
import type { AppUpdateManifest, AvailableAppUpdate } from "./types";
import BhemuUpdater from "../../../modules/bhemu-updater";

const APK_MIME_TYPE = "application/vnd.android.package-archive";
const FLAG_GRANT_READ_URI_PERMISSION = 1;
const FLAG_ACTIVITY_NEW_TASK = 268435456;
const INSTALL_PACKAGE_ACTION = "android.intent.action.INSTALL_PACKAGE";
const MAX_PENDING_DOWNLOAD_AGE_MS = 7 * 24 * 60 * 60 * 1000;

interface DeferredUpdate {
	version: string;
	deferredAt: number;
}

interface PendingDownload {
	downloadId: number;
	version: string;
	startedAt: number;
	/** Set after the system installer was opened; cleared only after a retry. */
	installPromptedAt?: number;
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

async function readPendingDownload(): Promise<PendingDownload | null> {
	const raw = await AsyncStorage.getItem(APP_UPDATE_PENDING_DOWNLOAD_KEY);
	if (!raw) return null;

	try {
		const pending = JSON.parse(raw) as PendingDownload;
		if (
			!Number.isSafeInteger(pending.downloadId) ||
			typeof pending.version !== "string" ||
			!Number.isFinite(pending.startedAt) ||
			(pending.installPromptedAt !== undefined && !Number.isFinite(pending.installPromptedAt))
		) {
			throw new Error("Invalid pending download record");
		}
		if (Date.now() - pending.startedAt > MAX_PENDING_DOWNLOAD_AGE_MS) {
			await AsyncStorage.removeItem(APP_UPDATE_PENDING_DOWNLOAD_KEY);
			return null;
		}
		return pending;
	} catch {
		await AsyncStorage.removeItem(APP_UPDATE_PENDING_DOWNLOAD_KEY).catch(() => {});
		return null;
	}
}

async function savePendingDownload(pending: PendingDownload): Promise<void> {
	await AsyncStorage.setItem(APP_UPDATE_PENDING_DOWNLOAD_KEY, JSON.stringify(pending));
}

async function clearPendingDownload(): Promise<void> {
	await AsyncStorage.removeItem(APP_UPDATE_PENDING_DOWNLOAD_KEY);
}

async function hasInstallPermission(): Promise<boolean> {
	// Older already-installed builds do not have this method. They can still
	// use the original installer path, while new builds get the explicit check.
	const canInstall = await BhemuUpdater.canInstallPackages?.();
	return canInstall ?? true;
}

async function ensureInstallPermission(): Promise<void> {
	if (await hasInstallPermission()) return;

	await openInstallPermissionSettings();
	if (!(await hasInstallPermission())) {
		throw new Error("Allow bCampus to install updates, then tap Retry.");
	}
}

async function launchPackageInstaller(uri: string): Promise<void> {
	if (!uri.startsWith("content://")) {
		throw new Error("The downloaded APK is not available through a secure Android URI.");
	}
	if (!(await hasInstallPermission())) {
		throw new Error("Allow bCampus to install updates, then tap Retry.");
	}

	await IntentLauncher.startActivityAsync(INSTALL_PACKAGE_ACTION, {
		data: uri,
		type: APK_MIME_TYPE,
		flags: FLAG_GRANT_READ_URI_PERMISSION | FLAG_ACTIVITY_NEW_TASK,
	});
}

let installerLaunchInProgress = false;

async function handleCompletedDownload(uri: string, pending: PendingDownload): Promise<void> {
	if (installerLaunchInProgress) return;
	installerLaunchInProgress = true;
	const installAttempt = { ...pending, installPromptedAt: Date.now() };
	try {
		// Persist before launching so an AppState transition cannot open a second
		// installer while the first system prompt is still visible.
		await savePendingDownload(installAttempt);
		await launchPackageInstaller(uri);
		// IntentLauncher only confirms that the installer activity opened. Keep the
		// record until the app starts again on the new version, so cancelling the
		// system prompt does not lose the update.
	} catch (error) {
		// A failed launch is retryable. Do not mark it as already prompted.
		await savePendingDownload(pending).catch(() => {});
		throw error;
	} finally {
		installerLaunchInProgress = false;
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
	await ensureInstallPermission();

	// Reuse a completed download after the user cancelled the installer instead
	// of downloading the same APK again. Running downloads are also left alone.
	const existing = await readPendingDownload();
	if (existing?.version === manifest.version) {
		const existingStatus = await BhemuUpdater.getDownloadStatus?.(existing.downloadId);
		if (existingStatus?.status === "successful" && existingStatus.uri) {
			const retry = { ...existing, installPromptedAt: undefined };
			await savePendingDownload(retry);
			await handleCompletedDownload(existingStatus.uri, retry);
			return;
		}
		if (existingStatus?.status === "pending" || existingStatus?.status === "running" || existingStatus?.status === "paused") {
			return;
		}
		await clearPendingDownload();
	}

	const filename = `bcampus-update-v${manifest.version}.apk`;
	const title = "bCampus Update";
	const description = `Downloading version ${manifest.version}`;
	let downloadId: number | null = null;
	let completionHandled = false;
	let pending: PendingDownload | null = null;
	let resolvePendingReady: () => void = () => {};
	const pendingReady = new Promise<void>((resolve) => {
		resolvePendingReady = resolve;
	});
	const subscription = BhemuUpdater.addListener("onDownloadComplete", (event) => {
		// Attach the listener before enqueueing. This avoids missing a cached or
		// very fast DownloadManager completion.
		const currentDownloadId = downloadId;
		if (currentDownloadId === null || event.downloadId !== currentDownloadId || completionHandled) return;
		completionHandled = true;
		subscription.remove();
		void (async () => {
			await pendingReady;
			if (!pending) return;
			await handleCompletedDownload(event.uri, pending);
		})().catch((error) => console.error("Failed to launch package installer", error));
	});

	try {
		downloadId = await BhemuUpdater.downloadApk(manifest.apkUrl, filename, title, description, APK_MIME_TYPE);
		pending = {
			downloadId,
			version: manifest.version,
			startedAt: Date.now(),
		};
		await savePendingDownload(pending);
		resolvePendingReady();

		// A download may already be complete by the time enqueue() returns. The
		// status query closes that small race and also supports resumed installs.
		const status = await BhemuUpdater.getDownloadStatus?.(downloadId);
		if (status?.status === "successful" && status.uri && !completionHandled) {
			completionHandled = true;
			subscription.remove();
			await handleCompletedDownload(status.uri, pending);
		}
	} catch (error) {
		resolvePendingReady();
		subscription.remove();
		throw error;
	}
}

export async function resumePendingApkInstall(): Promise<boolean> {
	if (Platform.OS !== "android") return false;

	const pending = await readPendingDownload();
	if (!pending) return false;
	if (compareVersions(getCurrentVersion(), pending.version) >= 0) {
		await clearPendingDownload();
		return false;
	}

	const status = await BhemuUpdater.getDownloadStatus?.(pending.downloadId);
	if (!status) return false;
	if (status.status === "successful" && status.uri) {
		// Do not reopen the installer on every AppState transition after the user
		// cancelled it. The next explicit Update action clears this marker and
		// retries the same downloaded APK.
		if (pending.installPromptedAt) return false;
		await handleCompletedDownload(status.uri, pending);
		return true;
	}
	if (status.status === "failed") {
		await clearPendingDownload();
	}
	return false;
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
