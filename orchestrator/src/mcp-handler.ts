import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { logger } from './logger.js';

interface MCPConfig {
  command: string;
  args: string[];
}

/**
 * Manages MCP clients per agent run
 * Each agent run gets its own set of clients that are closed after the run
 */
export class MCPHandler {
  private clients: Map<string, Client> = new Map();
  private transports: Map<string, StdioClientTransport> = new Map();
  private mcpConfigs: Record<string, MCPConfig>;

  constructor(mcpConfigs: Record<string, MCPConfig>) {
    this.mcpConfigs = mcpConfigs;
  }

  async getClient(mcpName: string, command: string, args: string[]): Promise<Client> {
    // Return existing client if already connected
    if (this.clients.has(mcpName)) {
      return this.clients.get(mcpName)!;
    }

    logger.debug({ mcp: mcpName, command, args }, 'Creating new MCP client');

    try {
      const transport = new StdioClientTransport({ command, args });
      const client = new Client({ name: `orchestrator-client-${mcpName}`, version: '1.0.0' });

      await client.connect(transport);
      
      this.clients.set(mcpName, client);
      this.transports.set(mcpName, transport);
      
      logger.info({ mcp: mcpName }, 'MCP client connected');
      return client;
    } catch (error) {
      logger.error(
        {
          mcp: mcpName,
          command,
          args,
          error: error instanceof Error ? { message: error.message, stack: error.stack } : error
        },
        'Failed to create MCP client'
      );
      throw error;
    }
  }

  async getTools(mcpName: string, client: Client): Promise<Record<string, any>> {
    logger.debug({ mcp: mcpName }, 'Loading tools from MCP');

    try {
      const toolList = await client.listTools();
      const aiSdkTools: Record<string, any> = {};

      for (const tool of toolList.tools) {
        // Sanitize tool name for Anthropic API: [a-zA-Z0-9_-]{1,128}
        const sanitizedToolName = `${mcpName}_${tool.name}`
          .replace(/\./g, '_')
          .replace(/-/g, '_')
          .substring(0, 128);

        // Map MCP tool schema to AI SDK format
        const schema = tool.inputSchema || { type: 'object', properties: {} };
        aiSdkTools[sanitizedToolName] = {
          description: tool.description?.substring(0, 1024) || tool.name,
          parameters: {
            type: schema.type || 'object',
            properties: schema.properties || {},
            required: schema.required || []
          }
        };
      }

      logger.info(
        { mcp: mcpName, toolCount: Object.keys(aiSdkTools).length },
        'Tools loaded successfully'
      );
      
      return aiSdkTools;
    } catch (error) {
      logger.error(
        {
          mcp: mcpName,
          error: error instanceof Error ? { message: error.message, stack: error.stack } : error
        },
        'Failed to load tools from MCP'
      );
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down MCP Handler clients');
    for (const [mcpName, client] of this.clients.entries()) {
      try {
        await client.close();
        const transport = this.transports.get(mcpName);
        if (transport) {
          transport.close?.();
        }
        logger.info({ mcp: mcpName }, 'MCP client disconnected');
      } catch (error) {
        logger.error({ mcp: mcpName, error }, 'Error closing MCP client connection');
      }
    }
    this.clients.clear();
    this.transports.clear();
  }
}
