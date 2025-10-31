import pino from 'pino';
import { config } from './config.js';

// Determine if we're running in stdio mode (no colors, JSON output only)
const isStdioMode = process.argv[1]?.includes('index-stdio') || process.env.MCP_STDIO === 'true';

// MCP stdio servers MUST log to stderr, not stdout (stdout is for JSON-RPC only)
export const logger = isStdioMode
  ? pino({
      level: process.env.LOG_LEVEL || 'info',
      // In stdio mode: plain JSON to stderr (stdio stdout is for JSON-RPC only)
      base: { name: config.SERVER_NAME },
    }, process.stderr) // Explicitly write to stderr
  : pino({
      level: process.env.LOG_LEVEL || 'info',
      transport: process.env.NODE_ENV !== 'production' ? {
        target: 'pino-pretty',
        options: { colorize: true, singleLine: true }
      } : undefined
    });


