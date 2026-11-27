import { registerStoreReset } from '../../../stores/resetRegistry';

/**
 * In-memory cache for KPI DGS GET responses (same idea as MajorPorts/store/trafficRequestCache.js).
 * - A response younger than FRESH_MS is reused without a request, so switching sections or tabs
 *   and coming back to a Data List is instant.
 * - The same request already on its way is shared instead of sent twice.
 * - Any save clears everything (see api.js), so a saved entry always shows at once.
 * - Logout clears it too (resetAllStores), so nothing carries over to the next user.
 * Used only by the endpoints wrapped in api.js (currently the K-2.3 Data Lists).
 */

const FRESH_MS = 60 * 1000;

const entries = new Map(); // key -> { value, at }
const inflight = new Map(); // key -> Promise

export function cachedGet(key, fetcher) {
  const hit = entries.get(key);
  if (hit && Date.now() - hit.at < FRESH_MS) return Promise.resolve(hit.value);
  if (inflight.has(key)) return inflight.get(key);

  const promise = fetcher()
    .then((value) => {
      if (inflight.get(key) === promise) entries.set(key, { value, at: Date.now() });
      return value;
    })
    .finally(() => {
      if (inflight.get(key) === promise) inflight.delete(key);
    });
  inflight.set(key, promise);
  return promise;
}

export function clearDgsCache() {
  entries.clear();
  inflight.clear();
}

registerStoreReset(clearDgsCache);
