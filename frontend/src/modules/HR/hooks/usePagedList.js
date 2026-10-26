import { useCallback, useEffect, useRef, useState } from 'react';
import {
  dropCache,
  pendingRequest,
  prefetchCache,
  readCache,
  writeCache,
} from '../store/hrRequestCache';

/**
 * Ref that always holds the latest value. Use it for callbacks (e.g. notify) that
 * effects call but should not re-run for: App recreates triggerNotification on
 * every toast, so depending on it would refetch after each message.
 */
export function useLatestRef(value) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

/** Pushes the search text to the store 300 ms after the user stops typing. */
export function useDebouncedSearch(searchTerm, setDebouncedSearch) {
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchTerm, setDebouncedSearch]);
}

const isCancelled = (err, signal) => signal?.aborted || err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError';

/**
 * Loads `fetcher(signal)` for `cacheKey`, through the HR response cache.
 * - A newer key aborts the older request, so slow responses never overwrite newer ones.
 * - While a new key loads, the last value stays on screen (`refreshing`); `loading`
 *   is true only when there is nothing to show yet.
 * - reload() skips the cache for the current key.
 */
export function useCachedRequest(cacheKey, fetcher, { onError, enabled = true } = {}) {
  const [reloadToken, setReloadToken] = useState(0);
  const [result, setResult] = useState({ key: null, token: -1, value: undefined });
  const fetcherRef = useLatestRef(fetcher);
  const onErrorRef = useLatestRef(onError);
  const keyRef = useLatestRef(cacheKey);

  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    const finish = (value) => {
      if (!controller.signal.aborted) setResult({ key: cacheKey, token: reloadToken, value });
    };
    const hit = readCache(cacheKey);

    if (hit?.fresh) {
      // Settle asynchronously, like a request, so the effect never sets state directly
      Promise.resolve().then(() => finish(hit.value));
      return () => controller.abort();
    }

    const shared = pendingRequest(cacheKey);
    const request = shared || fetcherRef.current(controller.signal);
    request
      .then((value) => {
        if (!shared) writeCache(cacheKey, value);
        finish(value);
      })
      .catch((err) => {
        if (isCancelled(err, controller.signal)) return;
        console.error(err);
        finish(hit?.value);
        onErrorRef.current?.(err);
      });
    return () => controller.abort();
  }, [cacheKey, reloadToken, enabled, fetcherRef, onErrorRef]);

  const current = result.key === cacheKey && result.token === reloadToken;
  const cached = current ? undefined : readCache(cacheKey)?.value;
  const value = current ? result.value : cached !== undefined ? cached : result.value;

  const reload = useCallback(() => {
    dropCache(keyRef.current);
    setReloadToken((t) => t + 1);
  }, [keyRef]);

  return {
    value,
    loading: enabled && !current && value === undefined,
    refreshing: enabled && !current,
    reload,
  };
}

// { data, pagination, ...extra } -> { rows, total, totalPages, extra }; extra carries list
// specific values such as the Vacancy Overview's counts.
const EMPTY_ROWS = [];
const EMPTY_EXTRA = {};

const toPage = (res) => {
  const { data, pagination, ...extra } = res.data || {};
  return {
    rows: Array.isArray(data) ? data : [],
    total: pagination?.total || 0,
    totalPages: pagination?.totalPages || 0,
    extra,
  };
};

/**
 * One page of a { data, pagination } list endpoint, cached per params.
 * `params` must include `page`; once a page arrives the next one is prefetched,
 * so Next is instant. `request(params, { signal })` is the API function.
 */
export function usePagedList({ scope, params, request, onError, enabled = true }) {
  const cacheKey = `${scope}:${JSON.stringify(params)}`;
  const paramsRef = useLatestRef(params);
  const requestRef = useLatestRef(request);

  const fetcher = useCallback(
    (signal) => requestRef.current(paramsRef.current, { signal }).then(toPage),
    [requestRef, paramsRef]
  );
  const { value, loading, refreshing, reload } = useCachedRequest(cacheKey, fetcher, { onError, enabled });
  const totalPages = value?.totalPages ?? 0;

  useEffect(() => {
    if (!enabled || refreshing) return;
    const page = Number(paramsRef.current.page) || 1;
    if (page >= totalPages) return;
    const next = { ...paramsRef.current, page: page + 1 };
    prefetchCache(`${scope}:${JSON.stringify(next)}`, () => requestRef.current(next).then(toPage));
  }, [scope, cacheKey, enabled, refreshing, totalPages, paramsRef, requestRef]);

  return {
    rows: value?.rows ?? EMPTY_ROWS,
    total: value?.total ?? 0,
    totalPages,
    extra: value?.extra ?? EMPTY_EXTRA,
    loading,
    refreshing,
    reload,
  };
}
