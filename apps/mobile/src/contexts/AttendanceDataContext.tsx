import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { attendanceService as createAttendanceService } from "@/firebase/services";
import type { AttendanceService } from "@bhemu/firebase";
import { useGpaData } from "@/contexts/GpaDataContext";
import { useMessage } from "@/contexts/MessageContext";
import type { AttendanceSubject, AttendanceData } from "@bhemu/shared";

interface AttendanceDataContextValue {
	attendanceData: AttendanceData | null;
	loading: boolean;
	saving: boolean;
	addOrUpdateSubject: (subject: AttendanceSubject) => Promise<void>;
	deleteSubject: (subjectId: string) => Promise<void>;
	updateDefaultThreshold: (threshold: number) => Promise<void>;
}

const AttendanceDataContext = createContext<AttendanceDataContextValue | undefined>(undefined);

export function useAttendanceData(): AttendanceDataContextValue {
	const ctx = useContext(AttendanceDataContext);
	if (!ctx) throw new Error("useAttendanceData must be used within AttendanceDataProvider");
	return ctx;
}

export function AttendanceDataProvider({ children }: { children: React.ReactNode }) {
	const { currentUser } = useAuth();
	const { activeProfile, currentProfile } = useGpaData();
	const { showMessage } = useMessage();

	const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(null);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);

	const serviceRef = useRef<AttendanceService | null>(null);
	const unsubscribeRef = useRef<(() => void) | null>(null);

	useEffect(() => {
		serviceRef.current = currentUser ? createAttendanceService(currentUser.uid) : null;
	}, [currentUser]);

	// ownerUserId is only set for shared profiles — attendance doc lives under the owner's path
	const ownerUserId = currentProfile?.isShared ? currentProfile.ownerUserId : undefined;

	useEffect(() => {
		if (unsubscribeRef.current) {
			unsubscribeRef.current();
			unsubscribeRef.current = null;
		}
		if (!serviceRef.current || !activeProfile) {
			setAttendanceData(null);
			return;
		}
		setLoading(true);
		const unsub = serviceRef.current.onAttendanceChange(activeProfile, (data) => {
			setAttendanceData(data);
			setLoading(false);
		}, ownerUserId);
		unsubscribeRef.current = unsub;
		return () => {
			unsub();
			unsubscribeRef.current = null;
		};
	}, [activeProfile, ownerUserId]);

	const addOrUpdateSubject = useCallback(
		async (subject: AttendanceSubject) => {
			if (!serviceRef.current || !activeProfile) return;
			setSaving(true);
			try {
				await serviceRef.current.saveSubject(activeProfile, subject, ownerUserId);
			} catch {
				showMessage("Failed to save attendance. Please try again.", "error");
			} finally {
				setSaving(false);
			}
		},
		[activeProfile, ownerUserId, showMessage]
	);

	const deleteSubject = useCallback(
		async (subjectId: string) => {
			if (!serviceRef.current || !activeProfile) return;
			setSaving(true);
			try {
				await serviceRef.current.deleteSubject(activeProfile, subjectId, ownerUserId);
			} catch {
				showMessage("Failed to delete subject. Please try again.", "error");
			} finally {
				setSaving(false);
			}
		},
		[activeProfile, ownerUserId, showMessage]
	);

	const updateDefaultThreshold = useCallback(
		async (threshold: number) => {
			if (!serviceRef.current || !activeProfile) return;
			setSaving(true);
			try {
				await serviceRef.current.updateDefaultThreshold(activeProfile, threshold, ownerUserId);
			} catch {
				showMessage("Failed to update threshold. Please try again.", "error");
			} finally {
				setSaving(false);
			}
		},
		[activeProfile, ownerUserId, showMessage]
	);

	const value = useMemo<AttendanceDataContextValue>(
		() => ({ attendanceData, loading, saving, addOrUpdateSubject, deleteSubject, updateDefaultThreshold }),
		[attendanceData, loading, saving, addOrUpdateSubject, deleteSubject, updateDefaultThreshold]
	);

	return <AttendanceDataContext.Provider value={value}>{children}</AttendanceDataContext.Provider>;
}
