// Per-IP rate limiters (express-rate-limit).
// ponytail: default in-memory store — correct for a single instance. For
// multi-instance, drop in `rate-limit-redis` so the window is shared, not
// per-node. `trust proxy` is intentionally left OFF in index.ts: enable it only
// behind a known proxy, else a spoofed X-Forwarded-For bypasses these limits.
import rateLimit from 'express-rate-limit';

// `as const` keeps these as literal true/false so they satisfy the options type
// when spread (a widened `boolean` would not).
const common = { standardHeaders: true, legacyHeaders: false } as const;

// Coarse app-wide guard.
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  ...common,
});

// Brute-force guard on the credential endpoints.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts, try again later' },
  ...common,
});

// Protects the expensive judge path (each POST spins up a container).
export const submitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many submissions, slow down' },
  ...common,
});
