import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';

/**
 * Like `authenticate`, but does not require a token.
 * - No Authorization header  -> continue as anonymous (req.user stays undefined).
 * - Valid Bearer token       -> attach req.user.
 * - Present but invalid token -> 401 (so garbage tokens aren't silently treated as anon).
 *
 * Used by public read routes that still grant extra visibility to moderators/admins.
 */
function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next(); // anonymous

  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Malformed Authorization header' });
    return;
  }

  try {
    req.user = verifyAccessToken(authHeader.slice(7)); // { userId, role, email, iat, exp }
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export default optionalAuth;
