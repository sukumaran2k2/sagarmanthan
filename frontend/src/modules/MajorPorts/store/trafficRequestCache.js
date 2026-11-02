import { registerStoreReset } from '../../../stores/resetRegistry';

/**
 * In-memory cache for Traffic GET responses, keyed by endpoint + params.
 * - A response younger than FRESH_MS is reused without a request (tab switches,
 *   paging back, re-opening a filter combination are instant).
 * - An older one is shown at once while a fresh copy loads (stale-while-revalidate).
 * - Any save or delete clears everything (see api.js), so edits are never hidden.
 * - Logout clears it too (resetAllStores), so nothing carries over to the next user.
 */

const FRESH_MS = 60 * 1000;
const MAX_ENTRIES = 80;

const entries = new Map(); // key -> { value, at }
const inflight = new Map(); // key -> Promise (prefetches, shared with a matching page load)

export function readCache(key) {
  const hit = entries.get(key);
  if (!hit) return null;
  return { value: hit.value, fresh: Date.now() - hit.at < FRESH_MS };
}

export function writeCache(key, value) {
  entries.delete(key);
  entries.set(key, { value, at: Date.now() });
  // Map keeps insertion order: drop the oldest entries first
  while (entries.size > MAX_ENTRIES) entries.delete(entries.keys().next().value);
}

export function dropCache(key) {
  entries.delete(key);
}

export function clearTrafficCache() {
  entries.clear();
  inflight.clear();
}

/** A prefetch already running for this key, if any. */
export function pendingRequest(key) {
  return inflight.get(key) || null;
}

/** Loads a key in the background (no abort, errors ignored) unless it is fresh or already loading. */
export function prefetchCache(key, fetcher) {
  if (readCache(key)?.fresh || inflight.has(key)) return;
  const promise = fetcher()
    .then((value) => {
      if (inflight.get(key) === promise) writeCache(key, value);
      return value;
    })
    .finally(() => {
      if (inflight.get(key) === promise) inflight.delete(key);
    });
  promise.catch(() => {});
  inflight.set(key, promise);
}

registerStoreReset(clearTrafficCache);
