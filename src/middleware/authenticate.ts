import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';

function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization; // Expected: "Bearer <token>"
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = authHeader.slice(7); // strip "Bearer "
  try {
    // Attach user info to request for later middleware/controllers
    req.user = verifyAccessToken(token); // { userId, role, email, iat, exp }
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export default authenticate;
