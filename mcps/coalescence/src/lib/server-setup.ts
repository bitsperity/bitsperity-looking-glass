import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { config } from '../config.js';
import { logger } from '../logger.js';

// Import all tools
import {
  listAgentsTool,
  getAgentTool,
  createAgentTool,
  updateAgentTool,
  deleteAgentTool,
  triggerAgentTool
} from './tools/agents.js';
import { getRunContextTool, saveRunContextTool } from './tools/context.js';
import { saveInsightsTool, getInsightsTool } from './tools/insights.js';
import { sendMessageTool, getMessagesTool, markMessageReadTool } from './tools/messages.js';
import {
  listRulesTool,
  getRuleTool,
  createRuleTool,
  updateRuleTool,
  deleteRuleTool
} from './tools/rules.js';
import { listAllToolsTool } from './tools/tools.js';

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: config.SERVER_NAME,
    version: '1.0.0',
  });

  // Register all tools
  logger.info('Registering Coalesence MCP tools...');

  // Agents (6 tools)
  server.registerTool(listAgentsTool.name, listAgentsTool.config, listAgentsTool.handler);
  server.registerTool(getAgentTool.name, getAgentTool.config, getAgentTool.handler);
  server.registerTool(createAgentTool.name, createAgentTool.config, createAgentTool.handler);
  server.registerTool(updateAgentTool.name, updateAgentTool.config, updateAgentTool.handler);
  server.registerTool(deleteAgentTool.name, deleteAgentTool.config, deleteAgentTool.handler);
  server.registerTool(triggerAgentTool.name, triggerAgentTool.config, triggerAgentTool.handler);

  // Rules (5 tools)
  server.registerTool(listRulesTool.name, listRulesTool.config, listRulesTool.handler);
  server.registerTool(getRuleTool.name, getRuleTool.config, getRuleTool.handler);
  server.registerTool(createRuleTool.name, createRuleTool.config, createRuleTool.handler);
  server.registerTool(updateRuleTool.name, updateRuleTool.config, updateRuleTool.handler);
  server.registerTool(deleteRuleTool.name, deleteRuleTool.config, deleteRuleTool.handler);

  // Context (2 tools)
  server.registerTool(getRunContextTool.name, getRunContextTool.config, getRunContextTool.handler);
  server.registerTool(saveRunContextTool.name, saveRunContextTool.config, saveRunContextTool.handler);

  // Insights (2 tools)
  server.registerTool(saveInsightsTool.name, saveInsightsTool.config, saveInsightsTool.handler);
  server.registerTool(getInsightsTool.name, getInsightsTool.config, getInsightsTool.handler);

  // Messages (3 tools)
  server.registerTool(sendMessageTool.name, sendMessageTool.config, sendMessageTool.handler);
  server.registerTool(getMessagesTool.name, getMessagesTool.config, getMessagesTool.handler);
  server.registerTool(markMessageReadTool.name, markMessageReadTool.config, markMessageReadTool.handler);

  // Tools (1 tool)
  server.registerTool(listAllToolsTool.name, listAllToolsTool.config, listAllToolsTool.handler);

  logger.info('Coalesence MCP server initialized with 19 tools');

  return server;
}

