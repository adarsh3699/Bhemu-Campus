import { Storage } from '@plasmohq/storage';
import { isSessionValid, openLoginTab, setupLoginDetection } from '~lib/ums-auth';
import { fetchAllData } from './fetcher';
import { syncToSupabase } from './sync';
import { SYNC_ALARM_NAME, SYNC_INTERVAL_HOURS, SUPABASE_URL } from '~utils/constants';
import type { SyncStatus } from '~lib/types';

const storage = new Storage({ area: 'local' });
const TEST_MODE = SUPABASE_URL === 'YOUR_SUPABASE_URL';

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
  }
}

export async function startSync() {
  await updateStatus({ lastSyncedAt: null, status: 'syncing', message: 'Checking session...' });

  const valid = await isSessionValid();
  if (!valid) {
    await updateStatus({ lastSyncedAt: null, status: 'needs_login', message: 'Please log in to UMS' });
    return { success: false, reason: 'needs_login' };
  }

  try {
    await updateStatus({ lastSyncedAt: null, status: 'syncing', message: 'Fetching data from UMS...' });

    const data = await fetchAllData();

    if ('error' in data) {
      await updateStatus({ lastSyncedAt: null, status: 'error', message: data.error });
      return { success: false, reason: data.error };
    }

    if (TEST_MODE) {
      // Test mode: log data to console instead of syncing to Supabase
      console.log('=== UMS DATA FETCHED (TEST MODE) ===');
      console.log('Student Info:', data.studentInfo);
      console.log('Courses (grades):', data.courses.length, 'found');
      console.log('Exam Marks:', data.examMarks.length, 'found');
      console.log('Assessments:', data.courseAssessments.length, 'found');
      console.log('Attendance (from API):', data.attendance.length, 'records');
      console.log('Timetable:', data.timetable.length, 'entries');
      console.log('Terms:', data.terms.length, 'found');
      console.log('--- JSON API Results ---');
      console.log('Current Courses (API):', data.apiData?.courses?.length ?? 0);
      console.log('Announcements:', data.apiData?.announcements?.length ?? 0);
      console.log('Seating Plan:', data.apiData?.seatingPlan?.length ?? 0);
      console.log('Messages:', data.apiData?.messages?.length ?? 0);
      console.log('Fee Heads:', data.apiData?.heads?.length ?? 0);
      console.log('Full data:', JSON.stringify(data, null, 2));
      // Store locally for popup inspection
      await storage.set('lastSyncData', data);
    } else {
      await updateStatus({ lastSyncedAt: null, status: 'syncing', message: 'Saving to database...' });
      await syncToSupabase(data);
    }

    const now = new Date().toISOString();
    await updateStatus({ lastSyncedAt: now, status: 'success', message: TEST_MODE ? 'Test sync done — check console' : 'Synced successfully' });
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    await updateStatus({ lastSyncedAt: null, status: 'error', message: msg });
    return { success: false, reason: msg };
  }
}

export async function startLoginFlow() {
  const tab = await openLoginTab();
  if (tab.id) {
    await setupLoginDetection(tab.id);
    return startSync();
  }
  return { success: false, reason: 'Failed to open login tab' };
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'START_SYNC') {
    startSync().then(sendResponse);
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
});

// Auto-sync alarm
chrome.alarms.create(SYNC_ALARM_NAME, {
  periodInMinutes: SYNC_INTERVAL_HOURS * 60,
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === SYNC_ALARM_NAME) {
    const valid = await isSessionValid();
    if (valid) {
      await startSync();
    }
  }
});
