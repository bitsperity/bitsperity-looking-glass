import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { config } from '../config.js';
import { logger } from '../logger.js';
import {
  healthTool,
  statsTool,
  contextTool,
  impactTool,
  timelineTool,
  similarEntitiesTool,
  patternsSearchTool,
  patternOccurrencesTool,
  regimesCurrentTool,
  regimesSimilarTool,
  addFactTool,
  addObservationTool,
  addHypothesisTool,
  addEvidenceTool,
  validateHypothesisTool,
  pendingValidationsTool,
  getHypothesisTool,
  ingestPricesTool,
  adminResetTool,
  adminStatsTool,
  adminStatsDetailedTool,
  adminUpdateNodeTool,
  adminUpdateEdgeTool,
  adminDeleteNodeTool,
  adminDeleteEdgeTool,
  adminRetractHypothesisTool,
  adminDeletePatternTool,
  adminCleanupOrphansTool,
  suggestTickersTool,
  suggestTopicsTool,
  suggestEventTypesTool,
  suggestSectorsTool,
  suggestRelationTypesTool,
  suggestEventNamesTool,
  suggestCompanyNamesTool,
  suggestPatternCategoriesTool,
  suggestRegimeNamesTool
} from './tools/index.js';

export function createMcpServer(): McpServer {
  const server = new McpServer({ name: config.SERVER_NAME, version: '1.0.0' });

  logger.info('Registering Ariadne MCP tools...');

  const tools = [
    healthTool,
    statsTool,
    contextTool,
    impactTool,
    timelineTool,
    similarEntitiesTool,
    patternsSearchTool,
    patternOccurrencesTool,
    regimesCurrentTool,
    regimesSimilarTool,
    addFactTool,
    addObservationTool,
    addHypothesisTool,
    addEvidenceTool,
    validateHypothesisTool,
    pendingValidationsTool,
    getHypothesisTool,
    ingestPricesTool,
    adminResetTool,
    adminStatsTool,
    adminStatsDetailedTool,
    adminUpdateNodeTool,
    adminUpdateEdgeTool,
    adminDeleteNodeTool,
    adminDeleteEdgeTool,
    adminRetractHypothesisTool,
    adminDeletePatternTool,
    adminCleanupOrphansTool,
    suggestTickersTool,
    suggestTopicsTool,
    suggestEventTypesTool,
    suggestSectorsTool,
    suggestRelationTypesTool,
    suggestEventNamesTool,
    suggestCompanyNamesTool,
    suggestPatternCategoriesTool,
    suggestRegimeNamesTool
  ];

  tools.forEach((t) => server.registerTool(t.name, t.config, t.handler));

  logger.info(`${tools.length} Ariadne tools registered successfully`);
  return server;
}
