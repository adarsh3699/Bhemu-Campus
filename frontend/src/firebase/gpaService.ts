import {
	collection,
	doc,
	getDoc,
	getDocs,
	setDoc,
	query,
	where,
	orderBy,
	limit,
	serverTimestamp,
	writeBatch,
	onSnapshot,
	arrayUnion,
	arrayRemove,
	deleteField,
	CollectionReference,
	DocumentData,
	Unsubscribe,
} from "firebase/firestore";
import { db } from "./config";
import type { GPASubject, GPASemester, GPAProfile, ShareData } from "@/types";

// Re-export shared GPA types for backward compatibility
export type { GPASubject, GPASemester, GPAProfile, ShareData };

export class GPAService {
	private userId: string;
	private userProfilesRef: CollectionReference<DocumentData>;
	private sharedProfilesRef: CollectionReference<DocumentData>;
	private userSharedRef: CollectionReference<DocumentData>;
	private outgoingSharesRef: CollectionReference<DocumentData>;
	private incomingSharesRef: CollectionReference<DocumentData>;
	private _userIdCache?: Map<string, string | null>;

	constructor(userId: string) {
		this.userId = userId;
		this.userProfilesRef = collection(db, "users", userId, "profiles");
		this.sharedProfilesRef = collection(db, "sharedProfiles");
		this.userSharedRef = collection(db, "users", userId, "sharedProfiles");

		// Enhanced sharing collections
		this.outgoingSharesRef = collection(db, "userShares", userId, "outgoing");
		this.incomingSharesRef = collection(db, "userShares", userId, "incoming");
	}

	// ===== PROFILE MANAGEMENT =====

	async saveProfile(profile: GPAProfile): Promise<{ success: boolean; profile?: GPAProfile; error?: string }> {
		try {
			const profileData = {
				...profile,
				userId: this.userId,
				updatedAt: serverTimestamp(),
				createdAt: profile.createdAt || serverTimestamp(),
				// Preserve UMS-related fields
				...(profile.studentInfo ? { studentInfo: profile.studentInfo } : {}),
				...(profile.allTermIds ? { allTermIds: profile.allTermIds } : {}),
				...(profile.umsVerified ? { umsVerified: profile.umsVerified } : {}),
				...(profile.lastUMSSync ? { lastUMSSync: profile.lastUMSSync } : {}),
			};

			// Save to private profile (using merge to preserve ACLs if they exist)
			await setDoc(doc(this.userProfilesRef, profile.id.toString()), profileData, { merge: true });

			return { success: true, profile: profileData };
		} catch (error) {
			console.error("Error saving profile:", error);
			return { success: false, error: (error as Error).message };
		}
	}

	async updateLastOpened(profileId: string | number): Promise<void> {
		try {
			await setDoc(
				doc(this.userProfilesRef, profileId.toString()),
				{ lastOpened: serverTimestamp() },
				{ merge: true }
			);
		} catch (error) {
			console.error("Error updating lastOpened:", error);
		}
	}

	async getProfiles(): Promise<{ success: boolean; profiles: GPAProfile[]; error?: string }> {
		try {
			const snapshot = await getDocs(query(this.userProfilesRef, orderBy("createdAt", "desc")));
			const profiles = snapshot.docs.map((doc) => ({
				id: doc.id,
				...(doc.data() as Omit<GPAProfile, "id">),
			}));

			// Sort profiles: Default first, then alphabetical
			const sortedProfiles = profiles.sort((a, b) => {
				if (a.isDefault && !b.isDefault) return -1;
				if (!a.isDefault && b.isDefault) return 1;
				return (a.name || "").localeCompare(b.name || "");
			});

			return { success: true, profiles: sortedProfiles };
		} catch (error) {
			console.error("Error fetching profiles:", error);
			return { success: false, error: (error as Error).message, profiles: [] };
		}
	}

