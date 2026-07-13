/**
 * Config barrel — single import surface for the config layer.
 *
 *   import { env, connectDB } from '../config';
 */
export { env, isProd, isDev, isTest } from './env';
export type { Env } from './env';
export { connectDB, disconnectDB, isDBConnected, pingDB } from './db';
