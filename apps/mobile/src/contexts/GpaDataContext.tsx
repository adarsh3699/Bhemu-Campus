import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/contexts/AuthContext";
import { gpaService as createGPAService, LeaderboardService } from "@/firebase/services";
import { STORAGE_KEYS } from "@bhemu/shared";
import { db } from "@/firebase/config";
import type { GPAProfile, GPASemester } from "@bhemu/shared";
import { useMessage } from "@/contexts/MessageContext";

interface GpaDataContextValue {
	profiles: GPAProfile[];
	activeProfile: string | number | null;
	loading: boolean;
	saving: boolean;
	sharedWithMeProfiles: GPAProfile[];
	mySharedProfiles: unknown[];
	allProfiles: GPAProfile[];
	currentProfile: GPAProfile | undefined;
	semesters: GPASemester[];
	isReadOnlyProfile: boolean;

	updateActiveProfile: (profileId: string | number) => void;
	createProfile: (name: string) => Promise<void>;
	deleteProfile: (profileId: string | number) => Promise<void>;
	updateSemesters: (newSemesters: GPASemester[]) => Promise<void>;
	shareProfileWithUser: (
		profileToShare: GPAProfile,
		emailOrAction: string,
		permission: "read" | "edit" | "unshare",
		action?: string
	) => Promise<void>;
	copySharedProfile: (shareId: string, profileName: string) => Promise<void>;
	renameProfile: (profileId: string | number, newName: string) => Promise<void>;
}

const GpaDataContext = createContext<GpaDataContextValue | undefined>(undefined);

export function useGpaData(): GpaDataContextValue {
	const ctx = useContext(GpaDataContext);
	if (!ctx) throw new Error("useGpaData must be used within a GpaDataProvider");
	return ctx;
}