	async getProfile(profileId: string | number): Promise<{ success: boolean; profile?: GPAProfile; error?: string }> {
		try {
			const docRef = doc(this.userProfilesRef, profileId.toString());
			const docSnap = await getDoc(docRef);

			if (docSnap.exists()) {
				return { success: true, profile: { id: docSnap.id, ...(docSnap.data() as Omit<GPAProfile, "id">) } };
			} else {
				return { success: false, error: "Profile not found" };
			}
		} catch (error) {
			console.error("Error fetching profile:", error);
			return { success: false, error: (error as Error).message };
		}
	}

	async deleteProfile(profileId: string | number): Promise<{ success: boolean; error?: string }> {
		try {
			const batch = writeBatch(db);
			const id = profileId.toString();

			// Delete main profile
			batch.delete(doc(this.userProfilesRef, id));

			// Clean up all related data
			await Promise.all([this._cleanupOutgoingShares(batch, id), this._cleanupLegacyShares(batch, id)]);

			await batch.commit();
			return { success: true };
		} catch (error) {
			console.error("Error deleting profile:", error);
			return { success: false, error: (error as Error).message };
		}
	}

	// Helper: Clean up outgoing shares
	private async _cleanupOutgoingShares(batch: ReturnType<typeof writeBatch>, profileId: string): Promise<void> {
		const sharesQuery = query(this.outgoingSharesRef, where("profileId", "==", profileId));
		const sharesSnapshot = await getDocs(sharesQuery);

		sharesSnapshot.docs.forEach((shareDoc) => {
			const { targetUserId } = shareDoc.data();
			const shareId = shareDoc.id;

			// Remove from both outgoing and incoming
			batch.delete(doc(this.outgoingSharesRef, shareId));
			batch.delete(doc(db, "userShares", targetUserId, "incoming", shareId));
		});
	}

	// Helper: Clean up legacy shared profiles
	private async _cleanupLegacyShares(batch: ReturnType<typeof writeBatch>, profileId: string): Promise<void> {
		const legacyQuery = query(this.userSharedRef, where("profileId", "==", profileId));
		const legacySnapshot = await getDocs(legacyQuery);

		legacySnapshot.docs.forEach((shareDoc) => {
			const shareId = shareDoc.id;

			// Remove from both user and public collections
			batch.delete(doc(this.userSharedRef, shareId));
			batch.delete(doc(this.sharedProfilesRef, shareId));
		});
	}

	// ===== REAL-TIME LISTENERS =====

	onProfilesChange(callback: (res: { success: boolean; profiles: GPAProfile[]; error?: string }) => void): Unsubscribe {
		try {
			const q = query(this.userProfilesRef, orderBy("createdAt", "desc"));
			const unsubscribe = onSnapshot(
				q,
				(snapshot) => {
					const profiles = snapshot.docs.map((doc) => ({
						id: doc.id,
						...(doc.data() as Omit<GPAProfile, "id">),
					}));

					// Sort profiles: Default first, then alphabetical
					const sortedProfiles = profiles.sort((a, b) => {
						if (a.isDefault && !b.isDefault) return -1;
						if (!a.isDefault && b.isDefault) return 1;
						return (a.name || "").localeCompare(b.name || "");
					});

					callback({ success: true, profiles: sortedProfiles });
				},
				(error) => {
					console.error("Error listening to profiles:", error);
					callback({ success: false, error: error.message, profiles: [] });
				}
			);

			return unsubscribe;
		} catch (error) {
			console.error("Error setting up profiles listener:", error);
			callback({ success: false, error: (error as Error).message, profiles: [] });
			return () => {};
		}
	}

	onProfileChange(profileId: string | number, callback: (res: { success: boolean; profile?: GPAProfile; error?: string }) => void): Unsubscribe {
		try {
			const docRef = doc(this.userProfilesRef, profileId.toString());
			const unsubscribe = onSnapshot(
				docRef,
				(docSnap) => {
					if (docSnap.exists()) {
						const profile = { id: docSnap.id, ...(docSnap.data() as Omit<GPAProfile, "id">) };
						callback({ success: true, profile });
					} else {
						callback({ success: false, error: "Profile not found" });
					}
				},
				(error) => {
					console.error("Error listening to profile:", error);
					callback({ success: false, error: error.message });
				}
			);

			return unsubscribe;
		} catch (error) {
			console.error("Error setting up profile listener:", error);
			callback({ success: false, error: (error as Error).message });
			return () => {};
		}
	}

