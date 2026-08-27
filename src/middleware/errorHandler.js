const logger = require('../lib/logger');

const errorHandler = (err, req, res, next) => {
  // req.log (pino-http) carries the request id for correlation; fall back to the
  // base logger for errors raised outside the request pipeline.
  (req.log || logger).error({ err }, err.message || 'request error');

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  const response = { error: message };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(status).json(response);
};

module.exports = errorHandler;
