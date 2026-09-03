"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword,
	sendPasswordResetEmail,
	signOut,
	onAuthStateChanged,
	signInWithPopup,
	getAdditionalUserInfo,
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
	serverTimestamp,
	collection,
	getDocs,
	writeBatch,
	updateDoc,
} from "firebase/firestore";
import { auth, googleProvider, db } from "./config";
import type { FirebaseError, AuthContextType } from "@/types";
import { STORAGE_KEYS } from "@bhemu/shared";
import { provisionNewUserProfile } from "@bhemu/firebase";

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

	// New-user provisioning is the only place that may create a default profile.
	// Normal login only updates an already-provisioned user document.
	async function saveUserData(user: User, isNewUser = false) {
		if (isNewUser) {
			await provisionNewUserProfile(db, {
				uid: user.uid,
				email: user.email,
				displayName: user.displayName,
				photoURL: user.photoURL,
			});
			return;
		}

		try {
			const userRef = doc(db, "users", user.uid);
			await updateDoc(
				userRef,
				{
					email: user.email,
					displayName: user.displayName || user.email?.split("@")[0] || "User",
					photoURL: user.photoURL || null,
					lastLoginAt: serverTimestamp(),
				}
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

			await saveUserData(result.user, true);
			return result;
		});
	}

	// Sign in with email and password
	function login(email: string, password: string): Promise<UserCredential> {
		return signInWithEmailAndPassword(auth, email, password).then(async (result) => {
			await saveUserData(result.user);
			return result;
		});
	}

	// Sign in with Google
	function signInWithGoogle(): Promise<UserCredential> {
		return signInWithPopup(auth, googleProvider).then(async (result) => {
			await saveUserData(result.user, getAdditionalUserInfo(result)?.isNewUser ?? false);
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
			await updateDoc(
				userRef,
				{
					displayName: newDisplayName,
					updatedAt: serverTimestamp(),
				}
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
			await updateDoc(
				userRef,
				{
					hasPassword: true,
					updatedAt: serverTimestamp(),
				}
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
		
		// Don't fallback if the user explicitly cancelled or if the popup was blocked
		const userCancelledCodes = [
			"auth/popup-closed-by-user",
			"auth/cancelled-popup-request",
			"auth/popup-blocked"
		];

		if (err.code && userCancelledCodes.includes(err.code)) {
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
	async function _executeComprehensiveDataDeletion(userId: string, _userEmail: string) {
		const batchManager = _createBatchManager();

		// Delete user data in organized steps
		await _deleteUserCollections(userId, batchManager);
		await _deleteUserDocuments(userId, batchManager);

		// Set flag BEFORE committing — prevents GpaDataContext from auto-recreating a default
		// profile when it sees 0 profiles after the batch deletes them all.
		try { localStorage.setItem(STORAGE_KEYS.accountDeleting, "1"); } catch {}

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
		// Delete profiles and their subcollections (Firestore doesn't cascade)
		const profilesSnap = await getDocs(collection(db, "users", userId, "profiles"));
		for (const profileDoc of profilesSnap.docs) {
			for (const nested of ["gpaAndMarks", "attendanceData"]) {
				const nestedSnap = await getDocs(collection(profileDoc.ref, nested));
				nestedSnap.docs.forEach((d) => batchManager.add((batch) => batch.delete(d.ref)));
			}
			batchManager.add((batch) => batch.delete(profileDoc.ref));
			// Delete leaderboard entry for this profile
			batchManager.add((batch) => batch.delete(doc(db, "leaderboard", `${userId}_${profileDoc.id}`)));
		}

		// Delete users/{userId}/sharedProfiles
		const sharedProfilesSnap = await getDocs(collection(db, "users", userId, "sharedProfiles"));
		sharedProfilesSnap.docs.forEach((d) => batchManager.add((batch) => batch.delete(d.ref)));

		// Delete outgoing shares + mirror-delete the corresponding incoming doc in each target user's space.
		// We read the docs first (before deleting) to get targetUserId from the data.
		const outgoingSnap = await getDocs(collection(db, "userShares", userId, "outgoing"));
		for (const outDoc of outgoingSnap.docs) {
			const targetUserId = outDoc.data().targetUserId as string | undefined;
			if (targetUserId) {
				// Remove the mirrored incoming entry that lives under the target user
				batchManager.add((batch) => batch.delete(doc(db, "userShares", targetUserId, "incoming", outDoc.id)));
			}
			batchManager.add((batch) => batch.delete(outDoc.ref));
		}

		// Delete incoming shares + mirror-delete the corresponding outgoing doc in each owner user's space.
		const incomingSnap = await getDocs(collection(db, "userShares", userId, "incoming"));
		for (const inDoc of incomingSnap.docs) {
			const ownerUserId = inDoc.data().ownerUserId as string | undefined;
			if (ownerUserId) {
				// Remove the mirrored outgoing entry that lives under the owner user
				batchManager.add((batch) => batch.delete(doc(db, "userShares", ownerUserId, "outgoing", inDoc.id)));
			}
			batchManager.add((batch) => batch.delete(inDoc.ref));
		}
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
			await updateDoc(
				userRef,
				{
					passwordUpdatedAt: serverTimestamp(),
					updatedAt: serverTimestamp(),
				}
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
		const unsubscribe = onAuthStateChanged(auth, (user) => {
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

// Brand-conforming Dark loading component matching bCampus styles
const AppLoading = () => (
	<div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground relative overflow-hidden bg-grid-pattern bg-hero-glow">
		<div className="relative z-10 text-center px-4">
			<div className="w-16 h-16 mx-auto mb-6 relative">
				<div className="absolute inset-0 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
				<div className="absolute inset-2 border-4 border-accent/20 border-b-accent rounded-full animate-spin [animation-direction:reverse]"></div>
			</div>
			<h2 className="text-2xl font-bold tracking-tight text-gradient-brand mb-2">
				bCampus
			</h2>
			<p className="text-muted-foreground text-sm max-w-xs mx-auto">
				Establishing secure session and synchronizing cloud workspace...
			</p>
		</div>
	</div>
);