	onSharedProfilesChange(callback: (res: { success: boolean; sharedProfiles: unknown[]; error?: string }) => void): Unsubscribe {
		try {
			const q = query(this.userSharedRef, orderBy("sharedAt", "desc"));
			const unsubscribe = onSnapshot(
				q,
				(snapshot) => {
					const sharedProfiles = snapshot.docs.map((doc) => ({
						id: doc.id,
						...doc.data(),
					}));
					callback({ success: true, sharedProfiles });
				},
				(error) => {
					console.error("Error listening to shared profiles:", error);
					callback({ success: false, error: error.message, sharedProfiles: [] });
				}
			);

			return unsubscribe;
		} catch (error) {
			console.error("Error setting up shared profiles listener:", error);
			callback({ success: false, error: (error as Error).message, sharedProfiles: [] });
			return () => {};
		}
	}

	// ===== SHARING FUNCTIONALITY =====

	async shareProfile(profileId: string | number, shareOptions: Record<string, unknown> = {}): Promise<{ success: boolean; shareId?: string; shareUrl?: string; sharedProfile?: unknown; error?: string }> {
		try {
			const profileResult = await this.getProfile(profileId);
			if (!profileResult.success || !profileResult.profile) {
				return { success: false, error: "Profile not found" };
			}

			const profile = profileResult.profile;
			const shareId = this.generateShareId();

			const sharedProfileData = {
				...profile,
				shareId,
				originalUserId: this.userId,
				originalProfileId: profileId,
				sharedAt: serverTimestamp(),
				isPublic: true,
				shareOptions: {
					allowCopy: shareOptions.allowCopy !== false,
					allowView: shareOptions.allowView !== false,
					expiresAt: shareOptions.expiresAt || null,
					password: shareOptions.password || null,
					...shareOptions,
				},
			};

			const batch = writeBatch(db);

			// Add to shared profiles collection
			const sharedProfileRef = doc(this.sharedProfilesRef, shareId);
			batch.set(sharedProfileRef, sharedProfileData);

			// Add reference to user's shared profiles
			const userSharedDocRef = doc(this.userSharedRef, shareId);
			batch.set(userSharedDocRef, {
				shareId,
				profileId,
				profileName: profile.name,
				sharedAt: serverTimestamp(),
				shareUrl: this.generateShareUrl(shareId),
				isActive: true,
			});

			await batch.commit();

			return {
				success: true,
				shareId,
				shareUrl: this.generateShareUrl(shareId),
				sharedProfile: sharedProfileData,
			};
		} catch (error) {
			console.error("Error sharing profile:", error);
			return { success: false, error: (error as Error).message };
		}
	}

	async getSharedProfile(shareId: string): Promise<{ success: boolean; sharedProfile?: unknown; error?: string }> {
		try {
			const docRef = doc(this.sharedProfilesRef, shareId);
			const docSnap = await getDoc(docRef);

			if (docSnap.exists()) {
				const sharedProfile = docSnap.data();

				// Check if share is still valid
				if (
					(sharedProfile.shareOptions as { expiresAt?: { toDate: () => Date } })?.expiresAt &&
					(sharedProfile.shareOptions as { expiresAt: { toDate: () => Date } }).expiresAt.toDate() < new Date()
				) {
					return { success: false, error: "Share link has expired" };
				}

				return { success: true, sharedProfile };
			} else {
				return { success: false, error: "Shared profile not found" };
			}
		} catch (error) {
			console.error("Error fetching shared profile:", error);
			return { success: false, error: (error as Error).message };
		}
	}

