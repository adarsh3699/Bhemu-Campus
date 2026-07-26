import { useState, useCallback } from "react";
import { Modal } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/contexts/AuthContext";
import { useGpaData } from "@/contexts/GpaDataContext";
import { db } from "@/firebase/config";
import UMSLoginWebView from "@/features/sync/UMSLoginWebView";
import { writeToFirestore } from "@/features/sync/syncCoordinator";
import type { UMSSyncResult } from "@bhemu/firebase";

const LAST_SYNC_KEY = "ums_last_sync";

export default function SyncTab() {
	const { currentUser } = useAuth();
	const { activeProfile } = useGpaData();
	const router = useRouter();

	const [showWebView, setShowWebView] = useState(false);

	useFocusEffect(
		useCallback(() => {
			setShowWebView(true);
		}, [])
	);

	const handleClose = useCallback(() => {
		setShowWebView(false);
		router.replace("/(app)/(tabs)/");
	}, [router]);

	const handleSyncData = useCallback(
		async (data: UMSSyncResult) => {
			if (!currentUser || !activeProfile) return;
			try {
				await writeToFirestore(data, activeProfile, db, currentUser.uid);
				await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
			} catch {}
		},
		[currentUser, activeProfile]
	);

	return (
		<Modal visible={showWebView} animationType="slide" onRequestClose={handleClose}>
			<UMSLoginWebView
				onSyncData={handleSyncData}
				onProgress={() => {}}
				onError={() => {}}
				onClose={handleClose}
			/>
		</Modal>
	);
}
