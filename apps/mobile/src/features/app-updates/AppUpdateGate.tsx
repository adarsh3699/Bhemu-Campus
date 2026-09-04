import { useCallback, useEffect, useRef, useState } from "react";
import { InteractionManager, Platform } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import AppUpdateDialog from "./AppUpdateDialog";
import { checkForAppUpdate, deferAppUpdate, downloadAndLaunchApk, openInstallPermissionSettings, openUpdateWebsite } from "./service";
import type { AvailableAppUpdate } from "./types";

type UpdateStatus = "available" | "downloading" | "error";

export default function AppUpdateGate() {
	const { authLoading, launchReady, launchUser } = useAuth();
	const [availableUpdate, setAvailableUpdate] = useState<AvailableAppUpdate | null>(null);
	const [status, setStatus] = useState<UpdateStatus | null>(null);
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
		setErrorMessage(null);
		try {
			await downloadAndLaunchApk(availableUpdate.manifest);
			if (mountedRef.current) {
				if (!availableUpdate.manifest.mandatory) {
					// Hide the dialog for optional updates, allowing the user to use the app
					setAvailableUpdate(null);
					setStatus(null);
				}
			}
		} catch (error) {
			if (!mountedRef.current) return;
			setErrorMessage(error instanceof Error ? error.message : "The update could not be started.");
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

	const handleOpenWebsite = useCallback(() => {
		const websiteUrl = availableUpdate?.manifest.websiteUrl;
		if (!websiteUrl) return;
		void openUpdateWebsite(websiteUrl).catch(() => {});
	}, [availableUpdate]);

	return (
		<AppUpdateDialog
			visible={availableUpdate !== null && status !== null}
			manifest={availableUpdate?.manifest ?? null}
			status={status ?? "available"}
			errorMessage={errorMessage}
			onUpdate={() => void handleUpdate()}
			onLater={() => void handleLater()}
			onRetry={handleRetry}
			onOpenSettings={() => void openInstallPermissionSettings().catch(() => {})}
			onOpenWebsite={handleOpenWebsite}
		/>
	);
}
