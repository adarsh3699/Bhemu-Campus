import { useState, useEffect, useCallback } from "react";
import type { UMSLocalData } from "@bhemu/shared";
import { getUmsData } from "./storage";

export function useUmsData() {
	const [data, setData] = useState<UMSLocalData | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		getUmsData().then(setData).finally(() => setLoading(false));
	}, []);

	const refresh = useCallback(() => {
		return getUmsData().then(setData);
	}, []);

	return { data, loading, refresh };
}
