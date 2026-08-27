// Ambient declarations: what our own middleware attaches to Express's Request.
// Both are optional because anonymous requests are legal — `optionalAuth` leaves
// `user` unset, and `problem` only exists downstream of `loadProblem`. Handlers
// mounted behind `authenticate` / `loadProblem` use `req.user!` / `req.problem!`.
//
// `req.log` is not declared here: pino-http augments http.IncomingMessage, which
// Express's Request extends, so it comes in for free.
import type { AccessPayload } from '../utils/jwt';
import type { problems } from '../generated/prisma';

declare global {
  namespace Express {
    interface Request {
      user?: AccessPayload;
      problem?: problems;
    }
  }
}
