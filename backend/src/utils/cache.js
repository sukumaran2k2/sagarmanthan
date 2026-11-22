import NodeCache from "node-cache";

// Simple in-process cache for read-heavy, non-user-specific data (e.g. master / dropdown lookups).
// Keep it for reference data only: anything scoped to a user or organisation must NOT be cached here
// with a URL-only key, or one user could be served another's data.

const DEFAULT_TTL = Number(process.env.CACHE_TTL_SECONDS) || 300; // 5 minutes

const cache = new NodeCache({
  stdTTL: DEFAULT_TTL,
  checkperiod: 120,
});

/**
 * Express middleware that caches successful GET JSON responses keyed by the full URL.
 * Only use on routes whose output depends solely on the URL (path + query), not on the
 * authenticated user. Adds an X-Cache: HIT|MISS header for observability.
 *
 * @param {number} ttlSeconds overrides the default TTL for this route
 */
export function cacheMiddleware(ttlSeconds = DEFAULT_TTL) {
  return (req, res, next) => {
    if (req.method !== "GET") return next();

    const key = `GET:${req.originalUrl}`;
    const cached = cache.get(key);
    if (cached !== undefined) {
      res.set("X-Cache", "HIT");
      return res.status(200).json(cached);
    }

    res.set("X-Cache", "MISS");
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Only cache genuine successes so transient errors aren't served repeatedly.
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, body, ttlSeconds);
      }
      return originalJson(body);
    };
    next();
  };
}

/** Remove cached entries whose key contains the given substring (e.g. after a master-data edit). */
export function invalidateCache(substring) {
  if (!substring) {
    cache.flushAll();
    return;
  }
  const keys = cache.keys().filter((k) => k.includes(substring));
  cache.del(keys);
}

export { cache };
export default cache;
