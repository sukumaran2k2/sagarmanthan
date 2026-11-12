const ACCESS_TOKEN_KEY = 'accessToken';
const TAB_ID_KEY = 'sagarmanthanTabId';
const LAST_ACTIVITY_KEY = 'sagarmanthanLastActivity';
const TAB_CHANNEL = 'sagarmanthan:tabs';
const COPY_CHECK_MS = 2000;

function readSession(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function getAccessToken() {
  return readSession(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token) {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken() {
  try {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(LAST_ACTIVITY_KEY);
  } catch {
    // storage unavailable
  }
  dropSharedTokens();
}

// Last time the user interacted with this tab (ms), or null
export function getLastActivity() {
  const at = Number(readSession(LAST_ACTIVITY_KEY));
  return at > 0 ? at : null;
}

export function markActivity(at = Date.now()) {
  try {
    sessionStorage.setItem(LAST_ACTIVITY_KEY, String(at));
  } catch {
    // storage unavailable
  }
}

// Removes tokens older builds kept in shared localStorage
export function dropSharedTokens() {
  try {
    ['accessToken', 'refreshToken', 'token'].forEach((key) => localStorage.removeItem(key));
  } catch {
    // storage unavailable
  }
}

const newTabId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

// Calls onCopied when this tab is a duplicate of an open tab
export function watchForCopiedTab(onCopied) {
  if (typeof BroadcastChannel === 'undefined') return () => {};

  let tabId = readSession(TAB_ID_KEY);
  if (!tabId) {
    tabId = newTabId();
    try {
      sessionStorage.setItem(TAB_ID_KEY, tabId);
    } catch {
      return () => {};
    }
  }

  const channel = new BroadcastChannel(TAB_CHANNEL);
  let checking = true;
  channel.onmessage = ({ data }) => {
    if (!data || data.tabId !== tabId) return;
    if (data.type === 'hello') {
      channel.postMessage({ type: 'taken', tabId });
    } else if (data.type === 'taken' && checking) {
      checking = false;
      tabId = newTabId();
      sessionStorage.setItem(TAB_ID_KEY, tabId);
      onCopied();
    }
  };
  channel.postMessage({ type: 'hello', tabId });
  const timer = setTimeout(() => { checking = false; }, COPY_CHECK_MS);

  return () => {
    clearTimeout(timer);
    channel.close();
  };
}
