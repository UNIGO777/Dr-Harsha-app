import { isDBConnected, pingDB } from '../../config/db';

export type DbStatus = 'connected' | 'disconnected';

export interface HealthReport {
  status: 'ok' | 'degraded';
  db: DbStatus;
  uptime: number;
  timestamp: string;
}

/**
 * Assemble a proof-of-life report. Actively pings MongoDB rather than trusting
 * the driver's cached ready state, so a stalled DB surfaces as "disconnected".
 */
export async function getHealthReport(): Promise<HealthReport> {
  const dbReachable = isDBConnected() && (await pingDB());
  const db: DbStatus = dbReachable ? 'connected' : 'disconnected';

  return {
    status: dbReachable ? 'ok' : 'degraded',
    db,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  };
}
