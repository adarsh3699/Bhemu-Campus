import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/contexts/AuthContext";
import { gpaService as createGPAService, LeaderboardService } from "@/firebase/services";
import { STORAGE_KEYS, sortSemesters } from "@bhemu/shared";
import { db } from "@/firebase/config";
import type { GPAProfile, GPASemester } from "@bhemu/shared";
import type { ShareData } from "@bhemu/firebase";
import { useMessage } from "@/contexts/MessageContext";
import { readGpaCache, writeGpaCache } from "@/features/gpa-data/cache";
import { markStartup } from "@/features/startup/performance";

interface GpaDataState {
	profiles: GPAProfile[];
	activeProfile: string | number | null;
	loading: boolean;
	isHydrated: boolean;
	isRefreshing: boolean;
	saving: boolean;
	sharedWithMeProfiles: GPAProfile[];
	mySharedProfiles: ShareData[];
	allProfiles: GPAProfile[];
	currentProfile: GPAProfile | undefined;
	semesters: GPASemester[];
	isReadOnlyProfile: boolean;
	/** profileId (string) → incoming shareId — use this to copy a shared profile */
	sharedWithMeShareIds: Record<string, string>;

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

type GpaProfileContextValue = Pick<
	GpaDataState,
	| "profiles"
	| "activeProfile"
	| "loading"
	| "isHydrated"
	| "isRefreshing"
	| "sharedWithMeProfiles"
	| "mySharedProfiles"
	| "allProfiles"
	| "currentProfile"
	| "isReadOnlyProfile"
	| "sharedWithMeShareIds"
	| "updateActiveProfile"
	| "createProfile"
	| "deleteProfile"
	| "shareProfileWithUser"
	| "copySharedProfile"
	| "renameProfile"
>;
type GpaSemesterContextValue = Pick<GpaDataState, "semesters" | "saving" | "updateSemesters">;

const GpaProfilesContext = createContext<GpaProfileContextValue | undefined>(undefined);
const GpaSemestersContext = createContext<GpaSemesterContextValue | undefined>(undefined);
const EMPTY_PROFILES: GPAProfile[] = [];
const EMPTY_SHARED_DATA: ShareData[] = [];
const EMPTY_SEMESTERS: GPASemester[] = [];
const EMPTY_SHARE_IDS: Record<string, string> = {};

const profileIdKey = (profileId: string | number | null | undefined): string | null =>
	profileId == null ? null : String(profileId);

export function useGpaProfiles(): GpaProfileContextValue {
	const ctx = useContext(GpaProfilesContext);
	if (!ctx) throw new Error("useGpaProfiles must be used within a GpaDataProvider");
	return ctx;
}

export function useGpaSemesters(): GpaSemesterContextValue {
	const ctx = useContext(GpaSemestersContext);
	if (!ctx) throw new Error("useGpaSemesters must be used within a GpaDataProvider");
	return ctx;
}

export function GpaDataProvider({ children }: { children: React.ReactNode }) {
	const { currentUser, launchUser } = useAuth();
	const { showMessage } = useMessage();
	const dataUserId = currentUser?.uid ?? launchUser?.uid ?? null;

	const [profiles, setProfiles] = useState<GPAProfile[]>([]);
	const [activeProfile, setActiveProfile] = useState<string | number | null>(null);
	const [loading, setLoading] = useState(true);
	const [isHydrated, setIsHydrated] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(true);
	const [saving, setSaving] = useState(false);
	const [sharedWithMeProfiles, setSharedWithMeProfiles] = useState<GPAProfile[]>([]);
	const [mySharedProfiles, setMySharedProfiles] = useState<ShareData[]>([]);
	const [sharedWithMeShareIds, setSharedWithMeShareIds] = useState<Record<string, string>>({});

	const activeListeners = useRef<Record<string, () => void>>({});
	const isInitializingRef = useRef(false);
	const hasInitializedRef = useRef(false);
	const initializedUserIdRef = useRef<string | null>(null);
	const initialActiveProfileRef = useRef<string | null>(null);

	const semestersCacheRef = useRef<Record<string, GPASemester[]>>({});
	const hasReceivedRemoteProfilesRef = useRef(false);
	const hasReceivedOutgoingSharesRef = useRef(false);
	const hydratedCacheUserIdRef = useRef<string | null>(null);
	const hasCachedDataRef = useRef(false);

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

	const currentProfile = allProfiles.find((p) => profileIdKey(p.id) === profileIdKey(activeProfile)) || allProfiles[0];
	const [semesters, setSemesters] = useState<GPASemester[]>([]);
	const isReadOnlyProfile = !!(currentProfile?.isShared && currentProfile?.permission === "read");

	useEffect(() => {
		if (!dataUserId || initializedUserIdRef.current !== dataUserId || !activeProfile) {
			setSemesters([]);
			return;
		}

		const cachedSemesters = semestersCacheRef.current[String(activeProfile)];
		if (cachedSemesters) setSemesters(cachedSemesters);
		if (!gpaService) return;

		const profile = allProfiles.find((p) => p.id === activeProfile);
		const isSharedProfile = profile?.isShared && profile?.ownerUserId;

		const unsubscribe = isSharedProfile
			? gpaService.onSemestersChangeForUser(profile.ownerUserId!, activeProfile, (result) => {
				const next = result.success ? sortSemesters(result.semesters) : [];
				semestersCacheRef.current[String(activeProfile)] = next;
				setSemesters(next);
			})
			: gpaService.onSemestersChange(activeProfile, (result) => {
				const next = result.success ? sortSemesters(result.semesters) : [];
				semestersCacheRef.current[String(activeProfile)] = next;
				setSemesters(next);
			});

		return () => unsubscribe();
	}, [gpaService, activeProfile, allProfiles, dataUserId]);



	const updateActiveProfile = useCallback((profileId: string | number) => {
		const normalizedId = String(profileId);
		setActiveProfile(normalizedId);
		AsyncStorage.setItem(STORAGE_KEYS.activeProfileId, normalizedId).catch(() => {});
		const isShared = sharedWithMeProfiles.some((p) => profileIdKey(p.id) === normalizedId);
		if (!isShared) gpaService?.updateLastOpened(normalizedId);
	}, [gpaService, sharedWithMeProfiles]);

	const createProfile = useCallback(async (name: string) => {
		try {
			if (!gpaService) return;
			const defaultSemester: GPASemester = {
				id: Date.now().toString(),
				name: "Semester 1",
				subjects: [],
			};
			const result = await gpaService.createProfile(
				{ name, isDefault: false },
				[defaultSemester]
			);
			if (result.success && result.profile) {
				updateActiveProfile(result.profile.id);
			} else {
				showMessage(result.error || "Error creating profile.", "error");
			}
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
		const profileToDelete = profiles.find((p) => profileIdKey(p.id) === profileIdKey(profileId));
		if (!profileToDelete) { showMessage("Profile not found", "error"); return; }
		if (profileToDelete.isDefault) { showMessage("Cannot delete the default profile", "warning"); return; }
		try {
			if (gpaService) {
				await gpaService.deleteProfile(profileId);
				if (profileIdKey(activeProfile) === profileIdKey(profileId)) {
					const remaining = sortedProfiles.filter((p) => profileIdKey(p.id) !== profileIdKey(profileId));
					if (remaining.length > 0) updateActiveProfile(remaining[0].id);
				}
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
						throw Object.assign(new Error(result.error), { handled: true });
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
					throw Object.assign(new Error(result.error), { handled: true });
				}
			} catch (error) {
				if (error && typeof error === "object" && "handled" in error) throw error;
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
			const profile = allProfiles.find((p) => p.id === profileId);
			const ownerUserId = profile?.isShared ? profile.ownerUserId : undefined;
			await gpaService.renameProfile(profileId, newName, ownerUserId);
			if (currentUser && !profile?.isShared) {
				LeaderboardService.updateDisplayName(db, currentUser.uid, String(profileId), newName)
					.catch((err) => console.error("Failed to sync leaderboard name:", err));
			}
		} catch (error) {
			console.error("Error renaming profile:", error);
			showMessage("Error renaming profile. Please try again.", "error");
		}
	}, [gpaService, allProfiles, showMessage, currentUser]);

	const updateSemesters = useCallback(async (newSemesters: GPASemester[]) => {
		if (!gpaService || !activeProfile) return;
		try {
			setSaving(true);
			semestersCacheRef.current[String(activeProfile)] = newSemesters;
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

	useEffect(() => {
		if (!currentUser || initializedUserIdRef.current !== currentUser.uid || !isHydrated) return;
		const timer = setTimeout(() => {
			void writeGpaCache(currentUser.uid, {
				activeProfile: activeProfile == null ? null : String(activeProfile),
				profiles,
				sharedWithMeProfiles,
				mySharedProfiles,
				sharedWithMeShareIds,
				semestersByProfile: semestersCacheRef.current,
			});
		}, 150);
		return () => clearTimeout(timer);
	}, [
		currentUser,
		isHydrated,
		activeProfile,
		semesters,
		profiles,
		sharedWithMeProfiles,
		mySharedProfiles,
		sharedWithMeShareIds,
	]);

	// During account transitions, keep the previous account's state out of the
	// render tree until the new provider instance has started hydration.
	const stateReadyForCurrentUser = !!dataUserId && initializedUserIdRef.current === dataUserId;
	const visibleProfiles = useMemo(() => stateReadyForCurrentUser ? profiles : EMPTY_PROFILES, [stateReadyForCurrentUser, profiles]);
	const visibleActiveProfile = stateReadyForCurrentUser ? activeProfile : null;
	const visibleSharedWithMeProfiles = useMemo(
		() => stateReadyForCurrentUser ? sharedWithMeProfiles : EMPTY_PROFILES,
		[stateReadyForCurrentUser, sharedWithMeProfiles]
	);
	const visibleMySharedProfiles = useMemo(
		() => stateReadyForCurrentUser ? mySharedProfiles : EMPTY_SHARED_DATA,
		[stateReadyForCurrentUser, mySharedProfiles]
	);
	const visibleAllProfiles = useMemo(
		() => stateReadyForCurrentUser ? allProfiles : EMPTY_PROFILES,
		[stateReadyForCurrentUser, allProfiles]
	);
	const visibleCurrentProfile = stateReadyForCurrentUser ? currentProfile : undefined;
	const visibleSemesters = useMemo(
		() => stateReadyForCurrentUser ? semesters : EMPTY_SEMESTERS,
		[stateReadyForCurrentUser, semesters]
	);
	const visibleIsReadOnlyProfile = stateReadyForCurrentUser && isReadOnlyProfile;
	const visibleSharedWithMeShareIds = useMemo(
		() => stateReadyForCurrentUser ? sharedWithMeShareIds : EMPTY_SHARE_IDS,
		[stateReadyForCurrentUser, sharedWithMeShareIds]
	);

	// Cache hydration is independent from Firebase auth and Firestore. A
	// returning user can therefore render cached Home while the auth listener
	// and realtime listeners are still starting.
	useEffect(() => {
		if (!dataUserId || hydratedCacheUserIdRef.current === dataUserId) return;
		hydratedCacheUserIdRef.current = dataUserId;
		let cancelled = false;

		void readGpaCache(dataUserId).then((cache) => {
			if (cancelled) return;
			hasCachedDataRef.current = cache !== null;
			const canHydrateProfiles = !hasReceivedRemoteProfilesRef.current;
			if (cache && canHydrateProfiles) {
				const cachedProfiles = [...cache.profiles, ...cache.sharedWithMeProfiles];
				const cachedActiveProfile =
					cache.activeProfile !== null && cachedProfiles.some((profile) => profileIdKey(profile.id) === cache.activeProfile)
						? cache.activeProfile
						: cache.profiles.find((profile) => profile.isDefault)?.id?.toString() ?? cache.profiles[0]?.id?.toString() ?? null;
				if (cachedActiveProfile !== null) {
					initialActiveProfileRef.current = cachedActiveProfile;
					setActiveProfile(cachedActiveProfile);
				}
				semestersCacheRef.current = cache.semestersByProfile;
				setProfiles(cache.profiles);
				setSharedWithMeProfiles(cache.sharedWithMeProfiles);
				setSharedWithMeShareIds(cache.sharedWithMeShareIds);
				setMySharedProfiles(cache.mySharedProfiles as ShareData[]);
				if (cachedActiveProfile && cache.semestersByProfile[cachedActiveProfile]) {
					setSemesters(cache.semestersByProfile[cachedActiveProfile]);
				}
			}
			setIsHydrated(true);
			setLoading(false);
			markStartup("cache_hydrated");
		}).catch((error) => {
			if (!cancelled) console.error("Cache hydration error:", error);
		});

		return () => {
			cancelled = true;
		};
	}, [dataUserId]);

	// ===== INITIALIZATION & LISTENERS =====
	useEffect(() => {
		if (dataUserId && initializedUserIdRef.current !== dataUserId) {
			const isAccountSwitch = initializedUserIdRef.current !== null;
			// Never let a previous account's cached state flash while the new account hydrates.
			setProfiles([]);
			setActiveProfile(null);
			setSharedWithMeProfiles([]);
			setMySharedProfiles([]);
			setSharedWithMeShareIds({});
			setSemesters([]);
			setLoading(true);
			setIsHydrated(false);
			setIsRefreshing(true);
			semestersCacheRef.current = {};
			hasReceivedRemoteProfilesRef.current = false;
			hasReceivedOutgoingSharesRef.current = false;
			initialActiveProfileRef.current = null;
			hasInitializedRef.current = false;
			isInitializingRef.current = false;
			if (isAccountSwitch) {
				hydratedCacheUserIdRef.current = null;
				hasCachedDataRef.current = false;
			}
			initializedUserIdRef.current = dataUserId;
		}
		if (!gpaService || !currentUser || hasInitializedRef.current) return;
		if (isInitializingRef.current) return;

		setLoading(!hasCachedDataRef.current);
		setIsRefreshing(true);
		isInitializingRef.current = true;

		let profilesUnsubscribe: (() => void) | null = null;
		let incomingSharesUnsubscribe: (() => void) | null = null;
		let cleanupCollaborativeListeners: (() => void) | null = null;
		let cancelled = false;

		const loadOutgoingShares = () => {
			if (cancelled || hasReceivedOutgoingSharesRef.current) return;
			void gpaService.getMySharedProfiles().then((result) => {
				if (!cancelled && result.success) {
					hasReceivedOutgoingSharesRef.current = true;
					setMySharedProfiles(result.sharedProfiles);
				}
			});
		};

		const setupIncomingShares = () => {
			if (cancelled || incomingSharesUnsubscribe) return;
			incomingSharesUnsubscribe = gpaService.onIncomingSharesChange((result) => {
				if (cancelled) return;
				if (result.success) {
					const shareIds: Record<string, string> = {};
					for (const share of result.shares) {
						const item = share as { id?: string; profileId?: string | number; shareId?: string };
						if (item.profileId != null) shareIds[String(item.profileId)] = item.shareId ?? item.id ?? String(item.profileId);
					}
					setSharedWithMeShareIds(shareIds);
					void gpaService.getSharedWithMeProfiles(result.shares as ShareData[]).then((res) => {
						if (!cancelled && res.success) {
							setSharedWithMeProfiles(res.sharedProfiles.map((profile) => ({ ...profile, id: String(profile.id) })));
						}
					});
				}
			});
		};

		const setupRealtimeListeners = () => {
			profilesUnsubscribe = gpaService.onProfilesChange(async (result) => {
				if (cancelled) return;
				if (result.success) {
					hasReceivedRemoteProfilesRef.current = true;
					const currentProfiles = result.profiles;
					if (currentProfiles.length === 0) {
						// The default profile is created atomically during signup.
						// An empty snapshot here means the account is being deleted
						// or hasn't finished provisioning yet. Never auto-create a
						// profile here — that was the source of phantom duplicates.
						setProfiles([]);
						setActiveProfile(null);
						setSemesters([]);
						semestersCacheRef.current = {};
						setIsHydrated(true);
						setIsRefreshing(false);
						setLoading(false);
						markStartup("remote_profiles_received");
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
					setIsHydrated(true);
					setIsRefreshing(false);
					markStartup("remote_profiles_received");
					setupIncomingShares();
					loadOutgoingShares();
				} else if (result.error) {
					console.error("Error loading profiles:", result.error);
					showMessage("Error loading profiles. Please refresh.", "error");
					setIsHydrated(true);
					setIsRefreshing(false);
				}
				setLoading(false);
			});

			return () => incomingSharesUnsubscribe?.();
		};

		cleanupCollaborativeListeners = setupRealtimeListeners();
		isInitializingRef.current = false;
		hasInitializedRef.current = true;

		return () => {
			cancelled = true;
			profilesUnsubscribe?.();
			cleanupCollaborativeListeners?.();
			hasInitializedRef.current = false;
			isInitializingRef.current = false;
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [dataUserId, currentUser, gpaService]);

	// Reset on logout
	useEffect(() => {
		if (!dataUserId) {
			setProfiles([]);
			setActiveProfile(null);
			setLoading(true);
			setIsHydrated(false);
			setIsRefreshing(false);
			setSaving(false);
			setSharedWithMeProfiles([]);
			setMySharedProfiles([]);
			setSharedWithMeShareIds({});
			semestersCacheRef.current = {};
			hasReceivedRemoteProfilesRef.current = false;
			hasReceivedOutgoingSharesRef.current = false;
			hasInitializedRef.current = false;
			isInitializingRef.current = false;
			initializedUserIdRef.current = null;
			hydratedCacheUserIdRef.current = null;
			hasCachedDataRef.current = false;
			Object.values(activeListeners.current).forEach((u) => { if (typeof u === "function") u(); });
			activeListeners.current = {};
		}
	}, [dataUserId]);

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
							next[index] = { ...updated, id: String(updated.id), isShared: true, permission: "edit", ownerUserId: ownerId };
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

	const profileValue = useMemo<GpaProfileContextValue>(
		() => ({
			profiles: visibleProfiles, activeProfile: visibleActiveProfile, loading: stateReadyForCurrentUser ? loading : true,
			isHydrated: stateReadyForCurrentUser && isHydrated, isRefreshing: stateReadyForCurrentUser ? isRefreshing : true,
			sharedWithMeProfiles: visibleSharedWithMeProfiles, mySharedProfiles: visibleMySharedProfiles, allProfiles: visibleAllProfiles,
			currentProfile: visibleCurrentProfile, isReadOnlyProfile: visibleIsReadOnlyProfile, sharedWithMeShareIds: visibleSharedWithMeShareIds,
			updateActiveProfile, createProfile, deleteProfile,
			shareProfileWithUser, copySharedProfile, renameProfile,
		}),
		[
			visibleProfiles, visibleActiveProfile, loading, stateReadyForCurrentUser, isHydrated, isRefreshing,
			visibleSharedWithMeProfiles, visibleMySharedProfiles, visibleAllProfiles,
			visibleCurrentProfile, visibleIsReadOnlyProfile, visibleSharedWithMeShareIds,
			updateActiveProfile, createProfile, deleteProfile,
			shareProfileWithUser, copySharedProfile, renameProfile,
		]
	);
	const semesterValue = useMemo<GpaSemesterContextValue>(
		() => ({ semesters: visibleSemesters, saving, updateSemesters }),
		[visibleSemesters, saving, updateSemesters]
	);
	return (
		<GpaProfilesContext.Provider value={profileValue}>
			<GpaSemestersContext.Provider value={semesterValue}>
				{children}
			</GpaSemestersContext.Provider>
		</GpaProfilesContext.Provider>
	);
}
