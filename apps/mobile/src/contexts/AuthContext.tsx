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
import {
	doc,
	setDoc,
	serverTimestamp,
	collection,
	getDocs,
	writeBatch,
} from "firebase/firestore";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "@/firebase/config";
import type { FirebaseError, AuthContextType } from "@/types/auth";

GoogleSignin.configure({
	webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
});

const ACCOUNT_DELETING_KEY = "bhemu_account_deleting";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
	return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [currentUser, setCurrentUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	async function saveUserData(user: User, isNewUser = false) {
		try {
			const userRef = doc(db, "users", user.uid);
			await setDoc(
				userRef,
				{
					email: user.email,
					displayName: user.displayName || user.email?.split("@")[0] || "User",
					photoURL: user.photoURL || null,
					lastLoginAt: serverTimestamp(),
					...(isNewUser ? { createdAt: serverTimestamp() } : {}),
				},
				{ merge: true }
			);
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
		try {
			await AsyncStorage.removeItem("bhemu_activeProfileId");
			await AsyncStorage.removeItem("gpa_view_mode");
		} catch (_e) { /* intentionally swallowed */ }
		return signOut(auth);
	}

	function resetPassword(email: string): Promise<void> {
		return sendPasswordResetEmail(auth, email);
	}

	async function updateDisplayName(newDisplayName: string): Promise<{ success: boolean; error?: string }> {
		try {
			if (!auth.currentUser) throw new Error("No authenticated user");
			await updateProfile(auth.currentUser, { displayName: newDisplayName });
			const userRef = doc(db, "users", auth.currentUser.uid);
			await setDoc(userRef, { displayName: newDisplayName, updatedAt: serverTimestamp() }, { merge: true });
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
			await setDoc(userRef, { hasPassword: true, updatedAt: serverTimestamp() }, { merge: true });
			return { success: true };
		} catch (error) {
			console.error("Error creating password:", error);
			return { success: false, error: error instanceof Error ? error.message : String(error) };
		}
	}

	async function changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
		try {
			if (!auth.currentUser || !auth.currentUser.email) throw new Error("No authenticated user");
			const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
			await reauthenticateWithCredential(auth.currentUser, credential);
			await updatePassword(auth.currentUser, newPassword);
			const userRef = doc(db, "users", auth.currentUser.uid);
			await setDoc(userRef, { passwordUpdatedAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
			return { success: true };
		} catch (error) {
			console.error("Error changing password:", error);
			const err = error as FirebaseError;
			const msg =
				err.code === "auth/wrong-password" ? "Current password is incorrect"
				: err.code === "auth/weak-password" ? "New password is too weak"
				: err.code === "auth/requires-recent-login" ? "Please log out and log back in first"
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

			if ((useGoogleAuth || (!hasPass && hasGoogle))) {
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
			try { await AsyncStorage.setItem(ACCOUNT_DELETING_KEY, "1"); } catch (_e) { /* intentionally swallowed */ }

			// Delete all Firestore data
			await _executeComprehensiveDataDeletion(originalUserId);

			// Delete Auth account
			await deleteUser(auth.currentUser);
			try { await AsyncStorage.clear(); } catch (_e) { /* intentionally swallowed */ }

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
			if (opCount >= 450) { batches.push(currentBatch); currentBatch = writeBatch(db); opCount = 0; }
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
			"auth/user-mismatch": { error: "Account mismatch. Please try again.", requiresRelogin: err.requiresRelogin },
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
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) await saveUserData(user);
			setCurrentUser(user);
			setLoading(false);
		});
		return unsubscribe;
	}, []);

	if (loading) return null;

	return (
		<AuthContext.Provider value={{
			currentUser, signup, login, logout, resetPassword, signInWithGoogle,
			updateDisplayName, createPassword, changePassword, deleteAllUserData,
			isGoogleUser, hasPassword,
		}}>
			{children}
		</AuthContext.Provider>
	);
}
