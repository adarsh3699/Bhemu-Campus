import type { User, UserCredential } from "firebase/auth";

export interface FirebaseError extends Error {
	code?: string;
	requiresRelogin?: boolean;
}

/** Minimal local identity used to render cached app data during auth restoration. */
export interface LaunchUser {
	uid: string;
	email: string | null;
	displayName: string | null;
	photoURL: string | null;
}

export interface AuthContextType {
	currentUser: User | null;
	/** Only provided by the mobile client which has a launch-user optimisation. */
	authLoading?: boolean;
	/** Only provided by the mobile client which has a launch-user optimisation. */
	launchUser?: LaunchUser | null;
	/** Only provided by the mobile client which has a launch-user optimisation. */
	launchReady?: boolean;
	signup: (email: string, password: string, displayName?: string) => Promise<UserCredential>;
	login: (email: string, password: string) => Promise<UserCredential>;
	logout: () => Promise<void>;
	resetPassword: (email: string) => Promise<void>;
	signInWithGoogle: () => Promise<UserCredential>;
	updateDisplayName: (newDisplayName: string) => Promise<{ success: boolean; error?: string }>;
	createPassword: (password: string) => Promise<{ success: boolean; error?: string }>;
	changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
	deleteAllUserData: (
		password?: string | null,
		useGoogleAuth?: boolean
	) => Promise<{ success: boolean; error?: string; requiresPassword?: boolean; requiresRelogin?: boolean }>;
	isGoogleUser: () => boolean;
	hasPassword: () => boolean;
}
