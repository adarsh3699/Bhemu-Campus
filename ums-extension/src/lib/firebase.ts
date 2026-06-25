import { initializeApp, getApps, getApp, deleteApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  initializeAuth,
  indexedDBLocalPersistence,
  getAuth,
} from 'firebase/auth';
import type { Auth, User } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { Storage } from '@plasmohq/storage';
import { FIREBASE_CONFIG, CALC_URL } from '~utils/constants';

const storage = new Storage({ area: 'local' });

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

function ensureApp(): FirebaseApp {
  if (_app) return _app;
  _app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApp();
  return _app;
}

export function getFirebaseAuth(): Auth {
  if (_auth) return _auth;
  try {
    _auth = initializeAuth(ensureApp(), { persistence: [indexedDBLocalPersistence] });
  } catch {
    _auth = getAuth(ensureApp());
  }
  return _auth;
}

export function getFirebaseDb(): Firestore {
  if (_db) return _db;
  _db = getFirestore(ensureApp());
  return _db;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const auth = getFirebaseAuth();
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await storage.set('fb_uid', cred.user.uid);
  return cred.user;
}

/**
 * Write a Firebase auth state record into the extension's IndexedDB.
 * Firebase v9+ with indexedDBLocalPersistence stores each record as:
 *   { fbase_key: "firebase:authUser:{apiKey}:[DEFAULT]", value: <authObject> }
 */
function writeFirebaseAuthToIDB(key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const openReq = indexedDB.open('firebaseLocalStorageDb', 1);

    openReq.onupgradeneeded = () => {
      const db = openReq.result;
      if (!db.objectStoreNames.contains('firebaseLocalStorage')) {
        db.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
      }
    };

    openReq.onerror = () => reject(openReq.error);

    openReq.onsuccess = () => {
      const db = openReq.result;
      const tx = db.transaction('firebaseLocalStorage', 'readwrite');
      const store = tx.objectStore('firebaseLocalStorage');
      const req = store.put({ fbase_key: key, value });
      req.onerror = () => { db.close(); reject(req.error); };
      tx.oncomplete = () => { db.close(); resolve(); };
    };
  });
}

/**
 * Sign in using the active session on calc.bhemu.in.
 *
 * How it works:
 * 1. Check if calc.bhemu.in is already open — otherwise open it.
 * 2. The authBridge content script reads Firebase auth state from the page's localStorage.
 * 3. We write that JSON to the extension popup's own localStorage under the same key.
 * 4. We reinitialize Firebase Auth with browserLocalPersistence — it reads the session.
 * 5. Done — currentUser is set, no password needed.
 */
export async function signInWithCalcSession(): Promise<User> {
  const CALC_ORIGIN = CALC_URL;

  const sendMsg = (tabId: number): Promise<string | null> =>
    new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, { type: 'GET_FIREBASE_TOKEN' }, (res) => {
        if (chrome.runtime.lastError || !res?.authStateJson) resolve(null);
        else resolve(res.authStateJson);
      });
    });

  const retryMsg = async (tabId: number, tries: number): Promise<string | null> => {
    for (let i = 0; i < tries; i++) {
      const result = await sendMsg(tabId);
      if (result) return result;
      if (i < tries - 1) await new Promise((r) => setTimeout(r, 400));
    }
    return null;
  };

  const waitForLoad = (tabId: number): Promise<void> =>
    new Promise((resolve) => {
      const listener = (id: number, info: chrome.tabs.TabChangeInfo) => {
        if (id === tabId && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
      setTimeout(resolve, 10000);
    });

  // 1. Check if calc tab is already open — query WITHOUT switching to it
  //    (activating a tab closes the extension popup, killing this async flow)
  const existingTabs = await chrome.tabs.query({ url: `${CALC_ORIGIN}/*` });
  let authStateJson: string;

  if (existingTabs.length > 0 && existingTabs[0].id) {
    const tabId = existingTabs[0].id;
    let result = await retryMsg(tabId, 2);
    if (!result) {
      // Content script may not be injected yet — reload and retry
      await chrome.tabs.reload(tabId);
      await waitForLoad(tabId);
      result = await retryMsg(tabId, 3);
    }
    if (!result) {
      await chrome.tabs.update(tabId, { active: true });
      throw new Error('Not logged in on Bhemu Calculator. Please log in there, then try again.');
    }
    authStateJson = result;
  } else {
    // No tab open — open in the BACKGROUND so the popup stays alive
    const newTab = await chrome.tabs.create({ url: CALC_ORIGIN, active: false });
    const tabId = newTab.id!;
    await waitForLoad(tabId);
    const result = await retryMsg(tabId, 5);
    if (!result) {
      await chrome.tabs.update(tabId, { url: `${CALC_ORIGIN}/login`, active: true });
      throw new Error('Not logged in on Bhemu Calculator. Please log in there, then try again.');
    }
    await chrome.tabs.remove(tabId);
    authStateJson = result;
  }

  // 3. Write the web app auth state into the extension's IndexedDB
  //    Firebase v9+ with indexedDBLocalPersistence reads from:
  //    DB: "firebaseLocalStorageDb", store: "firebaseLocalStorage"
  //    key: "firebase:authUser:{apiKey}:[DEFAULT]"
  const authKey = `firebase:authUser:${FIREBASE_CONFIG.apiKey}:[DEFAULT]`;
  await writeFirebaseAuthToIDB(authKey, JSON.parse(authStateJson));

  // 4. Reinitialize Firebase Auth so it picks up the new IndexedDB state
  if (_app) {
    try { await deleteApp(_app); } catch { /* ignore */ }
  }
  _app = null;
  _auth = null;
  _db = null;

  _app = initializeApp(FIREBASE_CONFIG);
  _auth = initializeAuth(_app, { persistence: [indexedDBLocalPersistence] });
  _db = getFirestore(_app);

  // 5. Wait for auth state to restore from IndexedDB
  await _auth.authStateReady();
  const user = _auth.currentUser;

  if (!user) {
    throw new Error('Could not restore session. Please try again or use email/password.');
  }

  await storage.set('fb_uid', user.uid);
  return user;
}

export async function firebaseSignOut(): Promise<void> {
  const auth = getFirebaseAuth();
  await signOut(auth);
  await storage.remove('fb_uid');
}

export function getCurrentUser(): Promise<User | null> {
  const auth = getFirebaseAuth();
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user);
    });
  });
}
