const prisma = require('../lib/prisma');
const { hash, compare } = require('../utils/password');
const {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
} = require('../utils/jwt');
const { validationResult } = require('express-validator');

async function register(req, res) {
  // 1. Validation errors (if using express-validator)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password, role = 'user' } = req.body;

  // 2️ Ensure user doesn't already exist
  const existing = await prisma.users.findFirst({
    where: { OR: [{ username }, { email }] },
  });
  if (existing) {
    return res.status(409).json({
      error: 'Username or email already registered',
    });
  }
  // 3️ Hash password
  const passwordHash = await hash(password);

  // 4️ Create user
  const user = await prisma.users.create({
    data: {
      username,
      email,
      password_hash: passwordHash,
      role,
      // rating defaults to 0 via Prisma model
    },
    select: { id: true, username: true, email: true, role: true, createdAt: true },
  });
  
  // 5️ Issue tokens
  const accessToken = signAccessToken({
    userId: user.id,
    role: user.role,
    email: user.email,
  });
  const refreshToken = signRefreshToken({ userId: user.id });

  // 6️ Respond (you can store refresh token in HttpOnly cookie or DB)
  res.status(201).json({
    user,
    accessToken,
    refreshToken, // optional – consider HttpOnly cookie instead
  });
}

async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { usernameOrEmail, password } = req.body;

  const user = await prisma.users.findFirst({
    where: {
      OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    },
  });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const accessToken = signAccessToken({
    userId: user.id,
    role: user.role,
    email: user.email,
  });
  const refreshToken = signRefreshToken({ userId: user.id });

  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    accessToken,
    refreshToken,
  });
}

async function refresh(req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' });
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    // Optionally verify that refresh token is still valid (e.g., stored in DB)
    const newAccess = signAccessToken({
      userId: payload.userId,
      role: payload.role, // you’d need to fetch role from DB if it can change
      email: payload.email, // same note
    });
    res.json({ accessToken: newAccess });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
}

module.exports = { register, login, refresh };
