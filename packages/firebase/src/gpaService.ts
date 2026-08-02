import {
	collection,
	doc,
	getDoc,
	getDocs,
	query,
	where,
	orderBy,
	limit,
	serverTimestamp,
	writeBatch,
	updateDoc,
	onSnapshot,
	type Firestore,
	type CollectionReference,
	type DocumentData,
	type Unsubscribe,
} from "firebase/firestore";
import type { GPASubject, GPASemester, GPAProfile, ShareData } from "@bhemu/shared";

export type { GPASubject, GPASemester, GPAProfile, ShareData };

type CreateProfileInput = Omit<
	GPAProfile,
	| "id"
	| "semesters"
	| "createdAt"
	| "updatedAt"
	| "isShared"
	| "ownerUserId"
	| "permission"
	| "lastOpened"
>;

function profileFromSnapshot(id: string, data: Omit<GPAProfile, "id">): GPAProfile {
	// The document id is canonical. Older documents may contain a stale `id`
	// field, so never allow document data to override it.
	return { ...data, id };
}

function profileMetadataForCreate(profile: CreateProfileInput): Omit<CreateProfileInput, "isDefault"> {
	const { isDefault: _isDefault, ...metadata } = profile;
	return metadata;
}

function profileMetadataForUpdate(profile: GPAProfile): Record<string, unknown> {
	const {
		id: _id,
		semesters: _semesters,
		isDefault: _isDefault,
		createdAt: _createdAt,
		updatedAt: _updatedAt,
		isShared: _isShared,
		ownerUserId: _ownerUserId,
		permission: _permission,
		lastOpened: _lastOpened,
		...metadata
	} = profile;
	return metadata;
}

export class GPAService {
	private db: Firestore;
	private userId: string;
	private userProfilesRef: CollectionReference<DocumentData>;
	private outgoingSharesRef: CollectionReference<DocumentData>;
	private incomingSharesRef: CollectionReference<DocumentData>;
	private _userIdCache?: Map<string, string | null>;

	constructor(db: Firestore, userId: string) {
		this.db = db;
		this.userId = userId;
		this.userProfilesRef = collection(db, "users", userId, "profiles");
		this.outgoingSharesRef = collection(db, "userShares", userId, "outgoing");
		this.incomingSharesRef = collection(db, "userShares", userId, "incoming");
	}

	// ===== GPA & MARKS SUBCOLLECTION =====

	private gpaAndMarksRef(profileId: string | number): CollectionReference<DocumentData> {
		return collection(this.db, "users", this.userId, "profiles", profileId.toString(), "gpaAndMarks");
	}

	private gpaAndMarksRefForUser(userId: string, profileId: string | number): CollectionReference<DocumentData> {
		return collection(this.db, "users", userId, "profiles", profileId.toString(), "gpaAndMarks");
	}

