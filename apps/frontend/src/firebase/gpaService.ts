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
	private outgoingSharesRef: CollectionReference<DocumentData>;
	private incomingSharesRef: CollectionReference<DocumentData>;
	private _userIdCache?: Map<string, string | null>;

	constructor(userId: string) {
		this.userId = userId;
		this.userProfilesRef = collection(db, "users", userId, "profiles");
		this.outgoingSharesRef = collection(db, "userShares", userId, "outgoing");
		this.incomingSharesRef = collection(db, "userShares", userId, "incoming");
	}

	// ===== GPA & MARKS SUBCOLLECTION =====

	private gpaAndMarksRef(profileId: string | number): CollectionReference<DocumentData> {
		return collection(db, "users", this.userId, "profiles", profileId.toString(), "gpaAndMarks");
	}

	private gpaAndMarksRefForUser(userId: string, profileId: string | number): CollectionReference<DocumentData> {
		return collection(db, "users", userId, "profiles", profileId.toString(), "gpaAndMarks");
	}

	async getSemesters(profileId: string | number): Promise<{ success: boolean; semesters: GPASemester[]; error?: string }> {
		try {
			const snapshot = await getDocs(this.gpaAndMarksRef(profileId));
			const semesters = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as GPASemester));
			return { success: true, semesters };
		} catch (error) {
			console.error("Error fetching semesters:", error);
			return { success: false, semesters: [], error: (error as Error).message };
		}
	}

	async saveSemesters(profileId: string | number, semesters: GPASemester[]): Promise<{ success: boolean; error?: string }> {
		try {
			const batch = writeBatch(db);
			const colRef = this.gpaAndMarksRef(profileId);

			// Write all current semesters
			const currentIds = new Set<string>();
			for (const semester of semesters) {
				const id = semester.id.toString();
				currentIds.add(id);
				batch.set(doc(colRef, id), { id: semester.id, name: semester.name, subjects: semester.subjects || [] });
			}

			// Delete docs that no longer exist in the list
			const existingSnap = await getDocs(colRef);
			for (const existing of existingSnap.docs) {
				if (!currentIds.has(existing.id)) {
					batch.delete(existing.ref);
				}
			}

			const profileRef = doc(this.userProfilesRef, profileId.toString());
			batch.set(profileRef, { updatedAt: serverTimestamp() }, { merge: true });

			await batch.commit();
			return { success: true };
		} catch (error) {
			console.error("Error saving semesters:", error);
			return { success: false, error: (error as Error).message };
		}
	}

	async saveSingleSemester(profileId: string | number, semester: GPASemester): Promise<{ success: boolean; error?: string }> {
		try {
			const semDoc = doc(this.gpaAndMarksRef(profileId), semester.id.toString());
			await setDoc(semDoc, { id: semester.id, name: semester.name, subjects: semester.subjects || [] });
			return { success: true };
		} catch (error) {
			console.error("Error saving semester:", error);
			return { success: false, error: (error as Error).message };
		}
	}

	async deleteSemesterDoc(profileId: string | number, semesterId: string | number): Promise<{ success: boolean; error?: string }> {
		try {
			const semDoc = doc(this.gpaAndMarksRef(profileId), semesterId.toString());
			const batch = writeBatch(db);
			batch.delete(semDoc);
			batch.set(doc(this.userProfilesRef, profileId.toString()), { updatedAt: serverTimestamp() }, { merge: true });
			await batch.commit();
			return { success: true };
		} catch (error) {
			console.error("Error deleting semester doc:", error);
			return { success: false, error: (error as Error).message };
		}
	}

	onSemestersChange(profileId: string | number, callback: (res: { success: boolean; semesters: GPASemester[]; error?: string }) => void): Unsubscribe {
		try {
			const colRef = this.gpaAndMarksRef(profileId);
			const unsubscribe = onSnapshot(
				colRef,
				(snapshot) => {
					const semesters = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as GPASemester));
					callback({ success: true, semesters });
				},
				(error) => {
					console.error("Error listening to semesters:", error);
					callback({ success: false, semesters: [], error: error.message });
				}
			);
			return unsubscribe;
		} catch (error) {
			console.error("Error setting up semesters listener:", error);
			callback({ success: false, semesters: [], error: (error as Error).message });
			return () => {};
		}
	}

	onSemestersChangeForUser(userId: string, profileId: string | number, callback: (res: { success: boolean; semesters: GPASemester[]; error?: string }) => void): Unsubscribe {
		try {
			const colRef = this.gpaAndMarksRefForUser(userId, profileId);
			const unsubscribe = onSnapshot(
				colRef,
				(snapshot) => {
					const semesters = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as GPASemester));
					callback({ success: true, semesters });
				},
				(error) => {
					console.error("Error listening to semesters for user:", error);
					callback({ success: false, semesters: [], error: error.message });
				}
			);
			return unsubscribe;
		} catch (error) {
			console.error("Error setting up semesters listener for user:", error);
			callback({ success: false, semesters: [], error: (error as Error).message });
			return () => {};
		}
	}

	// ===== PROFILE MANAGEMENT =====

	async saveProfile(profile: GPAProfile): Promise<{ success: boolean; profile?: GPAProfile; error?: string }> {
		try {
			// Strip runtime-only fields before writing (permission is set from userShares, not stored on profile doc)
			const { semesters, permission: _permission, ...profileMetadata } = profile;
			const profileData = {
				...profileMetadata,
				updatedAt: serverTimestamp(),
				createdAt: profile.createdAt || serverTimestamp(),
				...(profile.studentInfo ? { studentInfo: profile.studentInfo } : {}),
				...(profile.allTermIds ? { allTermIds: profile.allTermIds } : {}),
				...(profile.umsVerified ? { umsVerified: profile.umsVerified } : {}),
				...(profile.lastUMSSync ? { lastUMSSync: profile.lastUMSSync } : {}),
			};

			await setDoc(doc(this.userProfilesRef, profile.id.toString()), profileData, { merge: true });

			// Write semesters to subcollection if provided
			if (semesters && semesters.length > 0) {
				await this.saveSemesters(profile.id, semesters);
			}

			return { success: true, profile: { ...profileData, semesters } as GPAProfile };
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
			const idStr = profileId.toString();
			// profileId may be stored as string OR number in share docs — query both
			const idNum = Number(profileId);
			const idVariants: Array<string | number> = isNaN(idNum) ? [idStr] : [idStr, idNum];

			// Delete main profile doc
			batch.delete(doc(this.userProfilesRef, idStr));

			// Delete all gpaAndMarks subcollection docs
			const semSnapshot = await getDocs(this.gpaAndMarksRef(profileId));
			semSnapshot.docs.forEach((d) => batch.delete(d.ref));

			// Delete all attendanceData subcollection docs
			const attRef = collection(db, "users", this.userId, "profiles", idStr, "attendanceData");
			const attSnapshot = await getDocs(attRef);
			attSnapshot.docs.forEach((d) => batch.delete(d.ref));

			// Delete leaderboard entry
			batch.delete(doc(db, "leaderboard", `${this.userId}_${idStr}`));

			// Clean up outgoing share records
			await this._cleanupOutgoingShares(batch, idVariants);

			await batch.commit();
			return { success: true };
		} catch (error) {
			console.error("Error deleting profile:", error);
			return { success: false, error: (error as Error).message };
		}
	}

	// Clean up userShares/{owner}/outgoing + each recipient's incoming entry
	private async _cleanupOutgoingShares(
		batch: ReturnType<typeof writeBatch>,
		idVariants: Array<string | number>
	): Promise<void> {
		// Fetch once for each stored type variant (string & number) to handle legacy data
		const snapshots = await Promise.all(
			idVariants.map((v) => getDocs(query(this.outgoingSharesRef, where("profileId", "==", v))))
		);

		const seen = new Set<string>();
		snapshots.flatMap((s) => s.docs).forEach((shareDoc) => {
			if (seen.has(shareDoc.id)) return;
			seen.add(shareDoc.id);
			const { targetUserId } = shareDoc.data() as { targetUserId: string };
			batch.delete(doc(this.outgoingSharesRef, shareDoc.id));
			batch.delete(doc(db, "userShares", targetUserId, "incoming", shareDoc.id));
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

	// ===== USER-SPECIFIC SHARING =====

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

	private async _executeShareOperation(shareData: ShareData, _profile: GPAProfile, _permission: "read" | "edit"): Promise<void> {
		const batch = writeBatch(db);
		const { shareId, targetUserId } = shareData;

		batch.set(doc(this.outgoingSharesRef, shareId), shareData);
		batch.set(doc(db, "userShares", targetUserId, "incoming", shareId), shareData);

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
		const { profileId, permission, ownerUserId } = shareData;

		const profileData = await this._getProfileDataByPermission(shareData);
		if (!profileData) return null;

		const colRef = this.gpaAndMarksRefForUser(ownerUserId, profileId);
		const semSnap = await getDocs(colRef);
		const semesters = semSnap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as GPASemester));

		return {
			...profileData,
			semesters,
			id: profileId,
			permission: permission as "read" | "edit",
			ownerUserId,
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
		const { targetUserId } = shareData;

		batch.delete(doc(this.outgoingSharesRef, shareId));
		batch.delete(doc(db, "userShares", targetUserId, "incoming", shareId));

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
		const { targetUserId } = shareData;

		const updatedShareData = { ...shareData, permission: newPermission, updatedAt: serverTimestamp() };
		batch.update(doc(this.outgoingSharesRef, shareId), updatedShareData as DocumentData);
		batch.update(doc(db, "userShares", targetUserId, "incoming", shareId), updatedShareData as DocumentData);

		await batch.commit();
		return updatedShareData;
	}

	async saveProfileWithCollaboration(profile: GPAProfile): Promise<{ success: boolean; profile?: GPAProfile; error?: string }> {
		try {
			// Strip runtime-only fields before writing
			const { semesters, permission: _permission2, isShared: _isShared, ownerUserId: _ownerUserId, ...profileMetadata } = profile;
			const profileData = {
				...profileMetadata,
				updatedAt: serverTimestamp(),
				createdAt: profile.createdAt || serverTimestamp(),
			};

			await this._executeSaveWithCollaboration(profile, profileData);

			// Write semesters to the correct user's subcollection
			if (semesters && semesters.length > 0) {
				const targetUserId = profile.isShared && profile.ownerUserId && profile.ownerUserId !== this.userId
					? profile.ownerUserId
					: this.userId;
				const colRef = this.gpaAndMarksRefForUser(targetUserId, profile.id);
				const batch = writeBatch(db);
				for (const sem of semesters) {
					batch.set(doc(colRef, sem.id.toString()), { id: sem.id, name: sem.name, subjects: sem.subjects || [] });
				}
				await batch.commit();
			}

			return { success: true, profile: { ...profileData, semesters } as GPAProfile };
		} catch (error) {
			console.error("Error saving profile with collaboration:", error);
			return { success: false, error: (error as Error).message };
		}
	}

	private async _executeSaveWithCollaboration(profile: GPAProfile, profileData: Omit<GPAProfile, "semesters">): Promise<void> {
		const batch = writeBatch(db);
		const profileId = profile.id.toString();

		if (profile.isShared && profile.ownerUserId && profile.ownerUserId !== this.userId) {
			const ownerProfileRef = doc(db, "users", profile.ownerUserId, "profiles", profileId);
			batch.set(ownerProfileRef, profileData, { merge: true });
		} else {
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
			const saveResult = await this.saveProfile(newProfile);
			if (!saveResult.success) return { success: false, error: saveResult.error };

			// Copy semesters from owner's subcollection
			const ownerSemRef = this.gpaAndMarksRefForUser(shareData.ownerUserId, shareData.profileId);
			const semSnap = await getDocs(ownerSemRef);
			const semesters = semSnap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as GPASemester));

			if (semesters.length > 0) {
				await this.saveSemesters(newProfile.id, semesters);
			}

			return { success: true, profile: { ...newProfile, semesters } };
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
