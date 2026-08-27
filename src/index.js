require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');

const logger = require('./lib/logger');
const { register: metricsRegister, metricsMiddleware } = require('./lib/metrics');
const { globalLimiter, authLimiter, submitLimiter } = require('./middleware/rateLimit');

const asyncHandler = require('./middleware/asyncHandler');
const errorHandler = require('./middleware/errorHandler');

const { register, login, refresh } = require('./controllers/authController');
const authenticate = require('./middleware/authenticate');
const authorize = require('./middleware/authorize');
const problemsRouter = require('./routes/problems');
const submissionsRouter = require('./routes/submissions');
const { body, validationResult } = require('express-validator');

const app = express();

// ----- Observability (first, so it sees every request incl. ops endpoints) -----
app.use(helmet());                 // Security headers
app.use(cors());                   // Enable CORS
app.use(pinoHttp({ logger }));     // Structured request logging (replaces morgan)
app.use(metricsMiddleware);        // Prometheus HTTP timing

// ----- Ops endpoints (no body parsing / rate limit so probes & scrapes stay cheap) -----

// Liveness: process is up.
app.get(
  '/health',
  asyncHandler(async (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  })
);

// Readiness: dependencies (DB) are reachable.
app.get(
  '/health/ready',
  asyncHandler(async (req, res) => {
    const prisma = require('./lib/prisma');
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ready', db: 'ok' });
    } catch (err) {
      req.log.error({ err }, 'readiness check failed');
      res.status(503).json({ status: 'unavailable', db: 'down' });
    }
  })
);

// Prometheus scrape target. ponytail: open on localhost — firewall or put behind
// auth before exposing publicly.
app.get(
  '/metrics',
  asyncHandler(async (req, res) => {
    res.set('Content-Type', metricsRegister.contentType);
    res.send(await metricsRegister.metrics());
  })
);

// ----- Body parsing + coarse global rate limit (before app routes) -----
app.use(express.json());    // Parse JSON bodies
app.use(globalLimiter);     // Per-IP app-wide guard

// ----- Auth Routes (stricter brute-force limiter) -----
const authRouter = express.Router();

/**
 * POST /api/auth/register
 * Body: { username, email, password, role? }
 */
authRouter.post(
  '/register',
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be 3‑30 characters')
      .isAlphanumeric()
      .withMessage('Only letters and numbers allowed'),
    body('email')
      .trim()
      .isEmail()
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  asyncHandler(async (req, res) => {
    await register(req, res);
  })
);

/**
 * POST /api/auth/login
 * Body: { usernameOrEmail, password }
 */
authRouter.post(
  '/login',
  [
    body('usernameOrEmail').trim().notEmpty(),
    body('password').notEmpty(),
  ],
  asyncHandler(async (req, res) => {
    await login(req, res);
  })
);

/**
 * POST /api/auth/refresh (optional)
 * Body: { refreshToken }
 */
authRouter.post(
  '/refresh',
  [
    body('refreshToken').notEmpty(),
  ],
  asyncHandler(async (req, res) => {
    await refresh(req, res);
  })
);

// Mount auth router under /api/auth (brute-force limiter in front)
app.use('/api/auth', authLimiter, authRouter);

// Mount problem router under /api/problems
app.use('/api/problems', problemsRouter);

// Mount submission router under /api/submissions (POST is the expensive judge path)
app.use(
  '/api/submissions',
  (req, res, next) => (req.method === 'POST' ? submitLimiter(req, res, next) : next()),
  submissionsRouter
);

// ----- Example Protected Routes -----

// GET /api/me – accessible to any logged‑in user
app.get(
  '/api/me',
  authenticate,
  authorize(['user', 'moderator', 'admin']), // any authenticated role
  asyncHandler(async (req, res) => {
    const prisma = require('./lib/prisma');
    const freshUser = await prisma.users.findUnique({
      where: { id: BigInt(req.user.userId) },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        rating: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!freshUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userJson = {
      ...freshUser,
      id: freshUser.id.toString(),
    };
    res.json({ user: userJson });
  })
);

// GET /api/admin/stats – admin‑only example
app.get(
  '/api/admin/stats',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const prisma = require('./lib/prisma');
    const userCount = await prisma.users.count();
    // You can return any admin‑only stats here
    res.json({ adminOnly: true, userCount });
  })
);

// ----- Central Error Handler (must be last) -----
app.use(errorHandler);

// ----- Start Server -----
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});
