/* global describe, it, expect, jest, beforeEach, afterEach */
import axios from 'axios';
import {
  clearAccessToken,
  dropSharedTokens,
  getAccessToken,
  setAccessToken,
  watchForCopiedTab,
} from '../../tabSession';
import { refreshAccessToken, SESSION_EXPIRED_EVENT } from '../../sessionRefresh';

jest.mock('axios');

// Unsigned test token with the given claims
const tokenFor = (claims) => `h.${btoa(JSON.stringify(claims))}.s`;

// In-memory BroadcastChannel; each instance is one tab
class FakeChannel {
  static open = [];
  constructor(name) {
    this.name = name;
    this.onmessage = null;
    FakeChannel.open.push(this);
  }
  postMessage(data) {
    const targets = FakeChannel.open.filter((c) => c !== this && c.name === this.name);
    queueMicrotask(() => targets.forEach((c) => c.onmessage?.({ data })));
  }
  close() {
    FakeChannel.open = FakeChannel.open.filter((c) => c !== this);
  }
}
const flush = async () => {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
};

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  jest.clearAllMocks();
});

describe('per-tab access token', () => {
  it('keeps the token in this tab only, not in storage shared by every tab', () => {
    setAccessToken('abc');
    expect(getAccessToken()).toBe('abc');
    expect(sessionStorage.getItem('accessToken')).toBe('abc');
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  it('ignores a token an older build left in shared storage', () => {
    localStorage.setItem('accessToken', 'old-shared');
    expect(getAccessToken()).toBeNull();
  });

  it('sign-out clears the tab token and any shared leftovers, but not other preferences', () => {
    setAccessToken('abc');
    localStorage.setItem('accessToken', 'old');
    localStorage.setItem('refreshToken', 'old');
    localStorage.setItem('theme', 'dark');
    clearAccessToken();
    expect(getAccessToken()).toBeNull();
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('startup cleanup drops shared tokens only', () => {
    localStorage.setItem('token', 'x');
    localStorage.setItem('sagar_read_notifications', '[]');
    dropSharedTokens();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('sagar_read_notifications')).toBe('[]');
  });
});

describe('session refresh from the shared cookie', () => {
  let expired;
  const onExpired = (e) => expired.push(e);
  beforeEach(() => {
    expired = [];
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
  });
  afterEach(() => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired));

  it('a tab that is not signed in cannot sign itself in from another tab’s cookie', async () => {
    await expect(refreshAccessToken()).rejects.toThrow('not signed in');
    expect(axios.get).not.toHaveBeenCalled();
    expect(getAccessToken()).toBeNull();
  });

  it('renews the token of the signed-in user', async () => {
    setAccessToken(tokenFor({ userId: 7, exp: 1 }));
    const next = tokenFor({ userId: 7, exp: 2 });
    axios.get.mockResolvedValue({ data: { accessToken: next } });
    await expect(refreshAccessToken()).resolves.toBe(next);
    expect(getAccessToken()).toBe(next);
    expect(expired).toHaveLength(0);
  });

  it('ends this tab’s session, keeping the server session, when the cookie is now another user’s', async () => {
    const mine = tokenFor({ userId: 7 });
    setAccessToken(mine);
    axios.get.mockResolvedValue({ data: { accessToken: tokenFor({ userId: 9 }) } });
    await expect(refreshAccessToken()).rejects.toThrow('another user');
    expect(getAccessToken()).toBe(mine); // App clears it on the event
    expect(expired).toHaveLength(1);
    expect(expired[0].detail).toEqual({ keepServerSession: true });
  });

  it('a refused refresh ends the session on the server too', async () => {
    setAccessToken(tokenFor({ userId: 7 }));
    axios.get.mockRejectedValue({ response: { status: 401 } });
    await expect(refreshAccessToken()).rejects.toEqual({ response: { status: 401 } });
    expect(expired).toHaveLength(1);
    expect(expired[0].detail?.keepServerSession).toBeUndefined();
  });
});

describe('duplicated tabs', () => {
  const realChannel = globalThis.BroadcastChannel;
  beforeEach(() => {
    FakeChannel.open = [];
    globalThis.BroadcastChannel = FakeChannel;
  });
  afterEach(() => {
    globalThis.BroadcastChannel = realChannel;
  });

  it('a copy of an open tab is told it is a copy; the original is not', async () => {
    const originalCopied = jest.fn();
    const stopOriginal = watchForCopiedTab(originalCopied);
    const originalId = sessionStorage.getItem('sagarmanthanTabId');
    expect(originalId).toBeTruthy();

    // The copy starts with the same tab id
    const copyCopied = jest.fn();
    const stopCopy = watchForCopiedTab(copyCopied);
    await flush();

    expect(copyCopied).toHaveBeenCalledTimes(1);
    expect(originalCopied).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('sagarmanthanTabId')).not.toBe(originalId);
    stopOriginal();
    stopCopy();
  });

  it('reloading a tab (no other tab with its id) keeps its session', async () => {
    const stopFirst = watchForCopiedTab(jest.fn());
    stopFirst(); // the page unloads

    const onCopied = jest.fn();
    const stop = watchForCopiedTab(onCopied);
    await flush();
    expect(onCopied).not.toHaveBeenCalled();
    stop();
  });

  it('does nothing where BroadcastChannel is unavailable', () => {
    globalThis.BroadcastChannel = undefined;
    const onCopied = jest.fn();
    expect(() => watchForCopiedTab(onCopied)()).not.toThrow();
    expect(onCopied).not.toHaveBeenCalled();
  });
});
