import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { config } from '../config.js';
import { logger } from '../logger.js';

// Import all tools
import {
  listAgentsTool,
  getAgentTool,
  createAgentTool,
  updateAgentTool,
  deleteAgentTool
} from './tools/agents.js';
import { getRunContextTool } from './tools/context.js';
import { saveInsightsTool, getInsightsTool } from './tools/insights.js';
import { sendMessageTool, getMessagesTool } from './tools/messages.js';
import { listAllToolsTool } from './tools/tools.js';

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: config.SERVER_NAME,
    version: '1.0.0',
  });

  // Register all tools
  logger.info('Registering Coalesence MCP tools...');

  // Agents (5 tools)
  server.registerTool(listAgentsTool.name, listAgentsTool.config, listAgentsTool.handler);
  server.registerTool(getAgentTool.name, getAgentTool.config, getAgentTool.handler);
  server.registerTool(createAgentTool.name, createAgentTool.config, createAgentTool.handler);
  server.registerTool(updateAgentTool.name, updateAgentTool.config, updateAgentTool.handler);
  server.registerTool(deleteAgentTool.name, deleteAgentTool.config, deleteAgentTool.handler);

  // Context (1 tool)
  server.registerTool(getRunContextTool.name, getRunContextTool.config, getRunContextTool.handler);

  // Insights (2 tools)
  server.registerTool(saveInsightsTool.name, saveInsightsTool.config, saveInsightsTool.handler);
  server.registerTool(getInsightsTool.name, getInsightsTool.config, getInsightsTool.handler);

  // Messages (2 tools)
  server.registerTool(sendMessageTool.name, sendMessageTool.config, sendMessageTool.handler);
  server.registerTool(getMessagesTool.name, getMessagesTool.config, getMessagesTool.handler);

  // Tools (1 tool)
  server.registerTool(listAllToolsTool.name, listAllToolsTool.config, listAllToolsTool.handler);

  logger.info('Coalesence MCP server initialized with 11 tools');

  return server;
}

