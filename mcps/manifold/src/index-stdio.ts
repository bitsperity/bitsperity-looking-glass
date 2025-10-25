import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './lib/server-setup.js';
import { config } from './config.js';
import { logger } from './logger.js';

const server = createMcpServer();
const transport = new StdioServerTransport();

async function main() {
  logger.info({ manifoldApiUrl: config.MANIFOLD_API_URL }, `Starting ${config.SERVER_NAME} (stdio)`);
  await server.connect(transport);
  logger.info(`${config.SERVER_NAME} ready (stdio transport)`);
}

main().catch((error) => {
  logger.error({ error }, 'Failed to start server');
  process.exit(1);
});


