import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import { logger } from './logger.js';

interface MCPConfig {
  [mcpName: string]: {
    command: string;
    args: string[];
  };
}

export class MCPPool {
  private clients: Map<string, Client> = new Map();
  private transports: Map<string, StdioClientTransport> = new Map();
  private toolCache: Map<string, any> = new Map();
  private config: MCPConfig;

  constructor(config: MCPConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    logger.info('Initializing MCP Pool...');

    for (const [mcpName, mcpConfig] of Object.entries(this.config)) {
      try {
        logger.info({ mcp: mcpName, command: mcpConfig.command }, 'Connecting to MCP');

        const transport = new StdioClientTransport({
          command: mcpConfig.command,
          args: mcpConfig.args
        });

        const client = new Client({
          name: `orchestrator-client-${mcpName}`,
          version: '1.0.0'
        });

        await client.connect(transport);
        this.clients.set(mcpName, client);
        this.transports.set(mcpName, transport);

        // Cache tools for this MCP
        const toolList = await client.listTools();
        for (const tool of toolList.tools) {
          const fullToolName = `${mcpName}.${tool.name}`;
          this.toolCache.set(fullToolName, tool);
        }

        logger.info({ mcp: mcpName, toolCount: toolList.tools.length }, 'MCP connected');
      } catch (error) {
        logger.error({ mcp: mcpName, error }, 'Failed to connect to MCP');
        throw error;
      }
    }

    logger.info({ totalTools: this.toolCache.size }, 'MCP Pool initialized');
  }

  async getTools(mcpNames: string[]): Promise<Record<string, any>> {
    const tools: Record<string, any> = {};

    for (const mcpName of mcpNames) {
      const client = this.clients.get(mcpName);
      if (!client) {
        logger.warn({ mcp: mcpName }, 'MCP not found in pool');
        continue;
      }

      const toolList = await client.listTools();
      for (const tool of toolList.tools) {
        // Sanitize tool name: Anthropic only allows [a-zA-Z0-9_-]
        // Replace dots with underscores: satbase.list-news -> satbase_list_news
        const sanitizedToolName = `${mcpName}_${tool.name}`.replace(/\./g, '_').replace(/-/g, '_');
        
        // Ensure inputSchema is properly formatted
        // MCP tools have inputSchema as part of their spec, convert to Zod-like format
        const schema = tool.inputSchema || { type: 'object', properties: {} };
        
        tools[sanitizedToolName] = {
          description: tool.description?.substring(0, 1024) || `${mcpName}: ${tool.name}`,
          parameters: schema
        };
      }
    }

    return tools;
  }

  async callTool(toolName: string, args: any): Promise<any> {
    const [mcpName, toolMethod] = toolName.split('.');

    const client = this.clients.get(mcpName);
    if (!client) {
      throw new Error(`MCP not found: ${mcpName}`);
    }

    logger.debug({ tool: toolName, args }, 'Calling tool');

    const result = await client.callTool({
      name: toolMethod,
      arguments: args
    });

    return result;
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down MCP Pool');

    for (const [mcpName, client] of this.clients.entries()) {
      try {
        await client.close();
        const transport = this.transports.get(mcpName);
        if (transport) {
          transport.close?.();
        }
        logger.info({ mcp: mcpName }, 'MCP disconnected');
      } catch (error) {
        logger.error({ mcp: mcpName, error }, 'Error closing MCP connection');
      }
    }
  }

  public getConfig(): MCPConfig {
    return this.config;
  }
}
