import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "@bhemu/shared";

const KEY = STORAGE_KEYS.gpaViewMode;
type ViewMode = "marks" | "grades";

export function useViewMode() {
	const [viewMode, setViewModeState] = useState<ViewMode>("marks");

	useEffect(() => {
		AsyncStorage.getItem(KEY).then((v) => {
			if (v === "marks" || v === "grades") setViewModeState(v);
		}).catch(() => {});
	}, []);

	const setViewMode = (mode: ViewMode) => {
		setViewModeState(mode);
		AsyncStorage.setItem(KEY, mode).catch(() => {});
	};

	return { viewMode, setViewMode };
}
