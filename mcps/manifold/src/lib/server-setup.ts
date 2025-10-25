import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { config } from '../config.js';
import { logger } from '../logger.js';

// Tools
import { getHealthTool, getConfigTool, getDeviceTool } from './tools/health.js';
import { createThoughtTool, getThoughtTool, patchThoughtTool, deleteThoughtTool } from './tools/thoughts.js';
import { searchThoughtsTool, getTimelineTool, getStatsTool } from './tools/search.js';
import { linkRelatedTool, unlinkRelatedTool, getRelatedTool, getRelatedFacetsTool, getRelatedGraphTool } from './tools/relations.js';
import { getBirdviewGraphTool } from './tools/graph.js';
import { promoteThoughtTool, syncAriadneTool } from './tools/promote.js';
import { getHistoryTool, reembedThoughtTool, reindexCollectionTool, dedupeThoughtsTool, bulkQuarantineTool, bulkUnquarantineTool, bulkReembedTool, bulkPromoteTool, getTrashTool, restoreFromTrashTool, getSimilarTool } from './tools/admin.js';

export function createMcpServer(): McpServer {
  const server = new McpServer({ name: config.SERVER_NAME, version: '1.0.0' });

  logger.info('Registering Manifold MCP tools...');

  // Health
  server.registerTool(getHealthTool.name, getHealthTool.config, getHealthTool.handler);
  server.registerTool(getConfigTool.name, getConfigTool.config, getConfigTool.handler);
  server.registerTool(getDeviceTool.name, getDeviceTool.config, getDeviceTool.handler);

  // Thoughts CRUD
  server.registerTool(createThoughtTool.name, createThoughtTool.config, createThoughtTool.handler);
  server.registerTool(getThoughtTool.name, getThoughtTool.config, getThoughtTool.handler);
  server.registerTool(patchThoughtTool.name, patchThoughtTool.config, patchThoughtTool.handler);
  server.registerTool(deleteThoughtTool.name, deleteThoughtTool.config, deleteThoughtTool.handler);

  // Search & Analytics
  server.registerTool(searchThoughtsTool.name, searchThoughtsTool.config, searchThoughtsTool.handler);
  server.registerTool(getTimelineTool.name, getTimelineTool.config, getTimelineTool.handler);
  server.registerTool(getStatsTool.name, getStatsTool.config, getStatsTool.handler);

  // Relations & Graph
  server.registerTool(linkRelatedTool.name, linkRelatedTool.config, linkRelatedTool.handler);
  server.registerTool(unlinkRelatedTool.name, unlinkRelatedTool.config, unlinkRelatedTool.handler);
  server.registerTool(getRelatedTool.name, getRelatedTool.config, getRelatedTool.handler);
  server.registerTool(getRelatedFacetsTool.name, getRelatedFacetsTool.config, getRelatedFacetsTool.handler);
  server.registerTool(getRelatedGraphTool.name, getRelatedGraphTool.config, getRelatedGraphTool.handler);
  server.registerTool(getBirdviewGraphTool.name, getBirdviewGraphTool.config, getBirdviewGraphTool.handler);

  // Promote & Sync
  server.registerTool(promoteThoughtTool.name, promoteThoughtTool.config, promoteThoughtTool.handler);
  server.registerTool(syncAriadneTool.name, syncAriadneTool.config, syncAriadneTool.handler);

  // Admin
  server.registerTool(getHistoryTool.name, getHistoryTool.config, getHistoryTool.handler);
  server.registerTool(reembedThoughtTool.name, reembedThoughtTool.config, reembedThoughtTool.handler);
  server.registerTool(reindexCollectionTool.name, reindexCollectionTool.config, reindexCollectionTool.handler);
  server.registerTool(dedupeThoughtsTool.name, dedupeThoughtsTool.config, dedupeThoughtsTool.handler);
  server.registerTool(bulkQuarantineTool.name, bulkQuarantineTool.config, bulkQuarantineTool.handler);
  server.registerTool(bulkUnquarantineTool.name, bulkUnquarantineTool.config, bulkUnquarantineTool.handler);
  server.registerTool(bulkReembedTool.name, bulkReembedTool.config, bulkReembedTool.handler);
  server.registerTool(bulkPromoteTool.name, bulkPromoteTool.config, bulkPromoteTool.handler);
  server.registerTool(getTrashTool.name, getTrashTool.config, getTrashTool.handler);
  server.registerTool(restoreFromTrashTool.name, restoreFromTrashTool.config, restoreFromTrashTool.handler);
  server.registerTool(getSimilarTool.name, getSimilarTool.config, getSimilarTool.handler);

  logger.info('18 Manifold tools registered successfully');
  return server;
}
