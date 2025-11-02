import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { config } from '../config.js';
import { logger } from '../logger.js';

// Import all tools
import { searchCompanyTool, getCompanyProfileTool, getCompanyQuoteTool, getCompanyPricesTool } from './tools/finance.js';
import { searchWebTool, fetchUrlTool } from './tools/web.js';
import { searchNewsTool } from './tools/news.js';

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: config.SERVER_NAME,
    version: '1.0.0',
  });

  // Register all tools
  logger.info('Registering MCP tools...');

  // Finance tools (4 tools)
  server.registerTool(searchCompanyTool.name, searchCompanyTool.config, searchCompanyTool.handler);
  server.registerTool(getCompanyProfileTool.name, getCompanyProfileTool.config, getCompanyProfileTool.handler);
  server.registerTool(getCompanyQuoteTool.name, getCompanyQuoteTool.config, getCompanyQuoteTool.handler);
  server.registerTool(getCompanyPricesTool.name, getCompanyPricesTool.config, getCompanyPricesTool.handler);

  // Web tools (2 tools - Jina proxy)
  server.registerTool(searchWebTool.name, searchWebTool.config, searchWebTool.handler);
  server.registerTool(fetchUrlTool.name, fetchUrlTool.config, fetchUrlTool.handler);

  // News tools (1 tool - Mediastack)
  server.registerTool(searchNewsTool.name, searchNewsTool.config, searchNewsTool.handler);

  logger.info('All tools registered');
  return server;
}

