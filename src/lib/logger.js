// Structured JSON logger (pino). Replaces morgan + scattered console.* calls.
// Level via LOG_LEVEL (default info); auth/cookie headers redacted so tokens
// never hit the logs. ponytail: raw JSON out — add `pino-pretty` as a dev
// transport if you want colorized local output.
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: ['req.headers.authorization', 'req.headers.cookie'],
});

module.exports = logger;
