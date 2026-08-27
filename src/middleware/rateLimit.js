// Per-IP rate limiters (express-rate-limit).
// ponytail: default in-memory store — correct for a single instance. For
// multi-instance, drop in `rate-limit-redis` so the window is shared, not
// per-node. `trust proxy` is intentionally left OFF in index.js: enable it only
// behind a known proxy, else a spoofed X-Forwarded-For bypasses these limits.
const rateLimit = require('express-rate-limit');

const common = { standardHeaders: true, legacyHeaders: false };

// Coarse app-wide guard.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  ...common,
});

// Brute-force guard on the credential endpoints.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts, try again later' },
  ...common,
});

// Protects the expensive judge path (each POST spins up a container).
const submitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many submissions, slow down' },
  ...common,
});

module.exports = { globalLimiter, authLimiter, submitLimiter };
