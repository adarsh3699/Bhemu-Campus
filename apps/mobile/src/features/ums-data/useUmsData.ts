import { useState, useEffect, useCallback } from "react";
import type { UMSLocalData } from "@bhemu/shared";
import { useGpaData } from "@/contexts/GpaDataContext";
import { getUmsData, subscribeToUmsData } from "./storage";

export function useUmsData() {
	const { activeProfile } = useGpaData();
	const [data, setData] = useState<UMSLocalData | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!activeProfile) {
			setData(null);
			setLoading(false);
			return;
		}
		let cancelled = false;
		let receivedLiveUpdate = false;
		setData(null);
		setLoading(true);
		const unsubscribe = subscribeToUmsData(activeProfile, (result) => {
			receivedLiveUpdate = true;
			if (!cancelled) {
				setData(result);
				setLoading(false);
			}
		});

		getUmsData(activeProfile)
			.then((result) => {
				// A sync can finish while the initial AsyncStorage read is pending.
				// Never let that older read overwrite the live sync result.
				if (!cancelled && !receivedLiveUpdate) setData(result);
			})
			.finally(() => { if (!cancelled) setLoading(false); });
		return () => {
			cancelled = true;
			unsubscribe();
		};
	}, [activeProfile]);

	const refresh = useCallback(() => {
		if (!activeProfile) return Promise.resolve();
		return getUmsData(activeProfile).then(setData);
	}, [activeProfile]);

	return { data, loading, refresh };
}
