import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getAuth, GoogleAuthProvider, browserLocalPersistence, browserPopupRedirectResolver } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
	apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
	authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
	projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
	storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
	measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase (safeguard for SSR re-initialization in Next.js)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Authentication with localStorage persistence
// (default IndexedDB persistence is blocked by some ad blockers, causing "Database is closing/hidden" errors)
function getFirebaseAuth() {
	try {
		return initializeAuth(app, {
			persistence: browserLocalPersistence,
			popupRedirectResolver: browserPopupRedirectResolver,
		});
	} catch {
		// Auth already initialized (Next.js HMR / SSR re-evaluation)
		return getAuth(app);
	}
}
export const auth = getFirebaseAuth();

// Initialize Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

export default app;
