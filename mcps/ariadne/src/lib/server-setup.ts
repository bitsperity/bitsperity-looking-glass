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
  suggestRegimeNamesTool,
  centralityTool,
  communitiesTool,
  similarityTool,
  linkPredictionTool,
  confidencePropagateTool,
  riskTool,
  lineageTool,
  impactSimulationTool,
  opportunitiesTool,
  contradictionsTool,
  gapsTool,
  anomaliesTool,
  duplicatesTool,
  dedupPlanTool,
  dedupExecuteTool,
  learningApplyFeedbackTool,
  learningHistoryTool,
  snapshotDegreesTool
} from './tools/index.js';

export function createMcpServer(): McpServer {
  const server = new McpServer({ name: config.SERVER_NAME, version: '1.0.0' });

  logger.info('Registering Ariadne MCP tools...');

  // Health & Stats
  server.registerTool(healthTool.name, healthTool.config, healthTool.handler);
  server.registerTool(statsTool.name, statsTool.config, statsTool.handler);

  // Read / Analyse
  server.registerTool(contextTool.name, contextTool.config, contextTool.handler);
  server.registerTool(impactTool.name, impactTool.config, impactTool.handler);
  server.registerTool(timelineTool.name, timelineTool.config, timelineTool.handler);
  server.registerTool(similarEntitiesTool.name, similarEntitiesTool.config, similarEntitiesTool.handler);
  server.registerTool(patternsSearchTool.name, patternsSearchTool.config, patternsSearchTool.handler);
  server.registerTool(patternOccurrencesTool.name, patternOccurrencesTool.config, patternOccurrencesTool.handler);
  server.registerTool(regimesCurrentTool.name, regimesCurrentTool.config, regimesCurrentTool.handler);
  server.registerTool(regimesSimilarTool.name, regimesSimilarTool.config, regimesSimilarTool.handler);

  // Write
  server.registerTool(addFactTool.name, addFactTool.config, addFactTool.handler);
  server.registerTool(addObservationTool.name, addObservationTool.config, addObservationTool.handler);
  server.registerTool(addHypothesisTool.name, addHypothesisTool.config, addHypothesisTool.handler);

  // Validate
  server.registerTool(addEvidenceTool.name, addEvidenceTool.config, addEvidenceTool.handler);
  server.registerTool(validateHypothesisTool.name, validateHypothesisTool.config, validateHypothesisTool.handler);
  server.registerTool(pendingValidationsTool.name, pendingValidationsTool.config, pendingValidationsTool.handler);
  server.registerTool(getHypothesisTool.name, getHypothesisTool.config, getHypothesisTool.handler);

  // Ingest
  server.registerTool(ingestPricesTool.name, ingestPricesTool.config, ingestPricesTool.handler);

  // Admin
  server.registerTool(adminResetTool.name, adminResetTool.config, adminResetTool.handler);
  server.registerTool(adminStatsTool.name, adminStatsTool.config, adminStatsTool.handler);
  server.registerTool(adminStatsDetailedTool.name, adminStatsDetailedTool.config, adminStatsDetailedTool.handler);
  server.registerTool(adminUpdateNodeTool.name, adminUpdateNodeTool.config, adminUpdateNodeTool.handler);
  server.registerTool(adminUpdateEdgeTool.name, adminUpdateEdgeTool.config, adminUpdateEdgeTool.handler);
  server.registerTool(adminDeleteNodeTool.name, adminDeleteNodeTool.config, adminDeleteNodeTool.handler);
  server.registerTool(adminDeleteEdgeTool.name, adminDeleteEdgeTool.config, adminDeleteEdgeTool.handler);
  server.registerTool(adminRetractHypothesisTool.name, adminRetractHypothesisTool.config, adminRetractHypothesisTool.handler);
  server.registerTool(adminDeletePatternTool.name, adminDeletePatternTool.config, adminDeletePatternTool.handler);
  server.registerTool(adminCleanupOrphansTool.name, adminCleanupOrphansTool.config, adminCleanupOrphansTool.handler);

  // Suggestions
  server.registerTool(suggestTickersTool.name, suggestTickersTool.config, suggestTickersTool.handler);
  server.registerTool(suggestTopicsTool.name, suggestTopicsTool.config, suggestTopicsTool.handler);
  server.registerTool(suggestEventTypesTool.name, suggestEventTypesTool.config, suggestEventTypesTool.handler);
  server.registerTool(suggestSectorsTool.name, suggestSectorsTool.config, suggestSectorsTool.handler);
  server.registerTool(suggestRelationTypesTool.name, suggestRelationTypesTool.config, suggestRelationTypesTool.handler);
  server.registerTool(suggestEventNamesTool.name, suggestEventNamesTool.config, suggestEventNamesTool.handler);
  server.registerTool(suggestCompanyNamesTool.name, suggestCompanyNamesTool.config, suggestCompanyNamesTool.handler);
  server.registerTool(suggestPatternCategoriesTool.name, suggestPatternCategoriesTool.config, suggestPatternCategoriesTool.handler);
  server.registerTool(suggestRegimeNamesTool.name, suggestRegimeNamesTool.config, suggestRegimeNamesTool.handler);

  // Analytics
  server.registerTool(centralityTool.name, centralityTool.config, centralityTool.handler);
  server.registerTool(communitiesTool.name, communitiesTool.config, communitiesTool.handler);
  server.registerTool(similarityTool.name, similarityTool.config, similarityTool.handler);
  server.registerTool(linkPredictionTool.name, linkPredictionTool.config, linkPredictionTool.handler);
  server.registerTool(confidencePropagateTool.name, confidencePropagateTool.config, confidencePropagateTool.handler);

  // Decision Support
  server.registerTool(riskTool.name, riskTool.config, riskTool.handler);
  server.registerTool(lineageTool.name, lineageTool.config, lineageTool.handler);
  server.registerTool(impactSimulationTool.name, impactSimulationTool.config, impactSimulationTool.handler);
  server.registerTool(opportunitiesTool.name, opportunitiesTool.config, opportunitiesTool.handler);

  // Quality
  server.registerTool(contradictionsTool.name, contradictionsTool.config, contradictionsTool.handler);
  server.registerTool(gapsTool.name, gapsTool.config, gapsTool.handler);
  server.registerTool(anomaliesTool.name, anomaliesTool.config, anomaliesTool.handler);
  server.registerTool(duplicatesTool.name, duplicatesTool.config, duplicatesTool.handler);

  // Deduplication
  server.registerTool(dedupPlanTool.name, dedupPlanTool.config, dedupPlanTool.handler);
  server.registerTool(dedupExecuteTool.name, dedupExecuteTool.config, dedupExecuteTool.handler);

  // Learning
  server.registerTool(learningApplyFeedbackTool.name, learningApplyFeedbackTool.config, learningApplyFeedbackTool.handler);
  server.registerTool(learningHistoryTool.name, learningHistoryTool.config, learningHistoryTool.handler);

  // Snapshot
  server.registerTool(snapshotDegreesTool.name, snapshotDegreesTool.config, snapshotDegreesTool.handler);

  logger.info('55 Ariadne tools registered successfully');
  return server;
}
