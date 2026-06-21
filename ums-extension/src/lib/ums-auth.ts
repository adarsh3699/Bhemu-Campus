import { UMS_BASE_URL, UMS_COOKIE_NAME, UMS_DASHBOARD_URL } from '~utils/constants';

export async function getUmsCookie(): Promise<string | null> {
  const cookie = await chrome.cookies.get({
    url: UMS_BASE_URL,
    name: UMS_COOKIE_NAME,
  });
  return cookie?.value ?? null;
}

export async function isSessionValid(): Promise<boolean> {
  const cookieValue = await getUmsCookie();
  if (!cookieValue) return false;

  try {
    const response = await fetch(UMS_DASHBOARD_URL, {
      method: 'GET',
      credentials: 'include',
      redirect: 'manual',
    });

    if (response.type === 'opaqueredirect' || response.status !== 200) {
      return false;
    }

    const text = await response.text();
    const lower = text.toLowerCase();
    return !(
      lower.includes('session expired') ||
      lower.includes('please login') ||
      lower.includes('login.aspx') ||
      lower.includes('login required')
    );
  } catch {
    return false;
  }
}

export function openLoginTab(): Promise<chrome.tabs.Tab> {
  return chrome.tabs.create({ url: UMS_DASHBOARD_URL, active: true });
}

export function setupLoginDetection(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    const listener = (details: chrome.webNavigation.WebNavigationTransitionCallbackDetails) => {
      if (details.tabId !== tabId) return;
      const url = details.url.toLowerCase();

      if (url.includes('studentdashboard')) {
        chrome.webNavigation.onCommitted.removeListener(listener);
        setTimeout(() => {
          chrome.tabs.remove(tabId).catch(() => {});
          resolve();
        }, 1500);
      }
    };

    chrome.webNavigation.onCommitted.addListener(listener);
  });
}
