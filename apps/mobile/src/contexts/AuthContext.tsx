import React, { createContext, useContext, useState, useEffect } from "react";
import {
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword,
	sendPasswordResetEmail,
	signOut,
	onAuthStateChanged,
	getAdditionalUserInfo,
	updateProfile,
	EmailAuthProvider,
	linkWithCredential,
	deleteUser,
	reauthenticateWithCredential,
	updatePassword,
	GoogleAuthProvider,
	signInWithCredential,
	type User,
	type UserCredential,
} from "firebase/auth";
import { doc, serverTimestamp, collection, getDocs, writeBatch, updateDoc } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "@/firebase/config";
import type { FirebaseError, AuthContextType, LaunchUser } from "@/types";
import { STORAGE_KEYS } from "@bhemu/shared";
import { authStateAfterRestore } from "@/features/startup/authReadiness";
import { clearLocalSessionData } from "@/features/session/clearLocalSessionData";
import { enableGpaCacheWrites } from "@/features/gpa-data/cache";
import { provisionNewUserProfile } from "@bhemu/firebase";

const ACCOUNT_DELETING_KEY = STORAGE_KEYS.accountDeleting;

function toLaunchUser(user: User): LaunchUser {
	return {
		uid: user.uid,
		email: user.email,
		displayName: user.displayName,
		photoURL: user.photoURL,
	};
}

function parseLaunchUser(raw: string | null): LaunchUser | null {
	if (!raw) return null;
	try {
		const value = JSON.parse(raw) as Partial<LaunchUser>;
		if (typeof value.uid !== "string" || value.uid.length === 0) return null;
		return {
			uid: value.uid,
			email: typeof value.email === "string" ? value.email : null,
			displayName: typeof value.displayName === "string" ? value.displayName : null,
			photoURL: typeof value.photoURL === "string" ? value.photoURL : null,
		};
	} catch {
		return null;
	}
}

async function readStoredLaunchUser(): Promise<LaunchUser | null> {
	// Read the two values independently instead of relying on AsyncStorage's
	// optional batch API. `getItem` is available across the supported native and
	// web implementations, while some editor/type-package combinations expose a
	// narrower AsyncStorage type without `multiGet`.
	const [rawLaunchUser, disabled] = await Promise.all([
		AsyncStorage.getItem(STORAGE_KEYS.launchUser),
		AsyncStorage.getItem(STORAGE_KEYS.launchUserDisabled),
	]);
	if (disabled === "1") return null;
	const stored = parseLaunchUser(rawLaunchUser);
	if (stored) return stored;

	// Older installs may already have a GPA cache but not the launch hint. Only
	// infer the identity when there is exactly one account cache, avoiding a
	// potentially incorrect account choice for users who switch accounts.
	const cachePrefix = `${STORAGE_KEYS.gpaCache}:`;
	const cacheKeys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(cachePrefix));
	if (cacheKeys.length !== 1) return null;
	const uid = cacheKeys[0].slice(cachePrefix.length);
	return uid ? { uid, email: null, displayName: null, photoURL: null } : null;
}

type GoogleSigninClient = (typeof import("@react-native-google-signin/google-signin"))["GoogleSignin"];
let googleSigninClient: GoogleSigninClient | null = null;

