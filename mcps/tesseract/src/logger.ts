import pino from 'pino';
import { config } from './config.js';

const isDevelopment = process.env.NODE_ENV !== 'production';
const isStdio = process.argv[1]?.includes('index-stdio') || process.env.MCP_STDIO === 'true';

// For stdio mode: redirect logs to stderr to avoid interfering with JSON-RPC on stdout
// Use pino.destination() to explicitly write to stderr
const destination = isStdio ? pino.destination({ dest: process.stderr.fd, sync: false }) : undefined;

export const logger = pino({
  level: config.LOG_LEVEL,
  // For stdio mode: no colors, plain JSON to stderr
  // For HTTP mode: pretty colors in development
  transport: isStdio
    ? undefined // No pretty printing for stdio - just JSON to stderr
    : isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  formatters: {
    level: (label) => ({ level: label }),
  },
}, destination);

