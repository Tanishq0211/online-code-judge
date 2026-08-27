import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';

// Read once at load, as before. The casts are deliberate: .env / compose / CI all
// supply these, and jsonwebtoken throws on a missing secret at sign time anyway —
// so the cast doesn't hide a failure, it just avoids threading undefined around.
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET as string;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'];
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'];

/** What callers hand in. userId is a Prisma BigInt at every call site. */
export interface SignPayload {
  userId: string | bigint;
  role?: string;
  email?: string;
}

/** Access tokens carry the full identity, so authorization needs no DB hit. */
export interface AccessPayload extends JwtPayload {
  userId: string;
  role: string;
  email: string;
}

/** Refresh tokens carry only the subject; role/email are re-read from the DB. */
export interface RefreshPayload extends JwtPayload {
  userId: string;
}

// A JWT is JSON, and JSON has no BigInt — stringify the id. (No-op for strings.)
const withStringId = (payload: SignPayload): Record<string, unknown> => ({
  ...payload,
  userId: payload.userId.toString(),
});

export function signAccessToken(payload: SignPayload): string {
  return jwt.sign(withStringId(payload), ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
}

export function signRefreshToken(payload: SignPayload): string {
  return jwt.sign(withStringId(payload), REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
}

// jwt.verify is typed string | JwtPayload; we only ever sign objects, and a bad
// token throws rather than returning, so narrowing here is safe.
export function verifyAccessToken(token: string): AccessPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessPayload;
}

export function verifyRefreshToken(token: string): RefreshPayload {
  return jwt.verify(token, REFRESH_SECRET) as RefreshPayload;
}
