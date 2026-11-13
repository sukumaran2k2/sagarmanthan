/* global describe, it, expect, jest, beforeEach, afterEach */
import axios from 'axios';
import { API_BASE, createApiClient } from '../../../api';
import { getAccessToken, setAccessToken } from '../../tabSession';

// Unsigned test token with the given claims
const tokenFor = (claims) => `h.${btoa(JSON.stringify(claims))}.s`;
const OLD = tokenFor({ userId: 7, v: 1 });
const NEW = tokenFor({ userId: 7, v: 2 });

const reply = (config, status, data = {}) => {
  const res = { status, data, headers: {}, config, statusText: String(status) };
  if (status >= 400) {
    const err = new Error(`Request failed with status code ${status}`);
    err.config = config;
    err.response = res;
    return Promise.reject(err);
  }
  return Promise.resolve(res);
};

// Fake server: 401 unless the renewed token is sent
function fakeServer() {
  const seen = [];
  const adapter = (config) => {
    seen.push(config.headers?.Authorization);
    return reply(config, config.headers?.Authorization === `Bearer ${NEW}` ? 200 : 401, { ok: true });
  };
  return { seen, adapter };
}

let refreshCall;
beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  refreshCall = jest.spyOn(axios, 'get').mockResolvedValue({ data: { accessToken: NEW } });
});
afterEach(() => jest.restoreAllMocks());

describe('createApiClient', () => {
  it('sends this tab’s token, and none when the tab is signed out', async () => {
    const seen = [];
    const api = createApiClient({ adapter: (config) => { seen.push(config.headers?.Authorization); return reply(config, 200); } });
    await api.get('/x');
    setAccessToken(OLD);
    await api.get('/x');
    expect(seen).toEqual([undefined, `Bearer ${OLD}`]);
  });

  it('uses the shared backend address unless a module gives its own, and keeps other options', () => {
    expect(createApiClient().defaults.baseURL).toBe(API_BASE);
    const own = createApiClient({ baseURL: 'https://sagarmanthan.ntcpwc.net:8443/api', timeout: 30000 });
    expect(own.defaults.baseURL).toBe('https://sagarmanthan.ntcpwc.net:8443/api');
    expect(own.defaults.timeout).toBe(30000);
  });

  it('renews an expired token once and sends the request again', async () => {
    setAccessToken(OLD);
    const { seen, adapter } = fakeServer();
    const res = await createApiClient({ adapter }).get('/x');
    expect(res.data).toEqual({ ok: true });
    expect(seen).toEqual([`Bearer ${OLD}`, `Bearer ${NEW}`]);
    expect(getAccessToken()).toBe(NEW);
  });

  it('requests that expire together share one renewal', async () => {
    setAccessToken(OLD);
    const { adapter } = fakeServer();
    const api = createApiClient({ adapter });
    await Promise.all([api.get('/a'), api.get('/b'), createApiClient({ adapter }).get('/c')]);
    expect(refreshCall).toHaveBeenCalledTimes(1);
  });

  it('does not loop when the retried request is refused again', async () => {
    setAccessToken(OLD);
    const seen = [];
    const api = createApiClient({ adapter: (config) => { seen.push(1); return reply(config, 401); } });
    await expect(api.get('/x')).rejects.toMatchObject({ response: { status: 401 } });
    expect(seen).toHaveLength(2);
    expect(refreshCall).toHaveBeenCalledTimes(1);
  });

  it('passes other errors straight through', async () => {
    setAccessToken(OLD);
    const api = createApiClient({ adapter: (config) => reply(config, 500) });
    await expect(api.get('/x')).rejects.toMatchObject({ response: { status: 500 } });
    expect(refreshCall).not.toHaveBeenCalled();
  });

  it('when the session can’t be renewed, rejects with the original 401 and forgets the token', async () => {
    setAccessToken(OLD);
    refreshCall.mockRejectedValue({ response: { status: 503 } });
    const { adapter } = fakeServer();
    await expect(createApiClient({ adapter }).get('/x')).rejects.toMatchObject({ response: { status: 401 } });
    expect(getAccessToken()).toBeNull();
  });
});

describe('plain axios calls', () => {
  const sentAuth = async (url, headers = {}) => {
    let auth;
    await axios.request({ url, headers, adapter: (config) => { auth = config.headers?.Authorization; return reply(config, 200); } });
    return auth;
  };

  it('get the token only when they go to the backend', async () => {
    setAccessToken(OLD);
    expect(await sentAuth(`${API_BASE}/my-profile`)).toBe(`Bearer ${OLD}`);
    expect(await sentAuth('/my-profile')).toBe(`Bearer ${OLD}`);
    expect(await sentAuth('https://example.org/data')).toBeUndefined();
    expect(await sentAuth(`${API_BASE}/login-validation`)).toBeUndefined();
  });

  it('keep an Authorization header the caller set', async () => {
    setAccessToken(OLD);
    expect(await sentAuth(`${API_BASE}/x`, { Authorization: 'Bearer own' })).toBe('Bearer own');
  });
});
