import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { config } from '../config.js';
import { logger } from '../logger.js';

// Import all tools
import { searchTool } from './tools/search.js';
import { similarTool } from './tools/similar.js';
import { initCollectionTool } from './tools/admin-init.js';
import { startBatchEmbeddingTool, getEmbeddingStatusTool } from './tools/admin-embed.js';
import {
  listCollectionsTool,
  switchCollectionTool,
  deleteCollectionTool,
} from './tools/admin-collections.js';

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: config.SERVER_NAME,
    version: '1.0.0',
  });

  logger.info('Registering Tesseract MCP tools...');

  server.registerTool(searchTool.name, searchTool.config, searchTool.handler);
  server.registerTool(similarTool.name, similarTool.config, similarTool.handler);
  server.registerTool(initCollectionTool.name, initCollectionTool.config, initCollectionTool.handler);
  server.registerTool(startBatchEmbeddingTool.name, startBatchEmbeddingTool.config, startBatchEmbeddingTool.handler);
  server.registerTool(getEmbeddingStatusTool.name, getEmbeddingStatusTool.config, getEmbeddingStatusTool.handler);
  server.registerTool(listCollectionsTool.name, listCollectionsTool.config, listCollectionsTool.handler);
  server.registerTool(switchCollectionTool.name, switchCollectionTool.config, switchCollectionTool.handler);
  server.registerTool(deleteCollectionTool.name, deleteCollectionTool.config, deleteCollectionTool.handler);

  logger.info('8 Tesseract tools registered successfully');
  return server;
}
