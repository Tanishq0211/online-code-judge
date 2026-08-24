require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const asyncHandler = require('./middleware/asyncHandler');
const errorHandler = require('./middleware/errorHandler');

const { register, login, refresh } = require('./controllers/authController');
const authenticate = require('./middleware/authenticate');
const authorize = require('./middleware/authorize');
const problemsRouter = require('./routes/problems');
const submissionsRouter = require('./routes/submissions');
const { body, validationResult } = require('express-validator');

const app = express();

// ----- Global Middleware -----
app.use(helmet());          // Security headers
app.use(cors());            // Enable CORS
app.use(express.json());    // Parse JSON bodies
app.use(morgan('dev'));     // Request logger

// ----- Auth Routes -----
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

// Mount auth router under /api/auth
app.use('/api/auth', authRouter);

// Mount problem router under /api/problems
app.use('/api/problems', problemsRouter);

// Mount submission router under /api/submissions
app.use('/api/submissions', submissionsRouter);

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

// ----- Health Check (keep existing) -----
app.get(
  '/health',
  asyncHandler(async (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  })
);

// ----- Central Error Handler (must be last) -----
app.use(errorHandler);

// ----- Start Server -----
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`���������🚀 Server running on http://localhost:${PORT}`);
});