	async copySharedProfile(shareId: string, newProfileName?: string): Promise<{ success: boolean; profile?: GPAProfile; error?: string }> {
		try {
			const sharedResult = await this.getSharedProfile(shareId);
			if (!sharedResult.success || !sharedResult.sharedProfile) {
				return { success: false, error: sharedResult.error || "Failed to fetch shared profile" };
			}

			const sharedProfile = sharedResult.sharedProfile as {
				name?: string;
				semesters?: GPASemester[];
				originalUserId?: string;
				shareOptions?: {
					allowCopy?: boolean;
					allowView?: boolean;
				};
			};

			if (!sharedProfile.shareOptions?.allowCopy) {
				return { success: false, error: "Copying is not allowed for this profile" };
			}

			const newProfile: GPAProfile = {
				id: Date.now(),
				name: newProfileName || `Copy of ${sharedProfile.name}`,
				semesters: sharedProfile.semesters || [],
				copiedFrom: {
					shareId,
					originalUserId: sharedProfile.originalUserId || "",
					copiedAt: serverTimestamp(),
				},
			};

			const saveResult = await this.saveProfile(newProfile);
			if (saveResult.success) {
				return { success: true, profile: newProfile };
			} else {
				return { success: false, error: saveResult.error };
			}
		} catch (error) {
			console.error("Error copying shared profile:", error);
			return { success: false, error: (error as Error).message };
		}
	}

