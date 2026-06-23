import { Storage } from '@plasmohq/storage';
import { isSessionValid, openLoginTab, setupLoginDetection } from '~lib/ums-auth';
import { fetchAllData } from './fetcher';
import { syncGradesAndMarks, syncAttendanceOnly } from './sync';
import type { SyncStatus } from '~lib/types';

const storage = new Storage({ area: 'local' });

async function updateStatus(status: SyncStatus) {
  await storage.set('syncStatus', status);

  if (status.status === 'success') {
    chrome.action.setBadgeText({ text: '✓' });
    chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });
  } else if (status.status === 'error' || status.status === 'needs_login') {
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
  } else if (status.status === 'syncing') {
    chrome.action.setBadgeText({ text: '...' });
    chrome.action.setBadgeBackgroundColor({ color: '#3b82f6' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

async function ensureUmsSession(): Promise<boolean> {
  const valid = await isSessionValid();
  if (!valid) {
    await updateStatus({ lastSyncedAt: null, status: 'needs_login', message: 'Please log in to UMS' });
  }
  return valid;
}

export async function startGradesSync(profileId: string): Promise<{ success: boolean; reason?: string }> {
  await updateStatus({ lastSyncedAt: null, status: 'syncing', message: 'Checking UMS session...' });

  if (!(await ensureUmsSession())) return { success: false, reason: 'needs_login' };

  try {
    await updateStatus({ lastSyncedAt: null, status: 'syncing', message: 'Fetching grades & marks from UMS...' });
    const data = await fetchAllData();

    if ('error' in data) {
      console.error('[BhemuSync] fetchAllData error:', data.error);
      await updateStatus({ lastSyncedAt: null, status: 'error', message: data.error });
      return { success: false, reason: data.error };
    }

    await updateStatus({ lastSyncedAt: null, status: 'syncing', message: 'Saving grades & marks to Firebase...' });
    await syncGradesAndMarks(data, profileId);

    const now = new Date().toISOString();
    await updateStatus({ lastSyncedAt: now, status: 'success', message: 'Grades & marks synced successfully' });
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[BhemuSync] grades sync failed:', err);
    await updateStatus({ lastSyncedAt: null, status: 'error', message: msg });
    return { success: false, reason: msg };
  }
}

export async function startAttendanceSync(profileId: string): Promise<{ success: boolean; reason?: string }> {
  await updateStatus({ lastSyncedAt: null, status: 'syncing', message: 'Checking UMS session...' });

  if (!(await ensureUmsSession())) return { success: false, reason: 'needs_login' };

  try {
    await updateStatus({ lastSyncedAt: null, status: 'syncing', message: 'Fetching attendance from UMS...' });
    const data = await fetchAllData();

    if ('error' in data) {
      console.error('[BhemuSync] fetchAllData error:', data.error);
      await updateStatus({ lastSyncedAt: null, status: 'error', message: data.error });
      return { success: false, reason: data.error };
    }

    await updateStatus({ lastSyncedAt: null, status: 'syncing', message: 'Saving attendance to Firebase...' });
    await syncAttendanceOnly(data, profileId);

    const now = new Date().toISOString();
    await updateStatus({ lastSyncedAt: now, status: 'success', message: 'Attendance synced successfully' });
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[BhemuSync] attendance sync failed:', err);
    await updateStatus({ lastSyncedAt: null, status: 'error', message: msg });
    return { success: false, reason: msg };
  }
}

export async function startLoginFlow(): Promise<{ success: boolean; reason?: string }> {
  const tab = await openLoginTab();
  if (tab.id) {
    await setupLoginDetection(tab.id);
    // Detection resolved — user is now logged in to UMS, reset to idle so sync buttons appear
    await updateStatus({ lastSyncedAt: null, status: 'idle', message: 'UMS login successful' });
  }
  return { success: true };
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SYNC_GRADES' && message.profileId) {
    startGradesSync(message.profileId).then(sendResponse);
    return true;
  }
  if (message.type === 'SYNC_ATTENDANCE' && message.profileId) {
    startAttendanceSync(message.profileId).then(sendResponse);
    return true;
  }
  if (message.type === 'START_LOGIN') {
    startLoginFlow().then(sendResponse);
    return true;
  }
  if (message.type === 'GET_STATUS') {
    storage.get<SyncStatus>('syncStatus').then(status => {
      sendResponse(status ?? { lastSyncedAt: null, status: 'idle' });
    });
    return true;
  }
  if (message.type === 'CLEAR_STATUS') {
    updateStatus({ lastSyncedAt: null, status: 'idle' }).then(() => sendResponse({ ok: true }));
    return true;
  }
});