async function getGoogleSignin() {
	if (googleSigninClient) return googleSigninClient;
	const { GoogleSignin } = await import("@react-native-google-signin/google-signin");
	GoogleSignin.configure({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID });
	googleSigninClient = GoogleSignin;
	return GoogleSignin;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
	return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [currentUser, setCurrentUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [launchUser, setLaunchUser] = useState<LaunchUser | null>(null);
	const [launchReady, setLaunchReady] = useState(false);

	async function saveUserData(user: User, isNewUser = false) {
		if (isNewUser) {
			// The default profile is provisioned exactly once, as part of the
			// explicit signup transaction. Auth restoration and an empty profile
			// list must never create one.
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
			await updateDoc(userRef, {
				email: user.email,
				displayName: user.displayName || user.email?.split("@")[0] || "User",
				photoURL: user.photoURL || null,
				lastLoginAt: serverTimestamp(),
			});
		} catch (error) {
			console.error("Error saving user data:", error);
		}
	}

	function signup(email: string, password: string, displayName?: string): Promise<UserCredential> {
		return createUserWithEmailAndPassword(auth, email, password).then(async (result) => {
			if (displayName) await updateProfile(result.user, { displayName });
			await saveUserData(result.user, true);
			return result;
		});
	}

	function login(email: string, password: string): Promise<UserCredential> {
		return signInWithEmailAndPassword(auth, email, password).then(async (result) => {
			await saveUserData(result.user);
			return result;
		});
	}

	async function signInWithGoogle(): Promise<UserCredential> {
		const GoogleSignin = await getGoogleSignin();
		await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
		const response = await GoogleSignin.signIn();
		const idToken = response.data?.idToken;
		if (!idToken) throw new Error("No ID token from Google Sign-In");
		const credential = GoogleAuthProvider.credential(idToken);
		const result = await signInWithCredential(auth, credential);
		await saveUserData(result.user, getAdditionalUserInfo(result)?.isNewUser ?? false);
		return result;
	}

	async function logout(): Promise<void> {
		const clearNotifications = import("@/features/notifications/notificationService")
			.then(({ clearManagedNotifications }) => clearManagedNotifications())
			.catch(() => {});

		try {
			// Complete local cleanup before changing auth state so no account-scoped
			// cache can leak into the next signed-in session.
			await Promise.all([clearLocalSessionData(), clearNotifications]);
			await signOut(auth);
		} catch (error) {
			// Keep the current session usable if Firebase rejects the sign-out.
			enableGpaCacheWrites();
			throw error;
		}
	}

	function resetPassword(email: string): Promise<void> {
		return sendPasswordResetEmail(auth, email);
	}

	async function updateDisplayName(newDisplayName: string): Promise<{ success: boolean; error?: string }> {
		try {
			if (!auth.currentUser) throw new Error("No authenticated user");
			await updateProfile(auth.currentUser, { displayName: newDisplayName });
			const userRef = doc(db, "users", auth.currentUser.uid);
			await updateDoc(userRef, { displayName: newDisplayName, updatedAt: serverTimestamp() });
			return { success: true };
		} catch (error) {
			console.error("Error updating display name:", error);
			return { success: false, error: error instanceof Error ? error.message : String(error) };
		}
	}

	async function createPassword(password: string): Promise<{ success: boolean; error?: string }> {
		try {
			if (!auth.currentUser || !auth.currentUser.email) throw new Error("No authenticated user");
			const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
			await linkWithCredential(auth.currentUser, credential);
			const userRef = doc(db, "users", auth.currentUser.uid);
			await updateDoc(userRef, { hasPassword: true, updatedAt: serverTimestamp() });
			return { success: true };
		} catch (error) {
			console.error("Error creating password:", error);
			return { success: false, error: error instanceof Error ? error.message : String(error) };
		}
	}

	async function changePassword(
		currentPassword: string,
		newPassword: string
	): Promise<{ success: boolean; error?: string }> {
		try {
			if (!auth.currentUser || !auth.currentUser.email) throw new Error("No authenticated user");
			const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
			await reauthenticateWithCredential(auth.currentUser, credential);
			await updatePassword(auth.currentUser, newPassword);
			const userRef = doc(db, "users", auth.currentUser.uid);
			await updateDoc(userRef, { passwordUpdatedAt: serverTimestamp(), updatedAt: serverTimestamp() });
			return { success: true };
		} catch (error) {
			console.error("Error changing password:", error);
			const err = error as FirebaseError;
			const msg =
				err.code === "auth/wrong-password"
					? "Current password is incorrect"
					: err.code === "auth/weak-password"
						? "New password is too weak"
						: err.code === "auth/requires-recent-login"
							? "Please log out and log back in first"
							: "Failed to change password";
			return { success: false, error: msg };
		}
	}

	async function deleteAllUserData(
		password: string | null = null,
		useGoogleAuth: boolean = false
	): Promise<{ success: boolean; error?: string; requiresPassword?: boolean; requiresRelogin?: boolean }> {
		try {
			if (!auth.currentUser) throw new Error("No user logged in");

			const originalUserId = auth.currentUser.uid;
			const originalUserEmail = auth.currentUser.email || "";

			// Re-authenticate
			const hasPass = hasPassword();
			const hasGoogle = isGoogleUser();

			if (useGoogleAuth || (!hasPass && hasGoogle)) {
				const GoogleSignin = await getGoogleSignin();
				await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
				const googleResponse = await GoogleSignin.signIn();
				const idToken = googleResponse.data?.idToken;
				if (!idToken) throw { code: "auth/popup-closed-by-user", message: "Google sign-in cancelled" };
				const googleCredential = GoogleAuthProvider.credential(idToken);
				const reauth = await reauthenticateWithCredential(auth.currentUser, googleCredential);
				if (reauth.user.uid !== originalUserId) {
					throw { code: "auth/user-mismatch", message: "Account mismatch." };
				}
			} else if (hasPass && password) {
				const credential = EmailAuthProvider.credential(originalUserEmail, password);
				await reauthenticateWithCredential(auth.currentUser, credential);
			} else {
				throw { code: "auth/requires-password", message: "Password required" };
			}

			// Set deletion flag before batch to prevent auto profile creation
			try {
				await AsyncStorage.setItem(ACCOUNT_DELETING_KEY, "1");
			} catch {
				/* intentionally swallowed */
			}

			// Delete all Firestore data
			await _executeComprehensiveDataDeletion(originalUserId);

			// Delete Auth account
			await deleteUser(auth.currentUser);
			try {
				await AsyncStorage.clear();
			} catch {
				/* intentionally swallowed */
			}

			return { success: true };
		} catch (error) {
			console.error("Account deletion error:", error);
			return _handleDeletionError(error);
		}
	}

	async function _executeComprehensiveDataDeletion(userId: string) {
		const batches: Array<ReturnType<typeof writeBatch>> = [];
		let currentBatch = writeBatch(db);
		let opCount = 0;

		const add = (op: (b: ReturnType<typeof writeBatch>) => void) => {
			if (opCount >= 450) {
				batches.push(currentBatch);
				currentBatch = writeBatch(db);
				opCount = 0;
			}
			op(currentBatch);
			opCount++;
		};

		const profilesSnap = await getDocs(collection(db, "users", userId, "profiles"));
		for (const profileDoc of profilesSnap.docs) {
			for (const nested of ["gpaAndMarks", "attendanceData"]) {
				const nestedSnap = await getDocs(collection(profileDoc.ref, nested));
				nestedSnap.docs.forEach((d) => add((b) => b.delete(d.ref)));
			}
			add((b) => b.delete(profileDoc.ref));
			add((b) => b.delete(doc(db, "leaderboard", `${userId}_${profileDoc.id}`)));
		}

		const outgoingSnap = await getDocs(collection(db, "userShares", userId, "outgoing"));
		for (const outDoc of outgoingSnap.docs) {
			const targetUserId = outDoc.data().targetUserId as string | undefined;
			if (targetUserId) add((b) => b.delete(doc(db, "userShares", targetUserId, "incoming", outDoc.id)));
			add((b) => b.delete(outDoc.ref));
		}

		const incomingSnap = await getDocs(collection(db, "userShares", userId, "incoming"));
		for (const inDoc of incomingSnap.docs) {
			const ownerUserId = inDoc.data().ownerUserId as string | undefined;
			if (ownerUserId) add((b) => b.delete(doc(db, "userShares", ownerUserId, "outgoing", inDoc.id)));
			add((b) => b.delete(inDoc.ref));
		}

		add((b) => b.delete(doc(db, "userShares", userId)));
		add((b) => b.delete(doc(db, "users", userId)));

		if (opCount > 0) batches.push(currentBatch);
		for (const batch of batches) await batch.commit();
	}

	function _handleDeletionError(error: unknown) {
		const err = error as FirebaseError;
		const map: Record<string, { error: string; requiresPassword?: boolean; requiresRelogin?: boolean }> = {
			"auth/requires-password": { error: "Password required for account deletion", requiresPassword: true },
			"auth/wrong-password": { error: "Incorrect password. Please try again." },
			"auth/user-mismatch": {
				error: "Account mismatch. Please try again.",
				requiresRelogin: err.requiresRelogin,
			},
			"auth/requires-recent-login": { error: "Please log out and log back in before deleting your account" },
			"auth/network-request-failed": { error: "Network error. Please check your connection." },
		};
		const mapped = map[err.code || ""] || { error: err.message || "Failed to delete account. Please try again." };
		return { success: false, ...mapped };
	}

	function isGoogleUser(): boolean {
		return auth.currentUser?.providerData.some((p) => p.providerId === "google.com") ?? false;
	}

	function hasPassword(): boolean {
		return auth.currentUser?.providerData.some((p) => p.providerId === "password") ?? false;
	}

	useEffect(() => {
		let disposed = false;
		let authStateObserved = false;

		// A small account-scoped hint lets returning users open their cached Home
		// immediately. Firebase still remains the authority and replaces it as
		// soon as its local auth restoration completes.
		void readStoredLaunchUser()
			.then((storedUser) => {
				if (!disposed && !authStateObserved) setLaunchUser(storedUser);
			})
			.catch(() => {})
			.finally(() => {
				if (!disposed) setLaunchReady(true);
			});

		const unsubscribe = onAuthStateChanged(auth, (user) => {
			authStateObserved = true;
			// Auth restoration is the critical path. Firestore metadata writes belong
			// to explicit auth actions and must never delay the first render.
			const state = authStateAfterRestore(user);
			setCurrentUser(state.currentUser);
			setLoading(state.authLoading);
			setLaunchReady(true);
			if (user) {
				enableGpaCacheWrites();
				const nextLaunchUser = toLaunchUser(user);
				setLaunchUser(nextLaunchUser);
				void AsyncStorage.removeItem(STORAGE_KEYS.launchUserDisabled);
				void AsyncStorage.setItem(STORAGE_KEYS.launchUser, JSON.stringify(nextLaunchUser));
			} else {
				setLaunchUser(null);
				void AsyncStorage.setItem(STORAGE_KEYS.launchUserDisabled, "1");
				void AsyncStorage.removeItem(STORAGE_KEYS.launchUser);
			}
		});
		return () => {
			disposed = true;
			unsubscribe();
		};
	}, []);

	return (
		<AuthContext.Provider
			value={{
				authLoading: loading,
				launchUser,
				launchReady,
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
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}
