import type { Request, Response, NextFunction } from 'express';
import { getHealthReport } from './health.service';

/**
 * GET /api/health — proof-of-life endpoint.
 * Returns 200 when the DB is reachable, 503 when degraded so external probes
 * (load balancers, uptime monitors) can react correctly.
 */
export async function healthCheck(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const report = await getHealthReport();
    res.status(report.status === 'ok' ? 200 : 503).json(report);
  } catch (err) {
    next(err);
  }
}
