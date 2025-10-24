import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { config } from './config.js';
import { logger } from './logger.js';

// Import all tools
import { searchTool } from './lib/tools/search.js';
import { similarTool } from './lib/tools/similar.js';
import { initCollectionTool } from './lib/tools/admin-init.js';
import { startBatchEmbeddingTool, getEmbeddingStatusTool } from './lib/tools/admin-embed.js';
import {
  listCollectionsTool,
  switchCollectionTool,
  deleteCollectionTool,
} from './lib/tools/admin-collections.js';

// Create MCP Server
const server = new McpServer({
  name: config.SERVER_NAME,
  version: '1.0.0',
});

// Register all tools
logger.info('Registering MCP tools...');

server.registerTool(searchTool.name, searchTool.config, searchTool.handler);
server.registerTool(similarTool.name, similarTool.config, similarTool.handler);
server.registerTool(initCollectionTool.name, initCollectionTool.config, initCollectionTool.handler);
server.registerTool(startBatchEmbeddingTool.name, startBatchEmbeddingTool.config, startBatchEmbeddingTool.handler);
server.registerTool(getEmbeddingStatusTool.name, getEmbeddingStatusTool.config, getEmbeddingStatusTool.handler);
server.registerTool(listCollectionsTool.name, listCollectionsTool.config, listCollectionsTool.handler);
server.registerTool(switchCollectionTool.name, switchCollectionTool.config, switchCollectionTool.handler);
server.registerTool(deleteCollectionTool.name, deleteCollectionTool.config, deleteCollectionTool.handler);

logger.info('8 tools registered successfully');

// Create stdio transport
const transport = new StdioServerTransport();

// Connect and start
async function main() {
  logger.info({ tesseractApiUrl: config.TESSERACT_API_URL }, 'Starting Tesseract MCP Server (stdio)');
  await server.connect(transport);
  logger.info('Tesseract MCP Server ready (stdio transport)');
}

main().catch((error) => {
  logger.error({ error }, 'Failed to start server');
  process.exit(1);
});

