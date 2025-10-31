import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { config } from '../config.js';
import { logger } from '../logger.js';

// Import all tools
import { listNewsTool, deleteNewsTool, newsHeatmapTool, trendingTickersTool, newsAnalyticsTool, getNewsByIdTool, bulkNewsTool, newsHealthTool, integrityCheckTool } from './tools/news.js';
import { fredSearchTool, fredObservationsTool, fredCategoriesTool, fredRefreshCoreTool, macroStatusTool } from './tools/macro.js';
import { listPricesTool, searchPricesTool, pricesInfoTool, pricesFundamentalsTool, pricesStatusTool } from './tools/prices.js';
import { btcOracleTool, usdToBtcTool, btcToUsdTool } from './tools/btc.js';
import { enqueueNewsTool, enqueueNewsBodiesTool, enqueuePricesTool, enqueueMacroTool, newsBackfillTool } from './tools/ingest.js';
import { listJobsTool, getJobTool, cleanupJobsTool, cancelJobTool, retryJobTool, adminJobsTool, adminJobsStatsTool } from './tools/jobs.js';
import { getWatchlistTool, addWatchlistTool, removeWatchlistTool, refreshWatchlistTool, watchlistStatusTool, updateWatchlistTool } from './tools/watchlist.js';
import { getTopicsTool, addTopicsTool, topicsAllTool, topicsSummaryTool, topicsStatsTool, topicsCoverageTool, deleteTopicTool } from './tools/topics.js';
import { healthCheckTool } from './tools/health.js';
import { getCoverageTool } from './tools/status.js';
import { newsGapsTool, cleanupJunkBodiesTool, cleanupQualityBodiesTool, newsSchemaInfoTool, getAuditLogTool, getDuplicateArticlesTool, newsMetricsTool, auditStatsTool, refetchBodiesTool, listAdaptersTool, backfillMonitorTool } from './tools/admin.js';

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: config.SERVER_NAME,
    version: '1.0.0',
  });

  // Register all tools
  logger.info('Registering MCP tools...');

  // Status (1 tool)
  server.registerTool(getCoverageTool.name, getCoverageTool.config, getCoverageTool.handler);

  // News (9 tools)
  server.registerTool(listNewsTool.name, listNewsTool.config, listNewsTool.handler);
  server.registerTool(deleteNewsTool.name, deleteNewsTool.config, deleteNewsTool.handler);
  server.registerTool(newsHeatmapTool.name, newsHeatmapTool.config, newsHeatmapTool.handler);
  server.registerTool(trendingTickersTool.name, trendingTickersTool.config, trendingTickersTool.handler);
  server.registerTool(newsAnalyticsTool.name, newsAnalyticsTool.config, newsAnalyticsTool.handler);
  server.registerTool(getNewsByIdTool.name, getNewsByIdTool.config, getNewsByIdTool.handler);
  server.registerTool(bulkNewsTool.name, bulkNewsTool.config, bulkNewsTool.handler);
  server.registerTool(newsHealthTool.name, newsHealthTool.config, newsHealthTool.handler);
  server.registerTool(integrityCheckTool.name, integrityCheckTool.config, integrityCheckTool.handler);

  // Macro (5 tools)
  server.registerTool(fredSearchTool.name, fredSearchTool.config, fredSearchTool.handler);
  server.registerTool(fredObservationsTool.name, fredObservationsTool.config, fredObservationsTool.handler);
  server.registerTool(fredCategoriesTool.name, fredCategoriesTool.config, fredCategoriesTool.handler);
  server.registerTool(fredRefreshCoreTool.name, fredRefreshCoreTool.config, fredRefreshCoreTool.handler);
  server.registerTool(macroStatusTool.name, macroStatusTool.config, macroStatusTool.handler);

  // Prices (5 tools)
  server.registerTool(listPricesTool.name, listPricesTool.config, listPricesTool.handler);
  server.registerTool(searchPricesTool.name, searchPricesTool.config, searchPricesTool.handler);
  server.registerTool(pricesInfoTool.name, pricesInfoTool.config, pricesInfoTool.handler);
  server.registerTool(pricesFundamentalsTool.name, pricesFundamentalsTool.config, pricesFundamentalsTool.handler);
  server.registerTool(pricesStatusTool.name, pricesStatusTool.config, pricesStatusTool.handler);

  // BTC (3 tools)
  server.registerTool(btcOracleTool.name, btcOracleTool.config, btcOracleTool.handler);
  server.registerTool(usdToBtcTool.name, usdToBtcTool.config, usdToBtcTool.handler);
  server.registerTool(btcToUsdTool.name, btcToUsdTool.config, btcToUsdTool.handler);

  // Ingest (5 tools)
  server.registerTool(enqueueNewsTool.name, enqueueNewsTool.config, enqueueNewsTool.handler);
  server.registerTool(enqueueNewsBodiesTool.name, enqueueNewsBodiesTool.config, enqueueNewsBodiesTool.handler);
  server.registerTool(enqueuePricesTool.name, enqueuePricesTool.config, enqueuePricesTool.handler);
  server.registerTool(enqueueMacroTool.name, enqueueMacroTool.config, enqueueMacroTool.handler);
  server.registerTool(newsBackfillTool.name, newsBackfillTool.config, newsBackfillTool.handler);

  // Jobs (7 tools)
  server.registerTool(listJobsTool.name, listJobsTool.config, listJobsTool.handler);
  server.registerTool(getJobTool.name, getJobTool.config, getJobTool.handler);
  server.registerTool(cleanupJobsTool.name, cleanupJobsTool.config, cleanupJobsTool.handler);
  server.registerTool(cancelJobTool.name, cancelJobTool.config, cancelJobTool.handler);
  server.registerTool(retryJobTool.name, retryJobTool.config, retryJobTool.handler);
  server.registerTool(adminJobsTool.name, adminJobsTool.config, adminJobsTool.handler);
  server.registerTool(adminJobsStatsTool.name, adminJobsStatsTool.config, adminJobsStatsTool.handler);

  // Watchlist (6 tools)
  server.registerTool(getWatchlistTool.name, getWatchlistTool.config, getWatchlistTool.handler);
  server.registerTool(addWatchlistTool.name, addWatchlistTool.config, addWatchlistTool.handler);
  server.registerTool(removeWatchlistTool.name, removeWatchlistTool.config, removeWatchlistTool.handler);
  server.registerTool(refreshWatchlistTool.name, refreshWatchlistTool.config, refreshWatchlistTool.handler);
  server.registerTool(watchlistStatusTool.name, watchlistStatusTool.config, watchlistStatusTool.handler);
  server.registerTool(updateWatchlistTool.name, updateWatchlistTool.config, updateWatchlistTool.handler);

  // Topics (7 tools)
  server.registerTool(getTopicsTool.name, getTopicsTool.config, getTopicsTool.handler);
  server.registerTool(addTopicsTool.name, addTopicsTool.config, addTopicsTool.handler);
  server.registerTool(topicsAllTool.name, topicsAllTool.config, topicsAllTool.handler);
  server.registerTool(topicsSummaryTool.name, topicsSummaryTool.config, topicsSummaryTool.handler);
  server.registerTool(topicsStatsTool.name, topicsStatsTool.config, topicsStatsTool.handler);
  server.registerTool(topicsCoverageTool.name, topicsCoverageTool.config, topicsCoverageTool.handler);
  server.registerTool(deleteTopicTool.name, deleteTopicTool.config, deleteTopicTool.handler);

  // Health (1 tool)
  server.registerTool(healthCheckTool.name, healthCheckTool.config, healthCheckTool.handler);

  // Admin/Quality (12 tools)
  server.registerTool(newsGapsTool.name, newsGapsTool.config, newsGapsTool.handler);
  server.registerTool(cleanupJunkBodiesTool.name, cleanupJunkBodiesTool.config, cleanupJunkBodiesTool.handler);
  server.registerTool(cleanupQualityBodiesTool.name, cleanupQualityBodiesTool.config, cleanupQualityBodiesTool.handler);
  server.registerTool(newsSchemaInfoTool.name, newsSchemaInfoTool.config, newsSchemaInfoTool.handler);
  server.registerTool(getAuditLogTool.name, getAuditLogTool.config, getAuditLogTool.handler);
  server.registerTool(getDuplicateArticlesTool.name, getDuplicateArticlesTool.config, getDuplicateArticlesTool.handler);
  server.registerTool(newsMetricsTool.name, newsMetricsTool.config, newsMetricsTool.handler);
  server.registerTool(auditStatsTool.name, auditStatsTool.config, auditStatsTool.handler);
  server.registerTool(refetchBodiesTool.name, refetchBodiesTool.config, refetchBodiesTool.handler);
  server.registerTool(listAdaptersTool.name, listAdaptersTool.config, listAdaptersTool.handler);
  server.registerTool(backfillMonitorTool.name, backfillMonitorTool.config, backfillMonitorTool.handler);

  logger.info('59 tools registered successfully (47 core + 12 admin/quality)');
  return server;
}
