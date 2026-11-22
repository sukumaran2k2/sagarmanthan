import rateLimit from "express-rate-limit";

// Rate limiting protects the API from abusive bursts and credential-stuffing. Because the app runs
// behind nginx (see frontend/nginx.conf), server.js sets `trust proxy` so the limiter keys on the
// real client IP from X-Forwarded-For rather than the proxy's address.

const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // 15 minutes

// Global limiter: generous ceiling applied to every route. Tune with RATE_LIMIT_MAX.
export const globalLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: Number(process.env.RATE_LIMIT_MAX) || 1000,
  standardHeaders: true, // expose RateLimit-* headers
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});

// Auth limiter: strict ceiling for login / password routes to slow brute-force attempts.
// skipSuccessfulRequests means only failed attempts count toward the limit.
//
// It is keyed by the submitted email (the account under attack), NOT the client IP. This is
// deliberate: if the reverse-proxy / trust-proxy setup is misconfigured and every request appears
// to come from the proxy's single IP, an IP-keyed auth limiter would lock out ALL users after a
// handful of failures. Email keying throttles attempts per account regardless of the proxy setup,
// while the global IP limiter above still covers volumetric abuse.
export const authLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => (req.body?.email ? String(req.body.email).trim().toLowerCase() : "no-email"),
  // keyGenerator keys by email, not IP, so disable the IP-key validation warning.
  validate: { ip: false },
  message: { message: "Too many login attempts for this account. Please wait a few minutes and try again." },
});

export default globalLimiter;
