/**
 * Content script running on campus.bhemu.in.
 * Reads the Firebase auth state JSON from localStorage and forwards it to the
 * extension popup when requested. The extension writes the same JSON into its
 * own localStorage, then reinitializes Firebase Auth to restore the session.
 */

import type { PlasmoCSConfig } from 'plasmo';

export const config: PlasmoCSConfig = {
  // Matches both localhost (dev) and production URL
  matches: [
    'http://localhost:3000/*',
    'https://campus.bhemu.in/*',
  ],
  run_at: 'document_idle',
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== 'GET_FIREBASE_TOKEN') return;

  // Firebase v9+ stores auth state in IndexedDB, NOT localStorage.
  // DB: "firebaseLocalStorageDb", store: "firebaseLocalStorage"
  // Each record: { fbase_key: "firebase:authUser:{apiKey}:[DEFAULT]", value: {...} }
  readFirebaseAuthFromIDB()
    .then((authStateJson) => sendResponse({ authStateJson }))
    .catch(() => sendResponse({ authStateJson: null }));

  return true; // keep channel open for async response
});

function readFirebaseAuthFromIDB(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('firebaseLocalStorageDb');

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains('firebaseLocalStorage')) {
        db.close();
        return resolve(null);
      }

      const tx = db.transaction('firebaseLocalStorage', 'readonly');
      const store = tx.objectStore('firebaseLocalStorage');
      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = () => {
        db.close();
        const records: Array<{ fbase_key: string; value: unknown }> = getAllRequest.result ?? [];
        const authRecord = records.find((r) => r.fbase_key?.startsWith('firebase:authUser:'));
        resolve(authRecord ? JSON.stringify(authRecord.value) : null);
      };

      getAllRequest.onerror = () => {
        db.close();
        reject(getAllRequest.error);
      };
    };
  });
}
