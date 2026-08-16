import { useCallback, useEffect, useRef, useState } from "react";
import { InteractionManager, Platform } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import AppUpdateDialog from "./AppUpdateDialog";
import { checkForAppUpdate, deferAppUpdate, downloadAndLaunchApk, openInstallPermissionSettings } from "./service";
import type { AvailableAppUpdate, DownloadProgress } from "./types";

type UpdateStatus = "available" | "downloading" | "error";

export default function AppUpdateGate() {
	const { authLoading, launchReady, launchUser } = useAuth();
	const [availableUpdate, setAvailableUpdate] = useState<AvailableAppUpdate | null>(null);
	const [status, setStatus] = useState<UpdateStatus | null>(null);
	const [progress, setProgress] = useState<DownloadProgress | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const mountedRef = useRef(true);

	useEffect(() => () => {
		mountedRef.current = false;
	}, []);

	const check = useCallback(async () => {
		try {
			const update = await checkForAppUpdate();
			if (mountedRef.current && update) {
				setAvailableUpdate(update);
				setStatus("available");
			}
		} catch {
			// An update check is best-effort. Offline launches must continue normally.
		}
	}, []);

	useEffect(() => {
		if (__DEV__ || Platform.OS !== "android" || !launchReady || (authLoading && !launchUser)) return;

		const task = InteractionManager.runAfterInteractions(() => {
			void check();
		});
		return () => task.cancel();
	}, [authLoading, check, launchReady, launchUser]);

	const handleUpdate = useCallback(async () => {
		if (!availableUpdate) return;
		setStatus("downloading");
		setProgress(null);
		setErrorMessage(null);
		try {
			await downloadAndLaunchApk(availableUpdate.manifest, setProgress);
			if (mountedRef.current) {
				// The installer owns the next step. Re-check on the next app launch rather
				// than trapping the user behind a completed download dialog.
				setAvailableUpdate(null);
				setStatus(null);
			}
		} catch (error) {
			if (!mountedRef.current) return;
			setErrorMessage(error instanceof Error ? error.message : "The update could not be installed.");
			setStatus("error");
		}
	}, [availableUpdate]);

	const handleLater = useCallback(async () => {
		if (!availableUpdate || availableUpdate.manifest.mandatory) return;
		await deferAppUpdate(availableUpdate.manifest).catch(() => {});
		if (!mountedRef.current) return;
		setAvailableUpdate(null);
		setStatus(null);
	}, [availableUpdate]);

	const handleRetry = useCallback(() => {
		void handleUpdate();
	}, [handleUpdate]);

	return (
		<AppUpdateDialog
			visible={availableUpdate !== null && status !== null}
			manifest={availableUpdate?.manifest ?? null}
			progress={progress}
			status={status ?? "available"}
			errorMessage={errorMessage}
			onUpdate={() => void handleUpdate()}
			onLater={() => void handleLater()}
			onRetry={handleRetry}
			onOpenSettings={() => void openInstallPermissionSettings().catch(() => {})}
		/>
	);
}
