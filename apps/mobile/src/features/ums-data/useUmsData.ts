import { useState, useEffect, useCallback } from "react";
import type { UMSLocalData } from "@bhemu/shared";
import { useGpaData } from "@/contexts/GpaDataContext";
import { getUmsData } from "./storage";

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
		setLoading(true);
		getUmsData(activeProfile)
			.then((result) => { if (!cancelled) setData(result); })
			.finally(() => { if (!cancelled) setLoading(false); });
		return () => { cancelled = true; };
	}, [activeProfile]);

	const refresh = useCallback(() => {
		if (!activeProfile) return Promise.resolve();
		return getUmsData(activeProfile).then(setData);
	}, [activeProfile]);

	return { data, loading, refresh };
}
