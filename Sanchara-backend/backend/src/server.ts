import type { Server } from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { connectDB, disconnectDB } from './config/db';
import { logger } from './utils/logger';
import { assertSmsReady } from './services/sms.service';

/**
 * Application entrypoint.
 *
 * Boot order: validate env (on import of ./config/env) → check the SMS provider
 * → connect to MongoDB → start the HTTP server. We do NOT accept traffic before
 * the DB is up, nor (in production) without a real SMS provider — OTP is the
 * only way in, so a silently-mocked one means nobody can log in.
 * Handles graceful shutdown on SIGINT/SIGTERM and crashes loudly on
 * unhandled rejections / uncaught exceptions.
 */

let server: Server | undefined;

async function shutdown(signal: string, exitCode = 0): Promise<void> {
  logger.info(`${signal} received — shutting down gracefully...`);

  // Stop accepting new connections first.
  if (server) {
    await new Promise<void>((resolve) => {
      server?.close(() => resolve());
    });
    logger.info('HTTP server closed');
  }

  try {
    await disconnectDB();
    logger.info('MongoDB connection closed');
  } catch (err) {
    logger.error(`Error during DB shutdown: ${(err as Error).message}`);
  }

  process.exit(exitCode);
}

async function bootstrap(): Promise<void> {
  // 1. Refuse to boot production without real SMS — cheapest check, do it first.
  assertSmsReady();

  // 2. Database — fail fast if it's unreachable.
  await connectDB();

  // 3. Then start listening.
  const app = createApp();
  server = app.listen(env.PORT, () => {
    logger.info(
      `🚀 Sanchara backend listening on http://localhost:${env.PORT} ` +
        `(${env.NODE_ENV})`
    );
    logger.info(`   Health check: http://localhost:${env.PORT}/api/health`);
  });
}

// --- Process-level safety nets ------------------------------------------------

process.on('unhandledRejection', (reason: unknown) => {
  logger.error(`Unhandled promise rejection: ${String(reason)}`);
  void shutdown('unhandledRejection', 1);
});

process.on('uncaughtException', (err: Error) => {
  logger.error(`Uncaught exception: ${err.message}`, { stack: err.stack });
  void shutdown('uncaughtException', 1);
});

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

// --- Go ----------------------------------------------------------------------

bootstrap().catch((err: Error) => {
  logger.error(`Failed to start server: ${err.message}`, { stack: err.stack });
  process.exit(1);
});
