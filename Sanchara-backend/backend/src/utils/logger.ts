import winston from 'winston';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Human-readable line format for local development.
 */
const devFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack }) => {
    return `${ts} [${level}] ${stack || message}`;
  })
);

/**
 * Structured JSON for production log aggregation.
 */
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  format: isProduction ? prodFormat : devFormat,
  transports: [new winston.transports.Console()],
  // Do not exit the process when a transport errors.
  exitOnError: false,
});

/**
 * Morgan-compatible stream so HTTP request logs flow through winston too.
 */
export const morganStream = {
  write: (message: string): void => {
    logger.http(message.trim());
  },
};
