import { useState, useEffect, useCallback } from "react";
import type { UMSLocalData } from "@bhemu/shared";
import { useGpaProfiles } from "@/contexts/GpaDataContext";
import { getUmsData, subscribeToUmsData } from "./storage";

export function useUmsData() {
	const { activeProfile } = useGpaProfiles();
	const [data, setData] = useState<UMSLocalData | null>(null);
	const [loading, setLoading] = useState(true);
	const [dataProfileId, setDataProfileId] = useState<string | null>(null);
	const activeProfileKey = activeProfile == null ? null : String(activeProfile);

	useEffect(() => {
		if (!activeProfile || !activeProfileKey) return;
		let cancelled = false;
		let receivedLiveUpdate = false;
		const unsubscribe = subscribeToUmsData(activeProfile, (result) => {
			receivedLiveUpdate = true;
			if (!cancelled) {
				setData(result);
				setDataProfileId(activeProfileKey);
				setLoading(false);
			}
		});

		getUmsData(activeProfile)
			.then((result) => {
				// A sync can finish while the initial AsyncStorage read is pending.
				// Never let that older read overwrite the live sync result.
				if (!cancelled && !receivedLiveUpdate) {
					setData(result);
					setDataProfileId(activeProfileKey);
				}
			})
			.finally(() => { if (!cancelled) setLoading(false); });
		return () => {
			cancelled = true;
			unsubscribe();
		};
	}, [activeProfile, activeProfileKey]);

	const refresh = useCallback(() => {
		if (!activeProfile) return Promise.resolve();
		const profileKey = String(activeProfile);
		return getUmsData(activeProfile).then((result) => {
			setData(result);
			setDataProfileId(profileKey);
		});
	}, [activeProfile]);

	return {
		data: activeProfileKey && dataProfileId === activeProfileKey ? data : null,
		loading: !!activeProfileKey && (loading || dataProfileId !== activeProfileKey),
		refresh,
	};
}
