import pino from 'pino';

// MCP stdio servers MUST log to stderr, not stdout (stdout is for JSON-RPC only)
export const logger = pino({
  name: 'manifold-mcp',
  level: process.env.LOG_LEVEL || 'info',
}, process.stderr);