	private ownProfileRef(profileId: string | number) {
		return doc(this.userProfilesRef, profileId.toString());
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
			const batch = writeBatch(this.db);
			const colRef = this.gpaAndMarksRef(profileId);

			const currentIds = new Set<string>();
			for (const semester of semesters) {
				const id = semester.id.toString();
				currentIds.add(id);
				batch.set(doc(colRef, id), { id: semester.id, name: semester.name, subjects: semester.subjects || [] });
			}

			const existingSnap = await getDocs(colRef);
			for (const existing of existingSnap.docs) {
				if (!currentIds.has(existing.id)) {
					batch.delete(existing.ref);
				}
			}

			// `update` is intentional: a stale cache must not recreate a deleted
			// parent profile while writing child data.
			batch.update(this.ownProfileRef(profileId), { updatedAt: serverTimestamp() });

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
			const batch = writeBatch(this.db);
			batch.set(semDoc, { id: semester.id, name: semester.name, subjects: semester.subjects || [] });
			batch.update(this.ownProfileRef(profileId), { updatedAt: serverTimestamp() });
			await batch.commit();
			return { success: true };
		} catch (error) {
			console.error("Error saving semester:", error);
			return { success: false, error: (error as Error).message };
		}
	}

	async deleteSemesterDoc(profileId: string | number, semesterId: string | number): Promise<{ success: boolean; error?: string }> {
		try {
			const semDoc = doc(this.gpaAndMarksRef(profileId), semesterId.toString());
			const batch = writeBatch(this.db);
			batch.delete(semDoc);
			batch.update(this.ownProfileRef(profileId), { updatedAt: serverTimestamp() });
			await batch.commit();
			return { success: true };
		} catch (error) {
			console.error("Error deleting semester doc:", error);
			return { success: false, error: (error as Error).message };
		}
	}

	onSemestersChange(
		profileId: string | number,
		callback: (res: { success: boolean; semesters: GPASemester[]; fromCache?: boolean; error?: string }) => void
	): Unsubscribe {
		try {
			const colRef = this.gpaAndMarksRef(profileId);
			return onSnapshot(
				colRef,
				(snapshot) => {
					const semesters = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as unknown as GPASemester));
					callback({ success: true, semesters, fromCache: snapshot.metadata.fromCache });
				},
				(error) => {
					console.error("Error listening to semesters:", error);
					callback({ success: false, semesters: [], error: error.message });
				}
			);
		} catch (error) {
			console.error("Error setting up semesters listener:", error);
			callback({ success: false, semesters: [], error: (error as Error).message });
			return () => {};
		}
	}

	onSemestersChangeForUser(
		userId: string,
		profileId: string | number,
		callback: (res: { success: boolean; semesters: GPASemester[]; fromCache?: boolean; error?: string }) => void
	): Unsubscribe {
		try {
			const colRef = this.gpaAndMarksRefForUser(userId, profileId);
			return onSnapshot(
				colRef,
				(snapshot) => {
					const semesters = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as unknown as GPASemester));
					callback({ success: true, semesters, fromCache: snapshot.metadata.fromCache });
				},
				(error) => {
					console.error("Error listening to semesters for user:", error);
					callback({ success: false, semesters: [], error: error.message });
				}
			);
		} catch (error) {
			console.error("Error setting up semesters listener for user:", error);
			callback({ success: false, semesters: [], error: (error as Error).message });
			return () => {};
		}
	}

	// ===== PROFILE MANAGEMENT =====

	/** Creates a non-default profile and its initial semesters atomically. */
	async createProfile(
		profile: CreateProfileInput,
		initialSemesters: GPASemester[] = []
	): Promise<{ success: boolean; profile?: GPAProfile; error?: string }> {
		try {
			if (profile.isDefault === true) {
				return { success: false, error: "Default profiles may only be created during signup" };
			}
			if (initialSemesters.length > 499) {
				return { success: false, error: "Too many semesters to create atomically" };
			}

			const profileRef = doc(this.userProfilesRef);
			const createdProfile: GPAProfile = {
				...profileMetadataForCreate(profile),
				id: profileRef.id,
				name: profile.name,
				isDefault: false,
			};
			const batch = writeBatch(this.db);
			batch.set(profileRef, {
				...profileMetadataForCreate(profile),
				name: profile.name,
				isDefault: false,
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
			});
			for (const semester of initialSemesters) {
				batch.set(doc(profileRef, "gpaAndMarks", String(semester.id)), {
					id: semester.id,
					name: semester.name,
					subjects: semester.subjects || [],
				});
			}
			await batch.commit();
			return { success: true, profile: { ...createdProfile, semesters: initialSemesters } };
		} catch (error) {
			console.error("Error creating profile:", error);
			return { success: false, error: (error as Error).message };
		}
	}

	/**
	 * Compatibility wrapper for callers that update an existing profile. It
	 * deliberately uses `updateDoc`, so it can never recreate a missing profile.
	 */
	async saveProfile(profile: GPAProfile): Promise<{ success: boolean; profile?: GPAProfile; error?: string }> {
		try {
			await updateDoc(this.ownProfileRef(profile.id), {
				...profileMetadataForUpdate(profile),
				updatedAt: serverTimestamp(),
			});

			if (profile.semesters !== undefined) {
				const semestersResult = await this.saveSemesters(profile.id, profile.semesters);
				if (!semestersResult.success) return semestersResult;
			}

			return { success: true, profile };
		} catch (error) {
			console.error("Error saving profile:", error);
			return { success: false, error: (error as Error).message };
		}
	}

	async renameProfile(profileId: string | number, newName: string, ownerUserId?: string): Promise<void> {
		const ref = ownerUserId
			? doc(this.db, "users", ownerUserId, "profiles", profileId.toString())
			: this.ownProfileRef(profileId);
		await updateDoc(ref, { name: newName, updatedAt: serverTimestamp() });
	}

	async updateLastOpened(profileId: string | number): Promise<void> {
		try {
			await updateDoc(this.ownProfileRef(profileId), { lastOpened: serverTimestamp() });
		} catch (error) {
			console.error("Error updating lastOpened:", error);
		}
	}

	async getProfiles(): Promise<{ success: boolean; profiles: GPAProfile[]; error?: string }> {
		try {
			const snapshot = await getDocs(query(this.userProfilesRef, orderBy("createdAt", "desc")));
			const profiles = snapshot.docs.map((d) =>
				profileFromSnapshot(d.id, d.data() as Omit<GPAProfile, "id">)
			);

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
				return {
					success: true,
					profile: profileFromSnapshot(docSnap.id, docSnap.data() as Omit<GPAProfile, "id">),
				};
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
			const batch = writeBatch(this.db);
			const idStr = profileId.toString();
			const profileSnapshot = await getDoc(this.ownProfileRef(idStr));
			if (!profileSnapshot.exists()) return { success: false, error: "Profile not found" };
			if (profileSnapshot.data().isDefault === true) {
				return { success: false, error: "The default profile cannot be deleted" };
			}
			const idNum = Number(profileId);
			const idVariants: Array<string | number> = isNaN(idNum) ? [idStr] : [idStr, idNum];

			batch.delete(this.ownProfileRef(idStr));

			const semSnapshot = await getDocs(this.gpaAndMarksRef(profileId));
			semSnapshot.docs.forEach((d) => batch.delete(d.ref));

			const attRef = collection(this.db, "users", this.userId, "profiles", idStr, "attendanceData");
			const attSnapshot = await getDocs(attRef);
			attSnapshot.docs.forEach((d) => batch.delete(d.ref));

			batch.delete(doc(this.db, "leaderboard", `${this.userId}_${idStr}`));

			await this._cleanupOutgoingShares(batch, idVariants);
			await batch.commit();
			return { success: true };
		} catch (error) {
			console.error("Error deleting profile:", error);
			return { success: false, error: (error as Error).message };
		}
	}

	private async _cleanupOutgoingShares(
		batch: ReturnType<typeof writeBatch>,
		idVariants: Array<string | number>
	): Promise<void> {
		const snapshots = await Promise.all(
			idVariants.map((v) => getDocs(query(this.outgoingSharesRef, where("profileId", "==", v))))
		);

		const seen = new Set<string>();
		snapshots.flatMap((s) => s.docs).forEach((shareDoc) => {
			if (seen.has(shareDoc.id)) return;
			seen.add(shareDoc.id);
			const { targetUserId } = shareDoc.data() as { targetUserId: string };
			batch.delete(doc(this.outgoingSharesRef, shareDoc.id));
			batch.delete(doc(this.db, "userShares", targetUserId, "incoming", shareDoc.id));
		});
	}

	// ===== REAL-TIME LISTENERS =====

	onProfilesChange(
		callback: (res: { success: boolean; profiles: GPAProfile[]; fromCache?: boolean; error?: string }) => void
	): Unsubscribe {
		try {
			const q = query(this.userProfilesRef, orderBy("createdAt", "desc"));
			return onSnapshot(
				q,
				(snapshot) => {
					const profiles = snapshot.docs.map((d) =>
						profileFromSnapshot(d.id, d.data() as Omit<GPAProfile, "id">)
					);

					const sortedProfiles = profiles.sort((a, b) => {
						if (a.isDefault && !b.isDefault) return -1;
						if (!a.isDefault && b.isDefault) return 1;
						return (a.name || "").localeCompare(b.name || "");
					});

						callback({ success: true, profiles: sortedProfiles, fromCache: snapshot.metadata.fromCache });
				},
				(error) => {
					console.error("Error listening to profiles:", error);
					callback({ success: false, error: error.message, profiles: [] });
				}
			);
		} catch (error) {
			console.error("Error setting up profiles listener:", error);
			callback({ success: false, error: (error as Error).message, profiles: [] });
			return () => {};
		}
	}

	onProfileChange(profileId: string | number, callback: (res: { success: boolean; profile?: GPAProfile; error?: string }) => void): Unsubscribe {
		try {
			const docRef = doc(this.userProfilesRef, profileId.toString());
			return onSnapshot(
				docRef,
				(docSnap) => {
					if (docSnap.exists()) {
							callback({
								success: true,
								profile: profileFromSnapshot(docSnap.id, docSnap.data() as Omit<GPAProfile, "id">),
							});
					} else {
						callback({ success: false, error: "Profile not found" });
					}
				},
				(error) => {
					console.error("Error listening to profile:", error);
					callback({ success: false, error: error.message });
				}
			);
		} catch (error) {
			console.error("Error setting up profile listener:", error);
			callback({ success: false, error: (error as Error).message });
			return () => {};
		}
	}

	// ===== SHARING =====

	async shareProfileWithUser(profileId: string | number, targetUserEmail: string, permission: "read" | "edit" = "read"): Promise<{ success: boolean; shareId?: string; shareData?: ShareData; error?: string }> {
		try {
			const [profileResult, targetUserId] = await Promise.all([
				this.getProfile(profileId),
				this.getUserIdByEmail(targetUserEmail),
			]);

			if (!profileResult.success || !profileResult.profile) return { success: false, error: "Profile not found" };
			if (!targetUserId) return { success: false, error: "User not found" };

			const shareId = this.generateShareId();
			const shareData = this._createShareData(shareId, profileId, profileResult.profile.name, targetUserId, targetUserEmail, permission);

			await this._executeShareOperation(shareData);
			return { success: true, shareId, shareData };
		} catch (error) {
			console.error("Error sharing profile with user:", error);
			return { success: false, error: (error as Error).message };
		}
	}

	private _createShareData(shareId: string, profileId: string | number, profileName: string, targetUserId: string, targetUserEmail: string, permission: "read" | "edit"): ShareData {
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

	private async _executeShareOperation(shareData: ShareData): Promise<void> {
		const batch = writeBatch(this.db);
		const { shareId, targetUserId } = shareData;
		batch.set(doc(this.outgoingSharesRef, shareId), shareData);
		batch.set(doc(this.db, "userShares", targetUserId, "incoming", shareId), shareData);
		await batch.commit();
	}

	async getSharedWithMeProfiles(
		incomingShares?: ShareData[]
	): Promise<{ success: boolean; sharedProfiles: GPAProfile[]; error?: string }> {
		try {
			const shares = incomingShares ?? (await getDocs(query(this.incomingSharesRef, where("isActive", "==", true))))
				.docs.map((docSnap) => docSnap.data() as ShareData);
			const sharePromises = shares.map((share) => this._buildSharedProfile(share));
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

		return { ...profileData, semesters, id: profileId, permission: permission as "read" | "edit", ownerUserId, isShared: true };
	}

	async getMySharedProfiles(): Promise<{ success: boolean; sharedProfiles: ShareData[]; error?: string }> {
		try {
			const snapshot = await getDocs(query(this.outgoingSharesRef, where("isActive", "==", true)));
			const sharedProfiles = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as ShareData));
			return { success: true, sharedProfiles };
		} catch (error) {
			console.error("Error fetching my shared profiles:", error);
			return { success: false, error: (error as Error).message, sharedProfiles: [] };
		}
	}

	async unshareProfileWithUser(shareId: string): Promise<{ success: boolean; error?: string }> {
		try {
			const shareSnap = await getDoc(doc(this.outgoingSharesRef, shareId));
			if (!shareSnap.exists()) return { success: false, error: "Share not found" };

			const shareData = shareSnap.data() as ShareData;
			const batch = writeBatch(this.db);
			batch.delete(doc(this.outgoingSharesRef, shareId));
			batch.delete(doc(this.db, "userShares", shareData.targetUserId, "incoming", shareId));
			await batch.commit();
			return { success: true };
		} catch (error) {
			console.error("Error unsharing profile with user:", error);
			return { success: false, error: (error as Error).message };
		}
	}

	async updateSharePermission(shareId: string, newPermission: "read" | "edit"): Promise<{ success: boolean; shareData?: ShareData; error?: string }> {
		try {
			const shareSnap = await getDoc(doc(this.outgoingSharesRef, shareId));
			if (!shareSnap.exists()) return { success: false, error: "Share not found" };

			const shareData = shareSnap.data() as ShareData;
			if (shareData.permission === newPermission) return { success: true, shareData };

			const updatedShareData = { ...shareData, permission: newPermission, updatedAt: serverTimestamp() };
			const batch = writeBatch(this.db);
			batch.update(doc(this.outgoingSharesRef, shareId), updatedShareData as DocumentData);
			batch.update(doc(this.db, "userShares", shareData.targetUserId, "incoming", shareId), updatedShareData as DocumentData);
			await batch.commit();
			return { success: true, shareData: updatedShareData };
		} catch (error) {
			console.error("Error updating share permission:", error);
			return { success: false, error: (error as Error).message };
		}
	}

	async saveProfileWithCollaboration(profile: GPAProfile): Promise<{ success: boolean; profile?: GPAProfile; error?: string }> {
		try {
			const { semesters, permission: _permission, isShared: _isShared, ownerUserId: _ownerUserId, ...profileMetadata } = profile;
			const profileData = {
				...profileMetadata,
				updatedAt: serverTimestamp(),
				createdAt: profile.createdAt || serverTimestamp(),
			};

			const batch = writeBatch(this.db);
			const profileId = profile.id.toString();
			if (profile.isShared && profile.ownerUserId && profile.ownerUserId !== this.userId) {
				batch.update(doc(this.db, "users", profile.ownerUserId, "profiles", profileId), profileData);
			} else {
				batch.update(doc(this.userProfilesRef, profileId), profileData);
			}
			await batch.commit();

			if (semesters && semesters.length > 0) {
				const targetUserId = profile.isShared && profile.ownerUserId && profile.ownerUserId !== this.userId
					? profile.ownerUserId
					: this.userId;
				const colRef = this.gpaAndMarksRefForUser(targetUserId, profile.id);
				const semBatch = writeBatch(this.db);
				for (const sem of semesters) {
					semBatch.set(doc(colRef, sem.id.toString()), { id: sem.id, name: sem.name, subjects: sem.subjects || [] });
				}
				await semBatch.commit();
			}

			return { success: true, profile: { ...profileData, semesters } as GPAProfile };
		} catch (error) {
			console.error("Error saving profile with collaboration:", error);
			return { success: false, error: (error as Error).message };
		}
	}

	onCollaborativeProfileChange(profileId: string | number, ownerUserId: string, callback: (res: { success: boolean; profile?: GPAProfile; error?: string }) => void): Unsubscribe {
		try {
			const docRef = doc(this.db, "users", ownerUserId, "profiles", profileId.toString());
			return onSnapshot(
				docRef,
				(docSnap) => {
					if (docSnap.exists()) {
						callback({ success: true, profile: { id: docSnap.id, ...(docSnap.data() as Omit<GPAProfile, "id">) } });
					} else {
						callback({ success: false, error: "Profile not found" });
					}
				},
				(error) => {
					console.error("Error listening to collaborative profile:", error);
					callback({ success: false, error: error.message });
				}
			);
		} catch (error) {
			console.error("Error setting up collaborative profile listener:", error);
			callback({ success: false, error: (error as Error).message });
			return () => {};
		}
	}

	onIncomingSharesChange(callback: (res: { success: boolean; shares: unknown[]; error?: string }) => void): Unsubscribe {
		try {
			const q = query(this.incomingSharesRef, where("isActive", "==", true));
			return onSnapshot(
				q,
				(snapshot) => {
					const shares = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
					callback({ success: true, shares });
				},
				(error) => {
					console.error("Error listening to incoming shares:", error);
					callback({ success: false, error: error.message, shares: [] });
				}
			);
		} catch (error) {
			console.error("Error setting up incoming shares listener:", error);
			callback({ success: false, error: (error as Error).message, shares: [] });
			return () => {};
		}
	}

	async copySharedProfileToMyAccount(shareId: string, newProfileName?: string): Promise<{ success: boolean; profile?: GPAProfile; error?: string }> {
		try {
			const shareSnap = await getDoc(doc(this.incomingSharesRef, shareId));
			if (!shareSnap.exists()) return { success: false, error: "Share not found" };

			const shareData = shareSnap.data() as ShareData;
			const profileData = await this._getProfileDataByPermission(shareData);
			if (!profileData) return { success: false, error: "Profile data not found" };

			// Fetch the source semesters before creating the profile so
			// createProfile can write everything in one atomic batch.
			const ownerSemRef = this.gpaAndMarksRefForUser(shareData.ownerUserId, shareData.profileId);
			const semSnap = await getDocs(ownerSemRef);
			const semesters = semSnap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as GPASemester));

			const result = await this.createProfile(
				{
					name: newProfileName || `Copy of ${profileData.name}`,
					isDefault: false,
					copiedFrom: {
						shareId: shareData.shareId,
						originalUserId: shareData.ownerUserId,
						originalProfileId: shareData.profileId,
						copiedAt: serverTimestamp(),
					},
				},
				semesters,
			);
			if (!result.success) return { success: false, error: result.error };

			return { success: true, profile: { ...result.profile!, semesters } };
		} catch (error) {
			console.error("Error copying shared profile:", error);
			return { success: false, error: (error as Error).message };
		}
	}

	private async _getProfileDataByPermission(shareData: ShareData): Promise<GPAProfile | null> {
		const profileRef = doc(this.db, "users", shareData.ownerUserId, "profiles", shareData.profileId.toString());
		const profileSnap = await getDoc(profileRef);
		return profileSnap.exists() ? (profileSnap.data() as GPAProfile) : null;
	}

	async getUserIdByEmail(email: string): Promise<string | null> {
		try {
			if (this._userIdCache?.has(email)) return this._userIdCache.get(email) || null;

			const usersRef = collection(this.db, "users");
			const q = query(usersRef, where("email", "==", email), limit(1));
			const snapshot = await getDocs(q);

			const userId = snapshot.empty ? null : snapshot.docs[0].id;
			if (!this._userIdCache) this._userIdCache = new Map();
			this._userIdCache.set(email, userId);
			return userId;
		} catch (error) {
			console.error("Error getting user ID by email:", error);
			return null;
		}
	}

	generateShareId(): string {
		return Date.now().toString(36) + Math.random().toString(36).substring(2);
	}
}

export function createGPAService(db: Firestore, userId: string): GPAService {
	if (!userId) throw new Error("User ID is required to create GPA service");
	return new GPAService(db, userId);
}
