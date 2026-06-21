"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword,
	sendPasswordResetEmail,
	signOut,
	onAuthStateChanged,
	signInWithPopup,
	updateProfile,
	EmailAuthProvider,
	linkWithCredential,
	deleteUser,
	reauthenticateWithCredential,
	reauthenticateWithPopup,
	updatePassword,
	User,
	UserCredential,
} from "firebase/auth";
import {
	doc,
	setDoc,
	serverTimestamp,
	collection,
	getDocs,
	writeBatch,
	query,
	where,
	arrayRemove,
} from "firebase/firestore";
import { auth, googleProvider, db } from "./config";
import type { FirebaseError, AuthContextType } from "@/types";

// Re-export auth types for consumers of this module
export type { AuthContextType };

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [currentUser, setCurrentUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	// Save user data to Firestore for email lookup
	async function saveUserData(user: User) {
		try {
			const userRef = doc(db, "users", user.uid);
			await setDoc(
				userRef,
				{
					email: user.email,
					displayName: user.displayName || user.email?.split("@")[0] || "User",
					photoURL: user.photoURL || null,
					createdAt: serverTimestamp(),
					lastLoginAt: serverTimestamp(),
				},
				{ merge: true }
			);
		} catch (error) {
			console.error("Error saving user data:", error);
		}
	}

	// Sign up with email and password
	function signup(email: string, password: string, displayName?: string): Promise<UserCredential> {
		return createUserWithEmailAndPassword(auth, email, password).then(async (result) => {
			if (displayName) {
				await updateProfile(result.user, { displayName });
			}

			// Save user data for email lookup
			await saveUserData(result.user);

			return result;
		});
	}

	// Sign in with email and password
	function login(email: string, password: string): Promise<UserCredential> {
		return signInWithEmailAndPassword(auth, email, password).then(async (result) => {
			// Update last login time
			await saveUserData(result.user);
			return result;
		});
	}

	// Sign in with Google
	function signInWithGoogle(): Promise<UserCredential> {
		return signInWithPopup(auth, googleProvider).then(async (result) => {
			// Save user data for email lookup
			await saveUserData(result.user);
			return result;
		});
	}

	// Sign out
	function logout(): Promise<void> {
		// Clear all local storage & session storage data for safety
		localStorage.clear();
		sessionStorage.clear();

		return signOut(auth);
	}

	// Reset password
	function resetPassword(email: string): Promise<void> {
		return sendPasswordResetEmail(auth, email);
	}

	// Update display name
	async function updateDisplayName(newDisplayName: string): Promise<{ success: boolean; error?: string }> {
		try {
			if (!auth.currentUser) throw new Error("No authenticated user");
			await updateProfile(auth.currentUser, { displayName: newDisplayName });

			// Update in Firestore
			const userRef = doc(db, "users", auth.currentUser.uid);
			await setDoc(
				userRef,
				{
					displayName: newDisplayName,
					updatedAt: serverTimestamp(),
				},
				{ merge: true }
			);

			return { success: true };
		} catch (error) {
			console.error("Error updating display name:", error);
			return { success: false, error: error instanceof Error ? error.message : String(error) };
		}
	}

	// Create password for Google account
	async function createPassword(password: string): Promise<{ success: boolean; error?: string }> {
		try {
			if (!auth.currentUser) throw new Error("No authenticated user");
			if (!auth.currentUser.email) throw new Error("User has no email");
			const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
			await linkWithCredential(auth.currentUser, credential);

			// Update user data to indicate password was created
			const userRef = doc(db, "users", auth.currentUser.uid);
			await setDoc(
				userRef,
				{
					hasPassword: true,
					updatedAt: serverTimestamp(),
				},
				{ merge: true }
			);

			return { success: true };
		} catch (error) {
			console.error("Error creating password:", error);
			return { success: false, error: error instanceof Error ? error.message : String(error) };
		}
	}

	// Delete all user data with comprehensive cleanup
	async function deleteAllUserData(
		password: string | null = null,
		useGoogleAuth: boolean = false
	): Promise<{ success: boolean; error?: string; requiresPassword?: boolean; requiresRelogin?: boolean }> {
		try {
			if (!auth.currentUser) {
				throw new Error("No user logged in");
			}

			const originalUserId = auth.currentUser.uid;
			const originalUserEmail = auth.currentUser.email || "";

			// Secure re-authentication
			await _performSecureReAuthentication(originalUserId, originalUserEmail, password, useGoogleAuth);

			// Comprehensive data deletion
			console.log(`Starting data deletion for: ${originalUserEmail}`);
			await _executeComprehensiveDataDeletion(originalUserId, originalUserEmail);

			// Finalize account deletion
			localStorage.clear();
			sessionStorage.clear();
			await deleteUser(auth.currentUser);

			console.log("Account deletion completed successfully");
			return { success: true };
		} catch (error) {
			console.error("Account deletion error:", error);
			return _handleDeletionError(error);
		}
	}

	// Secure re-authentication with account verification
	async function _performSecureReAuthentication(
		originalUserId: string,
		originalUserEmail: string,
		password: string | null,
		useGoogleAuth: boolean = false
	) {
		const hasPass = hasPassword();
		const hasGoogle = isGoogleUser();

		if (useGoogleAuth && hasGoogle) {
			// User explicitly chose Google authentication
			await _performGoogleReAuth(originalUserId, originalUserEmail);
		} else if (hasPass && !useGoogleAuth) {
			// Use password authentication (default for accounts with password)
			if (!password) {
				throw { code: "auth/requires-password", message: "Password required for account deletion" };
			}
			if (!auth.currentUser || !auth.currentUser.email) throw new Error("No authenticated user");
			const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
			await reauthenticateWithCredential(auth.currentUser, credential);
		} else if (hasGoogle && !hasPass) {
			// Google-only account
			await _performGoogleReAuth(originalUserId, originalUserEmail);
		} else {
			// No authentication method available
			throw { code: "auth/no-auth-method", message: "No authentication method available for this account" };
		}
	}

	// Perform Google re-authentication
	async function _performGoogleReAuth(originalUserId: string, originalUserEmail: string) {
		try {
			if (!auth.currentUser) throw new Error("No authenticated user");
			// Primary: Safe re-authentication without session switching
			const result = await reauthenticateWithPopup(auth.currentUser, googleProvider);
			_verifyAccountMatch(result.user, originalUserId, originalUserEmail);
		} catch (error) {
			// Fallback: Manual verification with immediate logout on mismatch
			await _handleGoogleReAuthFallback(originalUserId, originalUserEmail, error);
		}
	}

	// Handle Google re-authentication fallback
	async function _handleGoogleReAuthFallback(originalUserId: string, originalUserEmail: string, primaryError: unknown) {
		const err = primaryError as FirebaseError;
		const fallbackCodes = [
			"auth/operation-not-supported-in-this-environment",
			"auth/invalid-credential",
			"auth/operation-not-allowed",
		];

		if (!err.code || !fallbackCodes.includes(err.code)) {
			throw primaryError;
		}

		const result = await signInWithPopup(auth, googleProvider);

		// Critical security check
		if (result.user.uid !== originalUserId || result.user.email !== originalUserEmail) {
			await signOut(auth); // Immediately sign out wrong account
			throw {
				code: "auth/user-mismatch",
				message: `Account mismatch! Expected '${originalUserEmail}' but got '${result.user.email}'. You've been signed out for security.`,
				requiresRelogin: true,
			};
		}
	}

	// Verify account matches original
	function _verifyAccountMatch(user: User, originalUserId: string, originalUserEmail: string) {
		if (user.uid !== originalUserId || user.email !== originalUserEmail) {
			throw {
				code: "auth/user-mismatch",
				message: `Account verification failed. Expected '${originalUserEmail}' but got '${user.email}'.`,
			};
		}
	}

	// Execute comprehensive data deletion with batch management
	async function _executeComprehensiveDataDeletion(userId: string, userEmail: string) {
		const batchManager = _createBatchManager();

		// Delete user data in organized steps
		await _deleteUserCollections(userId, batchManager);
		await _cleanupCrossUserReferences(userId, userEmail, batchManager);
		await _deleteUserDocuments(userId, batchManager);

		// Commit all batches
		await _commitBatches(batchManager);
	}

	// Create batch management system
	interface BatchManager {
		add: (operation: (batch: ReturnType<typeof writeBatch>) => void) => void;
		finalize: () => Array<ReturnType<typeof writeBatch>>;
	}

	function _createBatchManager(): BatchManager {
		const batches: Array<ReturnType<typeof writeBatch>> = [];
		let currentBatch = writeBatch(db);
		let operationCount = 0;

		return {
			add: (operation) => {
				if (operationCount >= 450) {
					batches.push(currentBatch);
					currentBatch = writeBatch(db);
					operationCount = 0;
				}
				operation(currentBatch);
				operationCount++;
			},
			finalize: () => {
				if (operationCount > 0) {
					batches.push(currentBatch);
				}
				return batches;
			},
		};
	}

	// Delete user's own collections
	async function _deleteUserCollections(userId: string, batchManager: BatchManager) {
		const collections = [
			["users", userId, "profiles"],
			["users", userId, "sharedProfiles"],
			["userShares", userId, "outgoing"],
			["userShares", userId, "incoming"],
		];

		for (const collectionPath of collections) {
			const snapshot = await getDocs(collection(db, collectionPath[0], collectionPath[1], collectionPath[2]));
			snapshot.docs.forEach((doc) => batchManager.add((batch) => batch.delete(doc.ref)));
		}
	}

	// Clean up cross-user references
	async function _cleanupCrossUserReferences(userId: string, userEmail: string, batchManager: BatchManager) {
		await Promise.all([
			_cleanupCollaborativeProfilesEnhanced(batchManager.add, userId),
			_cleanupUserReferencesInSharesEnhanced(batchManager.add, userId, userEmail),
			_cleanupLegacySharedProfilesEnhanced(batchManager.add, userId, userEmail),
		]);
	}

	// Delete user documents
	async function _deleteUserDocuments(userId: string, batchManager: BatchManager) {
		batchManager.add((batch) => batch.delete(doc(db, "userShares", userId)));
		batchManager.add((batch) => batch.delete(doc(db, "users", userId)));
	}

	// Commit all batches sequentially
	async function _commitBatches(batchManager: BatchManager) {
		const batches = batchManager.finalize();
		console.log(`Committing ${batches.length} batch(es)...`);

		for (let i = 0; i < batches.length; i++) {
			try {
				await batches[i].commit();
			} catch (error) {
				console.error(`Batch ${i + 1} commit failed:`, error);
			}
		}
	}

	// Handle deletion errors
	function _handleDeletionError(error: unknown) {
		const err = error as FirebaseError;
		const errorMap: Record<string, { error: string; requiresPassword?: boolean; requiresRelogin?: boolean }> = {
			"auth/requires-password": { error: "Password required for account deletion", requiresPassword: true },
			"auth/wrong-password": { error: "Incorrect password. Please try again." },
			"auth/popup-closed-by-user": { error: "Authentication cancelled. Please try again." },
			"auth/user-mismatch": {
				error: "User mismatch. Please try again. Please select the correct Google account for deletion.",
				requiresRelogin: err.requiresRelogin,
			},
			"auth/requires-recent-login": { error: "Please log out and log back in before deleting your account" },
			"auth/network-request-failed": { error: "Network error. Please check your connection and try again." },
			"auth/no-auth-method": {
				error: "No authentication method available for this account. Please contact support.",
			},
		};

		const code = err.code || "";
		const mapped = errorMap[code] || { error: err.message || "Failed to delete account. Please try again." };

		return {
			success: false,
			...mapped,
		};
	}

	// Enhanced Helper: Clean up collaborative profiles on account deletion
	async function _cleanupCollaborativeProfilesEnhanced(
		addToBatch: (operation: (batch: ReturnType<typeof writeBatch>) => void) => void,
		userId: string
	) {
		try {
			const collaborativeProfilesRef = collection(db, "collaborativeProfiles");
			const allCollaborativeProfiles = await getDocs(collaborativeProfilesRef);

			allCollaborativeProfiles.docs.forEach((docSnap) => {
				const profileData = docSnap.data();
				const profileId = docSnap.id;

				if (profileData.permissions && profileData.permissions[userId] === "owner") {
					addToBatch((batch) => batch.delete(doc(collaborativeProfilesRef, profileId)));
				} else if (profileData.collaborators && profileData.collaborators.includes(userId)) {
					addToBatch((batch) =>
						batch.update(doc(collaborativeProfilesRef, profileId), {
							collaborators: arrayRemove(userId),
							[`permissions.${userId}`]: null,
							lastModified: serverTimestamp(),
						})
					);
				}
			});
		} catch (error) {
			console.error("Error cleaning up collaborative profiles:", error);
		}
	}

	// Enhanced Helper: Clean up all user references in other users' shares
	async function _cleanupUserReferencesInSharesEnhanced(
		addToBatch: (operation: (batch: ReturnType<typeof writeBatch>) => void) => void,
		userId: string,
		userEmail: string
	) {
		try {
			const usersRef = collection(db, "users");
			const allUsers = await getDocs(usersRef);

			for (const userDoc of allUsers.docs) {
				const otherUserId = userDoc.id;
				if (otherUserId === userId) continue;

				const outgoingSharesRef = collection(db, "userShares", otherUserId, "outgoing");
				const outgoingQuery = query(outgoingSharesRef, where("targetUserId", "==", userId));
				const outgoingSnapshot = await getDocs(outgoingQuery);

				outgoingSnapshot.docs.forEach((doc) => {
					addToBatch((batch) => batch.delete(doc.ref));
				});

				if (userEmail) {
					const outgoingEmailQuery = query(outgoingSharesRef, where("targetUserEmail", "==", userEmail));
					const outgoingEmailSnapshot = await getDocs(outgoingEmailQuery);

					outgoingEmailSnapshot.docs.forEach((doc) => {
						addToBatch((batch) => batch.delete(doc.ref));
					});
				}

				const incomingSharesRef = collection(db, "userShares", otherUserId, "incoming");
				const incomingQuery = query(incomingSharesRef, where("ownerUserId", "==", userId));
				const incomingSnapshot = await getDocs(incomingQuery);

				incomingSnapshot.docs.forEach((doc) => {
					addToBatch((batch) => batch.delete(doc.ref));
				});
			}
		} catch (error) {
			console.error("Error cleaning up user references in shares:", error);
		}
	}

	// Enhanced Helper: Clean up legacy shared profiles
	async function _cleanupLegacySharedProfilesEnhanced(
		addToBatch: (operation: (batch: ReturnType<typeof writeBatch>) => void) => void,
		userId: string,
		userEmail: string
	) {
		try {
			const sharedProfilesRef = collection(db, "sharedProfiles");

			const sharedQuery = query(sharedProfilesRef, where("originalUserId", "==", userId));
			const sharedSnapshot = await getDocs(sharedQuery);

			sharedSnapshot.docs.forEach((doc) => {
				addToBatch((batch) => batch.delete(doc.ref));
			});

			if (userEmail) {
				try {
					const emailQuery = query(sharedProfilesRef, where("originalUserEmail", "==", userEmail));
					const emailSnapshot = await getDocs(emailQuery);

					emailSnapshot.docs.forEach((doc) => {
						addToBatch((batch) => batch.delete(doc.ref));
					});
				} catch (emailError) {
					const msg = emailError instanceof Error ? emailError.message : String(emailError);
					console.log("Email-based cleanup not needed or failed:", msg);
				}
			}

			try {
				const allSharedProfiles = await getDocs(sharedProfilesRef);
				allSharedProfiles.docs.forEach((doc) => {
					const data = doc.data();

					const shouldDelete =
						(data.sharedWith && data.sharedWith.includes(userId)) ||
						(data.sharedWithEmails && userEmail && data.sharedWithEmails.includes(userEmail)) ||
						(data.collaborators && data.collaborators.includes(userId)) ||
						(data.permissions && data.permissions[userId]);

					if (shouldDelete) {
						addToBatch((batch) => batch.delete(doc.ref));
					}
				});
			} catch (allProfilesError) {
				console.error("Error cleaning up shared profiles by user references:", allProfilesError);
			}
		} catch (error) {
			console.error("Error cleaning up legacy shared profiles:", error);
		}
	}

	// Check if user has Google provider
	function isGoogleUser(): boolean {
		return auth.currentUser?.providerData.some((provider) => provider.providerId === "google.com") || false;
	}

	// Check if user has password
	function hasPassword(): boolean {
		return auth.currentUser?.providerData.some((provider) => provider.providerId === "password") || false;
	}

	// Change password
	async function changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
		try {
			if (!auth.currentUser || !auth.currentUser.email) throw new Error("No authenticated user");

			// Re-authenticate user first
			const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
			await reauthenticateWithCredential(auth.currentUser, credential);

			// Update password
			await updatePassword(auth.currentUser, newPassword);

			// Update user data to indicate password was updated
			const userRef = doc(db, "users", auth.currentUser.uid);
			await setDoc(
				userRef,
				{
					passwordUpdatedAt: serverTimestamp(),
					updatedAt: serverTimestamp(),
				},
				{ merge: true }
			);

			return { success: true };
		} catch (error) {
			console.error("Error changing password:", error);
			const err = error as FirebaseError;
			let errorMessage = "Failed to change password";

			if (err.code === "auth/wrong-password") {
				errorMessage = "Current password is incorrect";
			} else if (err.code === "auth/weak-password") {
				errorMessage = "New password is too weak";
			} else if (err.code === "auth/requires-recent-login") {
				errorMessage = "Please log out and log back in before changing your password";
			}

			return { success: false, error: errorMessage };
		}
	}

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				// Update user data on auth state change
				await saveUserData(user);
			}
			setCurrentUser(user);
			setLoading(false);
		});

		return unsubscribe;
	}, []);

	const value = {
		currentUser,
		signup,
		login,
		logout,
		resetPassword,
		signInWithGoogle,
		updateDisplayName,
		createPassword,
		changePassword,
		deleteAllUserData,
		isGoogleUser,
		hasPassword,
	};

	return <AuthContext.Provider value={value}>{loading ? <AppLoading /> : children}</AuthContext.Provider>;
}

// Brand-conforming Dark loading component matching Bhemu Calculator styles
const AppLoading = () => (
	<div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground relative overflow-hidden bg-grid-pattern bg-hero-glow">
		<div className="relative z-10 text-center px-4">
			<div className="w-16 h-16 mx-auto mb-6 relative">
				<div className="absolute inset-0 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
				<div className="absolute inset-2 border-4 border-accent/20 border-b-accent rounded-full animate-spin [animation-direction:reverse]"></div>
			</div>
			<h2 className="text-2xl font-bold tracking-tight text-gradient-brand mb-2">
				Bhemu Calculator
			</h2>
			<p className="text-muted-foreground text-sm max-w-xs mx-auto">
				Establishing secure session and synchronizing cloud workspace...
			</p>
		</div>
	</div>
);