	async getUserSharedProfiles(): Promise<{ success: boolean; sharedProfiles: unknown[]; error?: string }> {
		try {
			const snapshot = await getDocs(query(this.userSharedRef, orderBy("sharedAt", "desc")));
			const sharedProfiles = snapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
			}));
			return { success: true, sharedProfiles };
		} catch (error) {
			console.error("Error fetching shared profiles:", error);
			return { success: false, error: (error as Error).message, sharedProfiles: [] };
		}
	}

	async unshareProfile(shareId: string): Promise<{ success: boolean; error?: string }> {
		try {
			const batch = writeBatch(db);

			// Remove from shared profiles collection
			const sharedProfileRef = doc(this.sharedProfilesRef, shareId);
			batch.delete(sharedProfileRef);

			// Remove from user's shared profiles
			const userSharedDocRef = doc(this.userSharedRef, shareId);
			batch.delete(userSharedDocRef);

			await batch.commit();
			return { success: true };
		} catch (error) {
			console.error("Error unsharing profile:", error);
			return { success: false, error: (error as Error).message };
		}
	}

	// ===== ENHANCED USER-SPECIFIC SHARING =====

	async shareProfileWithUser(profileId: string | number, targetUserEmail: string, permission: "read" | "edit" = "read"): Promise<{ success: boolean; shareId?: string; shareData?: ShareData; error?: string }> {
		try {
			const [profileResult, targetUserId] = await Promise.all([
				this.getProfile(profileId),
				this.getUserIdByEmail(targetUserEmail),
			]);

			if (!profileResult.success || !profileResult.profile) return { success: false, error: "Profile not found" };
			if (!targetUserId) return { success: false, error: "User not found" };

			const shareId = this.generateShareId();
			const shareData = this._createShareData(
				shareId,
				profileId,
				profileResult.profile.name,
				targetUserId,
				targetUserEmail,
				permission
			);

			await this._executeShareOperation(shareData, profileResult.profile, permission);

			return { success: true, shareId, shareData };
		} catch (error) {
			console.error("Error sharing profile with user:", error);
			return { success: false, error: (error as Error).message };
		}
	}

	private _createShareData(
		shareId: string,
		profileId: string | number,
		profileName: string,
		targetUserId: string,
		targetUserEmail: string,
		permission: "read" | "edit"
	): ShareData {
		return {
			shareId,
			profileId,
			profileName,
			ownerUserId: this.userId,
			targetUserId,
			targetUserEmail,
			permission,
			sharedAt: serverTimestamp(),
			isActive: true,
		};
	}

	private async _executeShareOperation(shareData: ShareData, profile: GPAProfile, permission: "read" | "edit"): Promise<void> {
		const batch = writeBatch(db);
		const { shareId, profileId, targetUserId } = shareData;

		// 1. Add Pointers
		batch.set(doc(this.outgoingSharesRef, shareId), shareData);
		batch.set(doc(db, "userShares", targetUserId, "incoming", shareId), shareData);

		// 2. Update ORIGINAL profile collaborators metadata
		const profileRef = doc(this.userProfilesRef, profileId.toString());

		batch.set(
			profileRef,
			{
				collaborators: arrayUnion(targetUserId),
				permissions: {
					[this.userId]: "owner",
					[targetUserId]: permission,
				},
				lastModified: serverTimestamp(),
			},
			{ merge: true }
		);

		await batch.commit();
	}

	async getSharedWithMeProfiles(): Promise<{ success: boolean; sharedProfiles: GPAProfile[]; error?: string }> {
		try {
			const snapshot = await getDocs(query(this.incomingSharesRef, where("isActive", "==", true)));
			const sharePromises = snapshot.docs.map((docSnap) => this._buildSharedProfile(docSnap.data() as ShareData));
			const sharedProfiles = (await Promise.all(sharePromises)).filter((p): p is GPAProfile => p !== null);

			return { success: true, sharedProfiles };
		} catch (error) {
			console.error("Error fetching shared profiles:", error);
			return { success: false, error: (error as Error).message, sharedProfiles: [] };
		}
	}

	private async _buildSharedProfile(shareData: ShareData): Promise<GPAProfile | null> {
		const { profileId, shareId, permission, ownerUserId, sharedAt } = shareData;

		const profileData = await this._getProfileDataByPermission(shareData);
		if (!profileData) return null;

		return {
			...profileData,
			id: profileId,
			shareId,
			permission: permission as "read" | "edit",
			ownerUserId,
			sharedAt,
			isShared: true,
		};
	}

	async getMySharedProfiles(): Promise<{ success: boolean; sharedProfiles: unknown[]; error?: string }> {
		try {
			const snapshot = await getDocs(query(this.outgoingSharesRef, where("isActive", "==", true)));
			const sharedProfiles = snapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
			}));
			return { success: true, sharedProfiles };
		} catch (error) {
			console.error("Error fetching my shared profiles:", error);
			return { success: false, error: (error as Error).message, sharedProfiles: [] };
		}
	}

	async unshareProfileWithUser(shareId: string): Promise<{ success: boolean; error?: string }> {
		try {
			const shareSnap = await getDoc(doc(this.outgoingSharesRef, shareId));
			if (!shareSnap.exists()) {
				return { success: false, error: "Share not found" };
			}

			const shareData = shareSnap.data() as ShareData;
			await this._executeUnshareOperation(shareId, shareData);

			return { success: true };
		} catch (error) {
			console.error("Error unsharing profile with user:", error);
			return { success: false, error: (error as Error).message };
		}
	}

	private async _executeUnshareOperation(shareId: string, shareData: ShareData): Promise<void> {
		const batch = writeBatch(db);
		const { targetUserId, profileId } = shareData;

		batch.delete(doc(this.outgoingSharesRef, shareId));
		batch.delete(doc(db, "userShares", targetUserId, "incoming", shareId));

		const profileRef = doc(this.userProfilesRef, profileId.toString());
		batch.update(profileRef, {
			collaborators: arrayRemove(targetUserId),
			[`permissions.${targetUserId}`]: deleteField(),
			lastModified: serverTimestamp(),
		});

		await batch.commit();
	}

	async updateSharePermission(shareId: string, newPermission: "read" | "edit"): Promise<{ success: boolean; shareData?: ShareData; error?: string }> {
		try {
			const shareSnap = await getDoc(doc(this.outgoingSharesRef, shareId));
			if (!shareSnap.exists()) {
				return { success: false, error: "Share not found" };
			}

			const shareData = shareSnap.data() as ShareData;
			if (shareData.permission === newPermission) {
				return { success: true, shareData };
			}

			const updatedShareData = await this._executePermissionUpdate(shareId, shareData, newPermission);
			return { success: true, shareData: updatedShareData };
		} catch (error) {
			console.error("Error updating share permission:", error);
			return { success: false, error: (error as Error).message };
		}
	}

	private async _executePermissionUpdate(shareId: string, shareData: ShareData, newPermission: "read" | "edit"): Promise<ShareData> {
		const batch = writeBatch(db);
		const { targetUserId, profileId } = shareData;

		const updatedShareData = { ...shareData, permission: newPermission, updatedAt: serverTimestamp() };
		batch.update(doc(this.outgoingSharesRef, shareId), updatedShareData as DocumentData);
		batch.update(doc(db, "userShares", targetUserId, "incoming", shareId), updatedShareData as DocumentData);

		await this._updateProfilePermissions(batch, profileId, targetUserId, newPermission);

		await batch.commit();
		return updatedShareData;
	}

	private async _updateProfilePermissions(
		batch: ReturnType<typeof writeBatch>,
		profileId: string | number,
		targetUserId: string,
		newPermission: "read" | "edit"
	): Promise<void> {
		const profileRef = doc(this.userProfilesRef, profileId.toString());

		batch.set(
			profileRef,
			{
				permissions: {
					[targetUserId]: newPermission,
				},
				lastModified: serverTimestamp(),
			},
			{ merge: true }
		);
	}

	async saveProfileWithCollaboration(profile: GPAProfile): Promise<{ success: boolean; profile?: GPAProfile; error?: string }> {
		try {
			const correctUserId = profile.isShared && profile.ownerUserId ? profile.ownerUserId : this.userId;

			const profileData = {
				...profile,
				userId: correctUserId,
				updatedAt: serverTimestamp(),
				createdAt: profile.createdAt || serverTimestamp(),
			};

			await this._executeSaveWithCollaboration(profile, profileData);
			return { success: true, profile: profileData };
		} catch (error) {
			console.error("Error saving profile with collaboration:", error);
			return { success: false, error: (error as Error).message };
		}
	}

	private async _executeSaveWithCollaboration(profile: GPAProfile, profileData: GPAProfile): Promise<void> {
		const batch = writeBatch(db);
		const profileId = profile.id.toString();

		if (profile.isShared && profile.ownerUserId && profile.ownerUserId !== this.userId) {
			// I am Editor: Save to Owner's private profile
			const ownerProfileRef = doc(db, "users", profile.ownerUserId, "profiles", profileId);
			batch.set(ownerProfileRef, profileData, { merge: true });
		} else {
			// I am Owner: Save to my own profile
			batch.set(doc(this.userProfilesRef, profileId), profileData, { merge: true });
		}

		await batch.commit();
	}

	onCollaborativeProfileChange(
		profileId: string | number,
		ownerUserId: string,
		callback: (res: { success: boolean; profile?: GPAProfile; error?: string }) => void
	): Unsubscribe {
		try {
			const docRef = doc(db, "users", ownerUserId, "profiles", profileId.toString());
			const unsubscribe = onSnapshot(
				docRef,
				(docSnap) => {
					if (docSnap.exists()) {
						const profile = { id: docSnap.id, ...(docSnap.data() as Omit<GPAProfile, "id">) };
						callback({ success: true, profile });
					} else {
						callback({ success: false, error: "Profile not found" });
					}
				},
				(error) => {
					console.error("Error listening to collaborative profile:", error);
					callback({ success: false, error: error.message });
				}
			);

			return unsubscribe;
		} catch (error) {
			console.error("Error setting up collaborative profile listener:", error);
			callback({ success: false, error: (error as Error).message });
			return () => {};
		}
	}

	onIncomingSharesChange(callback: (res: { success: boolean; shares: unknown[]; error?: string }) => void): Unsubscribe {
		try {
			const q = query(this.incomingSharesRef, where("isActive", "==", true));
			const unsubscribe = onSnapshot(
				q,
				(snapshot) => {
					const shares = snapshot.docs.map((doc) => ({
						id: doc.id,
						...doc.data(),
					}));
					callback({ success: true, shares });
				},
				(error) => {
					console.error("Error listening to incoming shares:", error);
					callback({ success: false, error: error.message, shares: [] });
				}
			);

			return unsubscribe;
		} catch (error) {
			console.error("Error setting up incoming shares listener:", error);
			callback({ success: false, error: (error as Error).message, shares: [] });
			return () => {};
		}
	}

	async copySharedProfileToMyAccount(shareId: string, newProfileName?: string): Promise<{ success: boolean; profile?: GPAProfile; error?: string }> {
		try {
			const shareSnap = await getDoc(doc(this.incomingSharesRef, shareId));
			if (!shareSnap.exists()) {
				return { success: false, error: "Share not found" };
			}

			const shareData = shareSnap.data() as ShareData;
			const profileData = await this._getProfileDataByPermission(shareData);

			if (!profileData) {
				return { success: false, error: "Profile data not found" };
			}

			const newProfile = this._createCopiedProfile(profileData, newProfileName, shareData);
			return await this.saveProfile(newProfile);
		} catch (error) {
			console.error("Error copying shared profile:", error);
			return { success: false, error: (error as Error).message };
		}
	}

	private async _getProfileDataByPermission(shareData: ShareData): Promise<GPAProfile | null> {
		const { profileId, ownerUserId } = shareData;

		// Read from Owner's private profile
		const profileRef = doc(db, "users", ownerUserId, "profiles", profileId.toString());
		const profileSnap = await getDoc(profileRef);

		return profileSnap.exists() ? (profileSnap.data() as GPAProfile) : null;
	}

	private _createCopiedProfile(profileData: GPAProfile, newProfileName: string | undefined, shareData: ShareData): GPAProfile {
		return {
			id: Date.now(),
			name: newProfileName || `Copy of ${profileData.name}`,
			semesters: profileData.semesters || [],
			isDefault: false,
			copiedFrom: {
				shareId: shareData.shareId,
				originalUserId: shareData.ownerUserId,
				originalProfileId: shareData.profileId,
				copiedAt: serverTimestamp(),
			},
		};
	}

	// Email lookup with caching
	async getUserIdByEmail(email: string): Promise<string | null> {
		try {
			if (this._userIdCache?.has(email)) {
				return this._userIdCache.get(email) || null;
			}

			const usersRef = collection(db, "users");
			const q = query(usersRef, where("email", "==", email), limit(1));
			const snapshot = await getDocs(q);

			const userId = snapshot.empty ? null : snapshot.docs[0].id;

			if (!this._userIdCache) {
				this._userIdCache = new Map();
			}
			this._userIdCache.set(email, userId);

			return userId;
		} catch (error) {
			console.error("Error getting user ID by email:", error);
			return null;
		}
	}

	// ===== UTILITY METHODS =====

	generateShareId(): string {
		return Date.now().toString(36) + Math.random().toString(36).substring(2);
	}

	generateShareUrl(shareId: string): string {
		const origin = typeof window !== "undefined" ? window.location.origin : "";
		return `${origin}/shared/${shareId}`;
	}

	// ===== ACTIVE PROFILE MANAGEMENT =====

	async saveActiveProfile(profileId: string | number): Promise<void> {
		try {
			const prefsRef = doc(db, "users", this.userId, "preferences", "gpa");
			await setDoc(prefsRef, { activeProfileId: profileId.toString(), updatedAt: serverTimestamp() }, { merge: true });
		} catch (error) {
			console.error("Error saving active profile:", error);
		}
	}

	async getActiveProfile(): Promise<string | null> {
		try {
			const prefsRef = doc(db, "users", this.userId, "preferences", "gpa");
			const prefsSnap = await getDoc(prefsRef);
			if (prefsSnap.exists()) {
				return prefsSnap.data().activeProfileId || null;
			}
			return null;
		} catch (error) {
			console.error("Error getting active profile:", error);
			return null;
		}
	}

}

export const createGPAService = (userId: string) => {
	if (!userId) {
		throw new Error("User ID is required to create GPA service");
	}
	return new GPAService(userId);
};

export const requireAuth = (currentUser: unknown) => {
	if (!currentUser) {
		throw new Error("Authentication required");
	}
	return true;
};
