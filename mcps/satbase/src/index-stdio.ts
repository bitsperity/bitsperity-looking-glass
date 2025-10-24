import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { config } from './config.js';
import { logger } from './logger.js';

// Import all tools
import { listNewsTool, deleteNewsTool, newsHeatmapTool, trendingTickersTool } from './lib/tools/news.js';
import { fredSearchTool, fredObservationsTool, fredCategoriesTool, fredRefreshCoreTool } from './lib/tools/macro.js';
import { listPricesTool } from './lib/tools/prices.js';
import { btcOracleTool, usdToBtcTool, btcToUsdTool } from './lib/tools/btc.js';
import { enqueueNewsTool, enqueueNewsBodiesTool, enqueuePricesTool, enqueueMacroTool } from './lib/tools/ingest.js';
import { listJobsTool, getJobTool, cleanupJobsTool, cancelJobTool } from './lib/tools/jobs.js';
import { getWatchlistTool, addWatchlistTool, removeWatchlistTool, refreshWatchlistTool, watchlistStatusTool } from './lib/tools/watchlist.js';
import { getTopicsTool, addTopicsTool } from './lib/tools/topics.js';
import { healthCheckTool } from './lib/tools/health.js';
import { getCoverageTool } from './lib/tools/status.js';

// Create MCP Server
const server = new McpServer({
  name: config.SERVER_NAME,
  version: '1.0.0',
});

// Register all tools
logger.info('Registering MCP tools...');

// Status (1 tool)
server.registerTool(getCoverageTool.name, getCoverageTool.config, getCoverageTool.handler);

// News (4 tools)
server.registerTool(listNewsTool.name, listNewsTool.config, listNewsTool.handler);
server.registerTool(deleteNewsTool.name, deleteNewsTool.config, deleteNewsTool.handler);
server.registerTool(newsHeatmapTool.name, newsHeatmapTool.config, newsHeatmapTool.handler);
server.registerTool(trendingTickersTool.name, trendingTickersTool.config, trendingTickersTool.handler);

// Macro (4 tools)
server.registerTool(fredSearchTool.name, fredSearchTool.config, fredSearchTool.handler);
server.registerTool(fredObservationsTool.name, fredObservationsTool.config, fredObservationsTool.handler);
server.registerTool(fredCategoriesTool.name, fredCategoriesTool.config, fredCategoriesTool.handler);
server.registerTool(fredRefreshCoreTool.name, fredRefreshCoreTool.config, fredRefreshCoreTool.handler);

// Prices (1 tool)
server.registerTool(listPricesTool.name, listPricesTool.config, listPricesTool.handler);

// BTC (3 tools)
server.registerTool(btcOracleTool.name, btcOracleTool.config, btcOracleTool.handler);
server.registerTool(usdToBtcTool.name, usdToBtcTool.config, usdToBtcTool.handler);
server.registerTool(btcToUsdTool.name, btcToUsdTool.config, btcToUsdTool.handler);

// Ingest (4 tools)
server.registerTool(enqueueNewsTool.name, enqueueNewsTool.config, enqueueNewsTool.handler);
server.registerTool(enqueueNewsBodiesTool.name, enqueueNewsBodiesTool.config, enqueueNewsBodiesTool.handler);
server.registerTool(enqueuePricesTool.name, enqueuePricesTool.config, enqueuePricesTool.handler);
server.registerTool(enqueueMacroTool.name, enqueueMacroTool.config, enqueueMacroTool.handler);

// Jobs (4 tools)
server.registerTool(listJobsTool.name, listJobsTool.config, listJobsTool.handler);
server.registerTool(getJobTool.name, getJobTool.config, getJobTool.handler);
server.registerTool(cleanupJobsTool.name, cleanupJobsTool.config, cleanupJobsTool.handler);
server.registerTool(cancelJobTool.name, cancelJobTool.config, cancelJobTool.handler);

// Watchlist (5 tools)
server.registerTool(getWatchlistTool.name, getWatchlistTool.config, getWatchlistTool.handler);
server.registerTool(addWatchlistTool.name, addWatchlistTool.config, addWatchlistTool.handler);
server.registerTool(removeWatchlistTool.name, removeWatchlistTool.config, removeWatchlistTool.handler);
server.registerTool(refreshWatchlistTool.name, refreshWatchlistTool.config, refreshWatchlistTool.handler);
server.registerTool(watchlistStatusTool.name, watchlistStatusTool.config, watchlistStatusTool.handler);

// Topics (2 tools)
server.registerTool(getTopicsTool.name, getTopicsTool.config, getTopicsTool.handler);
server.registerTool(addTopicsTool.name, addTopicsTool.config, addTopicsTool.handler);

// Health (1 tool)
server.registerTool(healthCheckTool.name, healthCheckTool.config, healthCheckTool.handler);

logger.info('29 tools registered successfully');

// Create stdio transport
const transport = new StdioServerTransport();

// Connect and start
async function main() {
  logger.info({ satbaseApiUrl: config.SATBASE_API_URL }, 'Starting Satbase MCP Server (stdio)');
  await server.connect(transport);
  logger.info('Satbase MCP Server ready (stdio transport)');
}

main().catch((error) => {
  logger.error({ error }, 'Failed to start server');
  process.exit(1);
});
