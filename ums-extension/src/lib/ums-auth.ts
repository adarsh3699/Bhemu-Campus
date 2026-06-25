import { UMS_DASHBOARD_URL } from '~utils/constants';

/**
 * Probe the UMS dashboard with redirect: 'manual'.
 * A valid session returns 200 with dashboard HTML.
 * An expired/absent session returns a 302 redirect to the login page (opaqueredirect).
 */
export async function isSessionValid(): Promise<boolean> {
  try {
    const response = await fetch(UMS_DASHBOARD_URL, {
      method: 'GET',
      credentials: 'include',
      redirect: 'manual',
    });
    return response.type !== 'opaqueredirect' && response.status === 200;
  } catch {
    return false;
  }
}

export function openLoginTab(): Promise<chrome.tabs.Tab> {
  return chrome.tabs.create({ url: UMS_DASHBOARD_URL, active: true });
}

export function setupLoginDetection(tabId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      chrome.webNavigation.onCommitted.removeListener(navListener);
      chrome.tabs.onRemoved.removeListener(closeListener);
    };

    const navListener = (details: chrome.webNavigation.WebNavigationTransitionCallbackDetails) => {
      if (details.tabId !== tabId) return;
      if (details.url.toLowerCase().includes('studentdashboard')) {
        cleanup();
        setTimeout(() => {
          chrome.tabs.remove(tabId).catch(() => {});
          resolve();
        }, 1500);
      }
    };

    const closeListener = (closedTabId: number) => {
      if (closedTabId !== tabId) return;
      cleanup();
      reject(new Error('UMS login tab was closed before login completed.'));
    };

    chrome.webNavigation.onCommitted.addListener(navListener);
    chrome.tabs.onRemoved.addListener(closeListener);
  });
}
