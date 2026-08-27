import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';

import logger from './lib/logger';
import { register as metricsRegister, metricsMiddleware } from './lib/metrics';
import { globalLimiter, authLimiter, submitLimiter } from './middleware/rateLimit';

import prisma from './lib/prisma';
import asyncHandler from './middleware/asyncHandler';
import errorHandler from './middleware/errorHandler';

import { register, login, refresh } from './controllers/authController';
import authenticate from './middleware/authenticate';
import authorize from './middleware/authorize';
import problemsRouter from './routes/problems';
import submissionsRouter from './routes/submissions';
import { body } from 'express-validator';

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
  (req, res, next) => {
    if (req.method === 'POST') {
      submitLimiter(req, res, next);
      return;
    }
    next();
  },
  submissionsRouter
);

// ----- Example Protected Routes -----

// GET /api/me – accessible to any logged‑in user
app.get(
  '/api/me',
  authenticate,
  authorize(['user', 'moderator', 'admin']), // any authenticated role
  asyncHandler(async (req, res) => {
    const freshUser = await prisma.users.findUnique({
      where: { id: BigInt(req.user!.userId) },
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
      res.status(404).json({ error: 'User not found' });
      return;
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
    const userCount = await prisma.users.count();
    // You can return any admin‑only stats here
    res.json({ adminOnly: true, userCount });
  })
);

// ----- Central Error Handler (must be last) -----
app.use(errorHandler);

// ----- Start Server (only when run directly; tests import `app` via supertest) -----
if (require.main === module) {
  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
