import type { RequestHandler } from 'express';

function authorize(allowedRoles: string | string[]): RequestHandler {
  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      res.status(401).json({ error: 'Unauthenticated' });
      return;
    }
    if (!rolesArray.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

export default authorize;
