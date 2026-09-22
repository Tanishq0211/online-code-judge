import type { ErrorRequestHandler } from 'express';
import logger from '../lib/logger';

/** Anything thrown with an HTTP status attached (routes set err.status). */
interface HttpError extends Error {
  status?: number;
}

const errorHandler: ErrorRequestHandler = (err: HttpError, req, res, _next) => {
  // req.log (pino-http) carries the request id for correlation; fall back to the
  // base logger for errors raised outside the request pipeline.
  (req.log || logger).error({ err }, err.message || 'request error');

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  const response: { error: string; stack?: string } = { error: message };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(status).json(response);
};

export default errorHandler;
