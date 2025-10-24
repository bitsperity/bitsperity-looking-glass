import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { logger } from './logger.js';
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
} from './lib/tools/index.js';

async function main() {
  const server = new McpServer({ name: 'ariadne-mcp', version: '1.0.0' });

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

  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('Ariadne MCP (stdio) listening on stdio');
}

main().catch((err) => {
  logger.error({ err }, 'Ariadne MCP failed');
  process.exit(1);
});


