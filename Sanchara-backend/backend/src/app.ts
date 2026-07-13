import express, { type Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';

import { isProd } from './config/env';
import { morganStream } from './utils/logger';
import apiRouter from './modules';
import { notFound } from './middleware/notFound';
import { errorHandler } from './middleware/errorHandler';

/**
 * Build and configure the Express application.
 *
 * Middleware order is deliberate and must not be reshuffled:
 *   helmet → cors → compression → morgan → express.json → routes
 *          → notFound → errorHandler (errorHandler MUST be last)
 */
export function createApp(): Application {
  const app = express();

  // Trust the reverse proxy in production (correct client IPs, secure cookies).
  if (isProd) app.set('trust proxy', 1);

  // 1. Security headers
  app.use(helmet());

  // 2. CORS — permissive in local phase; lock down origins before deploy.
  app.use(cors());

  // 3. Response compression
  app.use(compression());

  // 4. HTTP request logging (routed through winston)
  app.use(morgan(isProd ? 'combined' : 'dev', { stream: morganStream }));

  // 5. Body parsers
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // 6. Application routes
  app.use('/api', apiRouter);

  // 7. Unmatched routes -> 404
  app.use(notFound);

  // 8. Central error handler — MUST be registered last.
  app.use(errorHandler);

  return app;
}
