// Prometheus metrics. Default process/Node metrics + an HTTP-duration histogram.
// Exposed at GET /metrics (see index.ts). ponytail: add domain counters
// (submissions_total, verdicts_total{status}) when you want judge dashboards —
// this is just the HTTP + runtime baseline.
import { Registry, Histogram, collectDefaultMetrics } from 'prom-client';
import type { Request, Response, NextFunction } from 'express';

const register = new Registry();
collectDefaultMetrics({ register });

const httpDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

// Times every request. Labels by the *matched route pattern* (e.g. /api/problems/:id,
// not /api/problems/123) so param values don't blow up label cardinality; unmatched
// requests fall back to the mount path or a constant for the same reason.
function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const end = httpDuration.startTimer();
  res.on('finish', () => {
    const route = req.route ? req.baseUrl + req.route.path : req.baseUrl || 'unmatched';
    end({ method: req.method, route, status: res.statusCode });
  });
  next();
}

export { register, metricsMiddleware };
