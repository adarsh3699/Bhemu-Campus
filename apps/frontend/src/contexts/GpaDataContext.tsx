"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, startTransition } from "react";
import { useAuth } from "@/firebase/AuthContext";
import { gpaService as createGPAService, LeaderboardService } from "@/firebase/services";
import { db } from "@/firebase/config";
import type { GPAProfile, GPASemester } from "@bhemu/shared";
import { STORAGE_KEYS, sortSemesters } from "@bhemu/shared";
import { useMessage } from "@/contexts/MessageContext";

// ===== Types =====
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

// ===== Hook for consumers =====
export function useGpaData(): GpaDataContextValue {
	const ctx = useContext(GpaDataContext);
	if (!ctx) {
		throw new Error("useGpaData must be used within a GpaDataProvider");
	}
	return ctx;
}

// ===== Provider =====
export function GpaDataProvider({ children }: { children: React.ReactNode }) {
	const { currentUser } = useAuth();
	const { showMessage } = useMessage();

	// ===== STATE MANAGEMENT =====
	const [profiles, setProfiles] = useState<GPAProfile[]>([]);
	const [activeProfile, setActiveProfile] = useState<string | number | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [sharedWithMeProfiles, setSharedWithMeProfiles] = useState<GPAProfile[]>([]);
	const [mySharedProfiles, setMySharedProfiles] = useState<unknown[]>([]);

	const activeListeners = useRef<Record<string, () => void>>({}); // Track active subscriptions
	const isInitializingRef = useRef(false);
	const hasInitializedRef = useRef(false);
	// Track the user ID that was initialized, so we re-init on user change
	const initializedUserIdRef = useRef<string | null>(null);
	// Store the active profile ID fetched from Firebase during initialization
	const initialActiveProfileRef = useRef<string | null>(null);
	// Prevent duplicate default-profile creation if Firestore fires twice on empty list
	const creatingDefaultProfileRef = useRef(false);

	// ===== SERVICE CREATION =====
	const gpaService = useMemo(() => {
		return currentUser ? createGPAService(currentUser.uid) : null;
	}, [currentUser]);

	// ===== COMPUTED VALUES =====
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
			// Own profiles first, then shared profiles
			if (!a.isShared && b.isShared) return -1;
			if (a.isShared && !b.isShared) return 1;

			// Within same category, sort by default then name
			if (a.isDefault && !b.isDefault) return -1;
			if (!a.isDefault && b.isDefault) return 1;
			return (a.name || "").localeCompare(b.name || "");
		});
	}, [sortedProfiles, sharedWithMeProfiles]);

	const currentProfile = allProfiles.find((p) => p.id === activeProfile) || allProfiles[0];
	const [semesters, setSemesters] = useState<GPASemester[]>([]);
	const isReadOnlyProfile = !!(currentProfile?.isShared && currentProfile?.permission === "read");

	// ===== SEMESTERS SUBCOLLECTION LISTENER =====
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

	// ===== UTILITY FUNCTIONS =====
	const generateProfileName = useCallback(() => {
		return currentUser?.displayName || currentUser?.email?.split("@")[0] || "User";
	}, [currentUser]);

	// ===== CORE ACTIONS =====
	const updateActiveProfile = useCallback((profileId: string | number) => {
		setActiveProfile(profileId);
		// Persist to localStorage (same device only — new device always opens default)
		try { localStorage.setItem(STORAGE_KEYS.activeProfileId, profileId.toString()); } catch {}
		// Only update lastOpened for own profiles — shared profiles live under the owner's
		// collection and writing here would create a ghost doc under the recipient's collection.
		const isShared = sharedWithMeProfiles.some((p) => p.id === profileId);
		if (!isShared) gpaService?.updateLastOpened(profileId);
	}, [gpaService, sharedWithMeProfiles]);

	const createProfile = useCallback(
		async (name: string) => {
			try {
				if (!gpaService) return;

				const profileId = Date.now();
				const newProfile: GPAProfile = {
					id: profileId,
					name: name,
					isDefault: false,
				};

				await gpaService.saveProfile(newProfile);

				// Write default semester to subcollection
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
		},
		[gpaService, updateActiveProfile, showMessage]
	);

	const deleteProfile = useCallback(
		async (profileId: string | number) => {
			if (profiles.length <= 1) {
				showMessage("Cannot delete the last profile", "warning");
				return;
			}

			const profileToDelete = profiles.find((p) => p.id === profileId);
			if (!profileToDelete) {
				showMessage("Profile not found", "error");
				return;
			}

			if (profileToDelete.isDefault) {
				showMessage("Cannot delete the default profile", "warning");
				return;
			}

			try {
				if (gpaService) {
					await gpaService.deleteProfile(profileId);

					if (activeProfile === profileId) {
						const remainingProfiles = sortedProfiles.filter((profile) => profile.id !== profileId);
						updateActiveProfile(remainingProfiles[0].id);
					}

					showMessage("Profile deleted successfully", "success");
				}
			} catch (error) {
				console.error("Error deleting profile:", error);
				showMessage("Error deleting profile. Please try again.", "error");
			}
		},
		[profiles, sortedProfiles, activeProfile, updateActiveProfile, gpaService, showMessage]
	);

	// ===== SHARED ACTIONS =====
	const shareProfileWithUser = useCallback(
		async (profileToShare: GPAProfile, emailOrAction: string, permission: "read" | "edit" | "unshare", action: string = "share") => {
			if (!gpaService || !profileToShare) return;

			try {
				if (permission === "unshare") {
					const result = await gpaService.unshareProfileWithUser(emailOrAction);
					if (result.success) {
						showMessage("Profile unshared successfully", "success");
						const mySharedResult = await gpaService.getMySharedProfiles();
						if (mySharedResult.success) {
							setMySharedProfiles(mySharedResult.sharedProfiles);
						}
					} else {
						showMessage(result.error || "Error unsharing profile", "error");
					}
					return;
				}

				if (action === "updatePermission") {
					const result = await gpaService.updateSharePermission(emailOrAction, permission as "read" | "edit");
					if (result.success) {
						showMessage(
							`Permission updated to ${permission === "read" ? "Read Only" : "Edit Access"}`,
							"success"
						);
						const mySharedResult = await gpaService.getMySharedProfiles();
						if (mySharedResult.success) {
							setMySharedProfiles(mySharedResult.sharedProfiles);
						}
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
					if (mySharedResult.success) {
						setMySharedProfiles(mySharedResult.sharedProfiles);
					}
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


	const copySharedProfile = useCallback(
		async (shareId: string, profileName: string) => {
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
		},
		[gpaService, showMessage, updateActiveProfile]
	);

	const renameProfile = useCallback(
		async (profileId: string | number, newName: string) => {
			if (!gpaService) return;
			// Optimistic update
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
		},
		[gpaService, showMessage, currentUser]
	);

	// ===== DATA UPDATE ACTIONS =====
	const updateSemesters = useCallback(
		async (newSemesters: GPASemester[]) => {
			if (!gpaService || !activeProfile) return;

			try {
				setSaving(true);
				// Optimistically update local state
				setSemesters(newSemesters);

				// Determine if shared-edit profile (write to owner's subcollection)
				const profile = allProfiles.find((p) => p.id === activeProfile);
				if (profile?.isShared && profile.permission === "edit" && profile.ownerUserId) {
					// For collaborative profiles, save via collaboration path
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
		},
		[gpaService, activeProfile, allProfiles, showMessage]
	);

	// ===== INITIALIZATION & LISTENERS =====
	useEffect(() => {
		// Re-initialize if user changed (login/logout/switch)
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

				if (sharedWithMeResult.success) {
					setSharedWithMeProfiles(sharedWithMeResult.sharedProfiles);
				}

				if (mySharedResult.success) {
					setMySharedProfiles(mySharedResult.sharedProfiles);
				}
			} catch (error) {
				console.error("Error loading shared profiles:", error);
			}
		};

		const initializeData = async () => {
			try {
				// Read last active profile from localStorage (same device memory only)
				let savedActiveId: string | null = null;
				try { savedActiveId = localStorage.getItem(STORAGE_KEYS.activeProfileId); } catch {}
				if (savedActiveId) {
					initialActiveProfileRef.current = savedActiveId;
					setActiveProfile(savedActiveId);
				}

				loadShares();

				const cleanupRealtime = setupRealtimeListeners();

				return cleanupRealtime;
			} catch (error) {
				console.error("Initialization error:", error);
				showMessage("Error loading your data. Please try again.", "error");
				setLoading(false);
			} finally {
				isInitializingRef.current = false;
				hasInitializedRef.current = true;
			}
		};

		const setupRealtimeListeners = () => {
			profilesUnsubscribe = gpaService.onProfilesChange(async (result) => {
				if (result.success) {
					const currentProfiles = result.profiles;

					if (currentProfiles.length === 0) {
						// Only fires on first signup — default profile can never be deleted.
						// Skip if account deletion is in progress (the batch that wiped profiles
						// will fire this listener before the auth token is revoked).
						let isDeleting = false;
						try { isDeleting = !!localStorage.getItem(STORAGE_KEYS.accountDeleting); } catch {}
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
							// Write default semester to subcollection
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

					const cleanProfiles = currentProfiles.map((profile) => ({
						...profile,
						id: profile.id.toString(),
					}));

					setProfiles(cleanProfiles);

					setActiveProfile((prev) => {
						// 1. If we already have an active profile and it still exists, keep it
						if (prev && cleanProfiles.find((p) => p.id === prev)) {
							return prev;
						}

						// 2. Try the localStorage-saved ID (same device memory)
						const savedActiveProfile = initialActiveProfileRef.current;
						if (savedActiveProfile && cleanProfiles.find((p) => p.id === savedActiveProfile)) {
							return savedActiveProfile;
						}

						// 3. Fall back to the default profile (new device / cleared storage)
						const defaultProfile = cleanProfiles.find((p) => p.isDefault);
						if (defaultProfile) return defaultProfile.id;

						// 4. Last resort: first profile
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

			return () => {
				incomingSharesUnsubscribe?.();
			};
		};


		initializeData().then((cleanup) => {
			cleanupCollaborativeListeners = cleanup || null;
		});

		return () => {
			profilesUnsubscribe?.();
			cleanupCollaborativeListeners?.();
			// Allow re-initialization on next mount (React strict mode remount)
			hasInitializedRef.current = false;
			isInitializingRef.current = false;
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentUser, gpaService]);

	// Reset state when user logs out
	useEffect(() => {
		if (!currentUser) {
			startTransition(() => {
				setProfiles([]);
				setActiveProfile(null);
				setLoading(true);
				setSaving(false);
				setSharedWithMeProfiles([]);
				setMySharedProfiles([]);
			});
			hasInitializedRef.current = false;
			isInitializingRef.current = false;
			initializedUserIdRef.current = null;

			// Clean up collaborative listeners
			Object.values(activeListeners.current).forEach((unsub) => {
				if (typeof unsub === "function") unsub();
			});
			activeListeners.current = {};
		}
	}, [currentUser]);

	// Collaborative Listeners Effect
	useEffect(() => {
		if (!currentUser || !gpaService) return;

		sharedWithMeProfiles.forEach((profile) => {
			if (profile.permission === "edit" && !activeListeners.current[profile.id]) {
				const ownerId = profile.ownerUserId || "";

				const unsubscribe = gpaService.onCollaborativeProfileChange(profile.id, ownerId, (result) => {
					if (result.success && result.profile) {
						const updatedProfile = result.profile;
						setSharedWithMeProfiles((prev) => {
							const index = prev.findIndex((p) => p.id === profile.id);
							if (index === -1) return prev;

							const oldProfile = prev[index];
							const updatedAtObj = updatedProfile.updatedAt as { toMillis?: () => number } | null | undefined;
							const oldAtObj = oldProfile.updatedAt as { toMillis?: () => number } | null | undefined;

							const newTime = updatedAtObj?.toMillis ? updatedAtObj.toMillis() : updatedProfile.updatedAt;
							const oldTime = oldAtObj?.toMillis ? oldAtObj.toMillis() : oldProfile.updatedAt;

							if (newTime && oldTime && newTime === oldTime) {
								return prev;
							}

							const newProfiles = [...prev];
							newProfiles[index] = {
								...updatedProfile,
								isShared: true,
								permission: "edit",
								ownerUserId: ownerId,
							};
							return newProfiles;
						});
					}
				});
				activeListeners.current[profile.id] = unsubscribe;
			}
		});

		const currentIds = new Set(sharedWithMeProfiles.map((p) => p.id));
		Object.keys(activeListeners.current).forEach((id) => {
			if (!currentIds.has(id)) {
				if (typeof activeListeners.current[id] === "function") {
					activeListeners.current[id]();
				}
				delete activeListeners.current[id];
			}
		});
	}, [sharedWithMeProfiles, currentUser, gpaService]);

	// Cleanup all listeners on unmount
	useEffect(() => {
		return () => {
			Object.values(activeListeners.current).forEach((unsub) => {
				if (typeof unsub === "function") unsub();
			});
			activeListeners.current = {};
		};
	}, []);

	useEffect(() => {
		// If the saved active profile from Firebase points to a shared profile, apply it
		const savedActiveId = initialActiveProfileRef.current;
		if (savedActiveId && sharedWithMeProfiles.find((p) => p.id === savedActiveId)) {
			setActiveProfile(savedActiveId);
		}
	}, [sharedWithMeProfiles]);

	// ===== CONTEXT VALUE =====
	const value = useMemo<GpaDataContextValue>(
		() => ({
			profiles,
			activeProfile,
			loading,
			saving,
			sharedWithMeProfiles,
			mySharedProfiles,
			allProfiles,
			currentProfile,
			semesters,
			isReadOnlyProfile,

			updateActiveProfile,
			createProfile,
			deleteProfile,
			updateSemesters,
			shareProfileWithUser,
			copySharedProfile,
			renameProfile,
		}),
		[
			profiles,
			activeProfile,
			loading,
			saving,
			sharedWithMeProfiles,
			mySharedProfiles,
			allProfiles,
			currentProfile,
			semesters,
			isReadOnlyProfile,
			updateActiveProfile,
			createProfile,
			deleteProfile,
			updateSemesters,
			shareProfileWithUser,
			copySharedProfile,
			renameProfile,
		]
	);

	return <GpaDataContext.Provider value={value}>{children}</GpaDataContext.Provider>;
}
