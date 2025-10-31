import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './lib/server-setup.js';
import { config } from './config.js';
import { logger } from './logger.js';

const server = createMcpServer();
const transport = new StdioServerTransport();

// Log all incoming JSON-RPC messages for debugging
const originalWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = function(chunk: any, encoding?: any, cb?: any) {
  if (typeof chunk === 'string' && chunk.trim()) {
    try {
      const msg = JSON.parse(chunk);
      logger.debug({ direction: 'out', method: msg.method, id: msg.id }, 'JSON-RPC response');
    } catch (e) {
      // Not JSON, ignore
    }
  }
  return originalWrite(chunk, encoding, cb);
};

// Log stdin input (JSON-RPC requests)
process.stdin.on('data', (chunk) => {
  const lines = chunk.toString().split('\n').filter(l => l.trim());
  for (const line of lines) {
    try {
      const msg = JSON.parse(line);
      logger.debug({ direction: 'in', method: msg.method, id: msg.id }, 'JSON-RPC request');
    } catch (e) {
      logger.debug({ line }, 'Non-JSON stdin input');
    }
  }
});

async function main() {
  logger.info({ ariadneApiUrl: config.ARIADNE_API_URL }, `Starting ${config.SERVER_NAME} (stdio)`);
  await server.connect(transport);
  logger.info(`${config.SERVER_NAME} ready (stdio transport)`);
}

main().catch((error) => {
  logger.error({ error, stack: error.stack }, 'Failed to start server');
  process.exit(1);
});
