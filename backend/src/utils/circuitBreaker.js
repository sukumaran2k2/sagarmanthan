import CircuitBreaker from "opossum";

// Circuit breaker for calls to external dependencies (third-party HTTP APIs, etc.). When the
// dependency starts failing or timing out, the breaker "opens" and fails fast for a cooldown
// window instead of piling up slow requests, then probes with a half-open trial before closing.

const DEFAULTS = {
  timeout: Number(process.env.BREAKER_TIMEOUT_MS) || 8000, // fail a call that runs longer than this
  errorThresholdPercentage: Number(process.env.BREAKER_ERROR_THRESHOLD) || 50, // open at >=50% failures
  resetTimeout: Number(process.env.BREAKER_RESET_MS) || 30000, // stay open 30s before a half-open trial
  rollingCountTimeout: 10000,
  rollingCountBuckets: 10,
};

/**
 * Wrap an async function in a circuit breaker.
 *
 * @param {Function} action async function performing the external call
 * @param {object}   options opossum options, merged over the defaults
 * @param {string}   name    label used in logs and breaker stats
 * @returns {CircuitBreaker} call `.fire(...)` with the same args `action` expects
 */
export function createBreaker(action, options = {}, name) {
  const label = name || action.name || "breaker";
  const breaker = new CircuitBreaker(action, { name: label, ...DEFAULTS, ...options });

  breaker.on("open", () => console.warn(`[CIRCUIT_OPEN] ${label} — failing fast for ${Math.round((options.resetTimeout || DEFAULTS.resetTimeout) / 1000)}s`));
  breaker.on("halfOpen", () => console.warn(`[CIRCUIT_HALF_OPEN] ${label} — probing dependency`));
  breaker.on("close", () => console.log(`[CIRCUIT_CLOSE] ${label} — dependency healthy`));
  breaker.on("timeout", () => console.warn(`[CIRCUIT_TIMEOUT] ${label}`));

  return breaker;
}

export default createBreaker;
