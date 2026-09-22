import type { Request, Response } from 'express';
import { validationResult } from 'express-validator';

import prisma from '../lib/prisma';
import { hash, compare } from '../utils/password';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';

/**
 * POST /api/auth/register
 * Body: { username, email, password, role? }
 */
export async function register(req: Request, res: Response): Promise<void> {
  // 1️⃣ Validation errors (if using express-validator)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { username, email, password } = req.body;

  // 2️⃣ Ensure user doesn't already exist
  const existing = await prisma.users.findFirst({
    where: { OR: [{ username }, { email }] },
  });
  if (existing) {
    res.status(409).json({ error: 'Username or email already registered' });
    return;
  }

  // 3️⃣ Hash password
  const passwordHash = await hash(password);

  // 4️⃣ Create user
  const user = await prisma.users.create({
    data: {
      username,
      email,
      password_hash: passwordHash,
      role: 'user', // SECURITY: never trust a client-supplied role — promote out-of-band (scripts/make-admin.ts)
      // rating defaults to 0 via Prisma model
    },
    select: { id: true, username: true, email: true, role: true, created_at: true },
  });

  // 5️⃣ Issue tokens
  const accessToken = signAccessToken({
    userId: user.id,
    role: user.role,
    email: user.email,
  });
  const refreshToken = signRefreshToken({ userId: user.id });

  // 6️⃣ Respond (you can store refresh token in HttpOnly cookie or DB).
  // BigInt id -> string for JSON serialization.
  res.status(201).json({
    user: { ...user, id: user.id.toString() },
    accessToken,
    refreshToken, // optional – consider HttpOnly cookie instead
  });
}

/**
 * POST /api/auth/login
 * Body: { usernameOrEmail, password }
 */
export async function login(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { usernameOrEmail, password } = req.body;

  // Find user by username or email
  const user = await prisma.users.findFirst({
    where: {
      OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    },
  });
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  // Verify password
  const valid = await compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  // Issue tokens
  const accessToken = signAccessToken({
    userId: user.id,
    role: user.role,
    email: user.email,
  });
  const refreshToken = signRefreshToken({ userId: user.id });

  res.json({
    // Convert BigInt id to string for JSON serialization
    user: {
      id: user.id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
    },
    accessToken,
    refreshToken,
  });
}

/**
 * POST /api/auth/refresh (optional)
 * Body: { refreshToken }
 */
export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(401).json({ error: 'Refresh token required' });
    return;
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    // Refresh tokens only carry userId, so fetch current role/email from the DB —
    // the new access token then reflects the latest state (e.g. role changes).
    const user = await prisma.users.findUnique({
      where: { id: BigInt(payload.userId) },
      select: { id: true, role: true, email: true },
    });
    if (!user) {
      res.status(401).json({ error: 'User no longer exists' });
      return;
    }
    const newAccess = signAccessToken({
      userId: user.id,
      role: user.role,
      email: user.email,
    });
    res.json({ accessToken: newAccess });
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
}
