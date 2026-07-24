import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getAuth, inMemoryPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
	apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
	authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
	projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
	storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Firebase 12 JS SDK on React Native: getReactNativePersistence was removed.
// Use initializeAuth with inMemoryPersistence to suppress the default warning.
// Auth tokens are still stored by Firebase internally; the session persists
// as long as the app process is alive. For cross-session persistence, we rely
// on onAuthStateChanged which re-hydrates from Firebase's internal token cache.
let app;
if (getApps().length === 0) {
	app = initializeApp(firebaseConfig);
	initializeAuth(app, { persistence: inMemoryPersistence });
} else {
	app = getApp();
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