export function GpaDataProvider({ children }: { children: React.ReactNode }) {
	const { currentUser } = useAuth();
	const { showMessage } = useMessage();

	const [profiles, setProfiles] = useState<GPAProfile[]>([]);
	const [activeProfile, setActiveProfile] = useState<string | number | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [sharedWithMeProfiles, setSharedWithMeProfiles] = useState<GPAProfile[]>([]);
	const [mySharedProfiles, setMySharedProfiles] = useState<unknown[]>([]);

	const activeListeners = useRef<Record<string, () => void>>({});
	const isInitializingRef = useRef(false);
	const hasInitializedRef = useRef(false);
	const initializedUserIdRef = useRef<string | null>(null);
	const initialActiveProfileRef = useRef<string | null>(null);
	const creatingDefaultProfileRef = useRef(false);

	const gpaService = useMemo(() => {
		return currentUser ? createGPAService(currentUser.uid) : null;
	}, [currentUser]);

	const sortedProfiles = useMemo(() => {
		return [...profiles].sort((a, b) => {
			if (a.isDefault && !b.isDefault) return -1;
			if (!a.isDefault && b.isDefault) return 1;
			return (a.name || "").localeCompare(b.name || "");
		});
	}, [profiles]);

	const allProfiles = useMemo(() => {
		const combined = [...sortedProfiles, ...sharedWithMeProfiles];
		return combined.sort((a, b) => {
			if (!a.isShared && b.isShared) return -1;
			if (a.isShared && !b.isShared) return 1;
			if (a.isDefault && !b.isDefault) return -1;
			if (!a.isDefault && b.isDefault) return 1;
			return (a.name || "").localeCompare(b.name || "");
		});
	}, [sortedProfiles, sharedWithMeProfiles]);

	const currentProfile = allProfiles.find((p) => p.id === activeProfile) || allProfiles[0];
	const [semesters, setSemesters] = useState<GPASemester[]>([]);
	const isReadOnlyProfile = !!(currentProfile?.isShared && currentProfile?.permission === "read");

	const sortSemesters = useCallback((list: GPASemester[]) => {
		return [...list].sort((a, b) => {
			const numA = parseInt(a.name?.match(/\d+/)?.[0] ?? "0", 10);
			const numB = parseInt(b.name?.match(/\d+/)?.[0] ?? "0", 10);
			if (numA !== numB) return numA - numB;
			return (a.name ?? "").localeCompare(b.name ?? "");
		});
	}, []);

	useEffect(() => {
		if (!gpaService || !activeProfile) return;

		const profile = allProfiles.find((p) => p.id === activeProfile);
		const isSharedProfile = profile?.isShared && profile?.ownerUserId;

		const unsubscribe = isSharedProfile
			? gpaService.onSemestersChangeForUser(profile.ownerUserId!, activeProfile, (result) => {
				setSemesters(result.success ? sortSemesters(result.semesters) : []);
			})
			: gpaService.onSemestersChange(activeProfile, (result) => {
				if (!result.success) { setSemesters([]); return; }
				setSemesters(sortSemesters(result.semesters));
			});

		return () => unsubscribe();
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [gpaService, activeProfile, sortSemesters]);

	const generateProfileName = useCallback(() => {
		return currentUser?.displayName || currentUser?.email?.split("@")[0] || "User";
	}, [currentUser]);

	const updateActiveProfile = useCallback((profileId: string | number) => {
		setActiveProfile(profileId);
		AsyncStorage.setItem(STORAGE_KEYS.activeProfileId, profileId.toString()).catch(() => {});
		const isShared = sharedWithMeProfiles.some((p) => p.id === profileId);
		if (!isShared) gpaService?.updateLastOpened(profileId);
	}, [gpaService, sharedWithMeProfiles]);

	const createProfile = useCallback(async (name: string) => {
		try {
			if (!gpaService) return;
			const profileId = Date.now();
			const newProfile: GPAProfile = { id: profileId, name, isDefault: false };
			await gpaService.saveProfile(newProfile);
			const defaultSemester: GPASemester = {
				id: Date.now().toString(),
				name: "Semester 1",
				subjects: [],
			};
			await gpaService.saveSingleSemester(profileId, defaultSemester);
			updateActiveProfile(profileId);
			showMessage("Profile created successfully!", "success");
		} catch (error) {
			console.error("Error creating profile:", error);
			showMessage("Error creating profile. Please try again.", "error");
		}
	}, [gpaService, updateActiveProfile, showMessage]);

	const deleteProfile = useCallback(async (profileId: string | number) => {
		if (profiles.length <= 1) {
			showMessage("Cannot delete the last profile", "warning");
			return;
		}
		const profileToDelete = profiles.find((p) => p.id === profileId);
		if (!profileToDelete) { showMessage("Profile not found", "error"); return; }
		if (profileToDelete.isDefault) { showMessage("Cannot delete the default profile", "warning"); return; }
		try {
			if (gpaService) {
				await gpaService.deleteProfile(profileId);
				if (activeProfile === profileId) {
					const remaining = sortedProfiles.filter((p) => p.id !== profileId);
					updateActiveProfile(remaining[0].id);
				}
				showMessage("Profile deleted successfully", "success");
			}
		} catch (error) {
			console.error("Error deleting profile:", error);
			showMessage("Error deleting profile. Please try again.", "error");
		}
	}, [profiles, sortedProfiles, activeProfile, updateActiveProfile, gpaService, showMessage]);

	const shareProfileWithUser = useCallback(
		async (profileToShare: GPAProfile, emailOrAction: string, permission: "read" | "edit" | "unshare", action = "share") => {
			if (!gpaService || !profileToShare) return;
			try {
				if (permission === "unshare") {
					const result = await gpaService.unshareProfileWithUser(emailOrAction);
					if (result.success) {
						showMessage("Profile unshared successfully", "success");
						const mySharedResult = await gpaService.getMySharedProfiles();
						if (mySharedResult.success) setMySharedProfiles(mySharedResult.sharedProfiles);
					} else {
						showMessage(result.error || "Error unsharing profile", "error");
					}
					return;
				}
				if (action === "updatePermission") {
					const result = await gpaService.updateSharePermission(emailOrAction, permission as "read" | "edit");
					if (result.success) {
						showMessage(`Permission updated to ${permission === "read" ? "Read Only" : "Edit Access"}`, "success");
						const mySharedResult = await gpaService.getMySharedProfiles();
						if (mySharedResult.success) setMySharedProfiles(mySharedResult.sharedProfiles);
					} else {
						showMessage(result.error || "Error updating permission", "error");
						throw new Error(result.error);
					}
					return;
				}
				const result = await gpaService.shareProfileWithUser(profileToShare.id, emailOrAction, permission as "read" | "edit");
				if (result.success) {
					showMessage(`Profile shared with ${emailOrAction} (${permission} access)`, "success");
					const mySharedResult = await gpaService.getMySharedProfiles();
					if (mySharedResult.success) setMySharedProfiles(mySharedResult.sharedProfiles);
				} else {
					showMessage(result.error || "Error sharing profile", "error");
					throw new Error(result.error);
				}
			} catch (error) {
				console.error("Error in share operation:", error);
				showMessage("Error sharing profile. Please try again.", "error");
				throw error;
			}
		},
		[gpaService, showMessage]
	);

	const copySharedProfile = useCallback(async (shareId: string, profileName: string) => {
		if (!gpaService) return;
		try {
			const result = await gpaService.copySharedProfileToMyAccount(shareId, `Copy of ${profileName}`);
			if (result.success && result.profile) {
				showMessage("Profile copied to your account successfully!", "success");
				updateActiveProfile(result.profile.id);
			} else {
				showMessage(result.error || "Error copying profile", "error");
			}
		} catch (error) {
			console.error("Error copying shared profile:", error);
			showMessage("Error copying profile. Please try again.", "error");
		}
	}, [gpaService, showMessage, updateActiveProfile]);

	const renameProfile = useCallback(async (profileId: string | number, newName: string) => {
		if (!gpaService) return;
		setProfiles((prev) => prev.map((p) => p.id === profileId ? { ...p, name: newName } : p));
		try {
			await gpaService.renameProfile(profileId, newName);
			if (currentUser) {
				LeaderboardService.updateDisplayName(db, currentUser.uid, String(profileId), newName)
					.catch((err) => console.error("Failed to sync leaderboard name:", err));
			}
		} catch (error) {
			console.error("Error renaming profile:", error);
			showMessage("Error renaming profile. Please try again.", "error");
		}
	}, [gpaService, showMessage, currentUser]);

	const updateSemesters = useCallback(async (newSemesters: GPASemester[]) => {
		if (!gpaService || !activeProfile) return;
		try {
			setSaving(true);
			setSemesters(newSemesters);
			const profile = allProfiles.find((p) => p.id === activeProfile);
			if (profile?.isShared && profile.permission === "edit" && profile.ownerUserId) {
				await gpaService.saveProfileWithCollaboration({ ...profile, semesters: newSemesters });
			} else {
				await gpaService.saveSemesters(activeProfile, newSemesters);
			}
		} catch (error) {
			console.error("Error updating semesters:", error);
			showMessage("Error saving data. Please try again.", "error");
		} finally {
			setSaving(false);
		}
	}, [gpaService, activeProfile, allProfiles, showMessage]);

	// ===== INITIALIZATION & LISTENERS =====
	useEffect(() => {
		if (currentUser && initializedUserIdRef.current !== currentUser.uid) {
			hasInitializedRef.current = false;
			isInitializingRef.current = false;
			initializedUserIdRef.current = currentUser.uid;
		}
		if (!gpaService || !currentUser || hasInitializedRef.current) return;
		if (isInitializingRef.current) return;

		setLoading(true);
		isInitializingRef.current = true;

		let profilesUnsubscribe: (() => void) | null = null;
		let cleanupCollaborativeListeners: (() => void) | null = null;

		const loadShares = async () => {
			try {
				const [sharedWithMeResult, mySharedResult] = await Promise.all([
					gpaService.getSharedWithMeProfiles(),
					gpaService.getMySharedProfiles(),
				]);
				if (sharedWithMeResult.success) setSharedWithMeProfiles(sharedWithMeResult.sharedProfiles);
				if (mySharedResult.success) setMySharedProfiles(mySharedResult.sharedProfiles);
			} catch (error) {
				console.error("Error loading shared profiles:", error);
			}
		};

		const setupRealtimeListeners = () => {
			profilesUnsubscribe = gpaService.onProfilesChange(async (result) => {
				if (result.success) {
					const currentProfiles = result.profiles;
					if (currentProfiles.length === 0) {
						let isDeleting = false;
						try { isDeleting = !!(await AsyncStorage.getItem(STORAGE_KEYS.accountDeleting)); } catch { /* intentionally swallowed */ }
						if (isDeleting || creatingDefaultProfileRef.current) return;
						creatingDefaultProfileRef.current = true;
						try {
							const profileId = Date.now();
							const defaultProfile: GPAProfile = {
								id: profileId,
								name: generateProfileName(),
								isDefault: true,
								createdAt: new Date(),
							};
							await gpaService.saveProfile(defaultProfile);
							await gpaService.saveSingleSemester(profileId, {
								id: Date.now().toString(),
								name: "Semester 1",
								subjects: [],
							});
						} finally {
							creatingDefaultProfileRef.current = false;
						}
						return;
					}

					const cleanProfiles = currentProfiles.map((p) => ({ ...p, id: p.id.toString() }));
					setProfiles(cleanProfiles);
					setActiveProfile((prev) => {
						if (prev && cleanProfiles.find((p) => p.id === prev)) return prev;
						const savedId = initialActiveProfileRef.current;
						if (savedId && cleanProfiles.find((p) => p.id === savedId)) return savedId;
						const def = cleanProfiles.find((p) => p.isDefault);
						if (def) return def.id;
						if (cleanProfiles.length > 0) return cleanProfiles[0].id;
						return prev;
					});
				} else if (result.error) {
					console.error("Error loading profiles:", result.error);
					showMessage("Error loading profiles. Please refresh.", "error");
				}
				setLoading(false);
			});

			const incomingSharesUnsubscribe = gpaService.onIncomingSharesChange((result) => {
				if (result.success) {
					gpaService.getSharedWithMeProfiles().then((res) => {
						if (res.success) setSharedWithMeProfiles(res.sharedProfiles);
					});
				}
			});
			return () => { incomingSharesUnsubscribe?.(); };
		};

		const initializeData = async () => {
			try {
				let savedActiveId: string | null = null;
				try { savedActiveId = await AsyncStorage.getItem(STORAGE_KEYS.activeProfileId); } catch { /* intentionally swallowed */ }
				if (savedActiveId) {
					initialActiveProfileRef.current = savedActiveId;
					setActiveProfile(savedActiveId);
				}
				loadShares();
				return setupRealtimeListeners();
			} catch (error) {
				console.error("Initialization error:", error);
				showMessage("Error loading your data. Please try again.", "error");
				setLoading(false);
			} finally {
				isInitializingRef.current = false;
				hasInitializedRef.current = true;
			}
		};

		initializeData().then((cleanup) => {
			cleanupCollaborativeListeners = cleanup || null;
		});

		return () => {
			profilesUnsubscribe?.();
			cleanupCollaborativeListeners?.();
			hasInitializedRef.current = false;
			isInitializingRef.current = false;
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentUser, gpaService]);

	// Reset on logout
	useEffect(() => {
		if (!currentUser) {
			setProfiles([]);
			setActiveProfile(null);
			setLoading(true);
			setSaving(false);
			setSharedWithMeProfiles([]);
			setMySharedProfiles([]);
			hasInitializedRef.current = false;
			isInitializingRef.current = false;
			initializedUserIdRef.current = null;
			Object.values(activeListeners.current).forEach((u) => { if (typeof u === "function") u(); });
			activeListeners.current = {};
		}
	}, [currentUser]);

	// Collaborative listeners for edit-permission shared profiles
	useEffect(() => {
		if (!currentUser || !gpaService) return;
		sharedWithMeProfiles.forEach((profile) => {
			if (profile.permission === "edit" && !activeListeners.current[profile.id]) {
				const ownerId = profile.ownerUserId || "";
				const unsubscribe = gpaService.onCollaborativeProfileChange(profile.id, ownerId, (result) => {
					if (result.success && result.profile) {
						setSharedWithMeProfiles((prev) => {
							const index = prev.findIndex((p) => p.id === profile.id);
							if (index === -1) return prev;
							const updated = result.profile!;
							const updatedAtObj = updated.updatedAt as { toMillis?: () => number } | null | undefined;
							const oldAtObj = prev[index].updatedAt as { toMillis?: () => number } | null | undefined;
							const newTime = updatedAtObj?.toMillis ? updatedAtObj.toMillis() : updated.updatedAt;
							const oldTime = oldAtObj?.toMillis ? oldAtObj.toMillis() : prev[index].updatedAt;
							if (newTime && oldTime && newTime === oldTime) return prev;
							const next = [...prev];
							next[index] = { ...updated, isShared: true, permission: "edit", ownerUserId: ownerId };
							return next;
						});
					}
				});
				activeListeners.current[profile.id] = unsubscribe;
			}
		});
		const currentIds = new Set(sharedWithMeProfiles.map((p) => p.id));
		Object.keys(activeListeners.current).forEach((id) => {
			if (!currentIds.has(id)) {
				if (typeof activeListeners.current[id] === "function") activeListeners.current[id]();
				delete activeListeners.current[id];
			}
		});
	}, [sharedWithMeProfiles, currentUser, gpaService]);

	useEffect(() => {
		return () => {
			Object.values(activeListeners.current).forEach((u) => { if (typeof u === "function") u(); });
			activeListeners.current = {};
		};
	}, []);

	useEffect(() => {
		const savedActiveId = initialActiveProfileRef.current;
		if (savedActiveId && sharedWithMeProfiles.find((p) => p.id === savedActiveId)) {
			setActiveProfile(savedActiveId);
		}
	}, [sharedWithMeProfiles]);

	const value = useMemo<GpaDataContextValue>(
		() => ({
			profiles, activeProfile, loading, saving,
			sharedWithMeProfiles, mySharedProfiles, allProfiles,
			currentProfile, semesters, isReadOnlyProfile,
			updateActiveProfile, createProfile, deleteProfile, updateSemesters,
			shareProfileWithUser, copySharedProfile, renameProfile,
		}),
		[
			profiles, activeProfile, loading, saving,
			sharedWithMeProfiles, mySharedProfiles, allProfiles,
			currentProfile, semesters, isReadOnlyProfile,
			updateActiveProfile, createProfile, deleteProfile, updateSemesters,
			shareProfileWithUser, copySharedProfile, renameProfile,
		]
	);

	return <GpaDataContext.Provider value={value}>{children}</GpaDataContext.Provider>;
}
