import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

/**
 * Mongoose connection helper.
 *
 * `connectDB` establishes the initial connection (awaited in server.ts before
 * we start listening). Connection lifecycle events are logged once, globally,
 * so we get visibility into reconnects/drops for the lifetime of the process.
 */

// Fail fast on unknown query fields, etc. — safer defaults for a medical app.
mongoose.set('strictQuery', true);

let listenersRegistered = false;

function registerConnectionListeners(): void {
  if (listenersRegistered) return;
  listenersRegistered = true;

  const connection = mongoose.connection;

  connection.on('connected', () => {
    logger.info(`🗄️  MongoDB connected: ${connection.host}/${connection.name}`);
  });

  connection.on('error', (err: Error) => {
    logger.error(`MongoDB connection error: ${err.message}`);
  });

  connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });
}

export async function connectDB(): Promise<typeof mongoose> {
  registerConnectionListeners();

  return mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10_000,
  });
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}

/**
 * Returns true when the connection is in the "connected" ready state (1).
 * Used by the health endpoint as a cheap liveness signal.
 */
export function isDBConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

/**
 * Actively pings the database admin command to confirm the DB is reachable
 * (not just that the driver thinks it is connected).
 */
export async function pingDB(): Promise<boolean> {
  try {
    if (!mongoose.connection.db) return false;
    await mongoose.connection.db.admin().ping();
    return true;
  } catch {
    return false;
  }
}
