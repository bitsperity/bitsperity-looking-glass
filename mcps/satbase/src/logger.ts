import pino from 'pino';
import { config } from './config.js';

// Determine if we're running in stdio mode (no colors, JSON output only)
const isStdioMode = process.argv[1]?.includes('index-stdio') || process.env.MCP_STDIO === 'true';

export const logger = isStdioMode
  ? pino({
      level: config.LOG_LEVEL,
      // In stdio mode: plain JSON to stderr (stdio stdout is for JSON-RPC only)
      base: undefined,
    }, process.stderr) // Explicitly write to stderr
  : pino({
      level: config.LOG_LEVEL,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
        },
      },
    });

export default logger;
