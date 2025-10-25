import { experimental_createMCPClient as createMCPClient, type MCPClient } from 'ai';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { logger } from './logger.js';

// Simple cache for MCP clients
class MCPClientCache {
  private clients: Map<string, MCPClient> = new Map();

  async getClient(mcpName: string, command: string, args: string[]): Promise<MCPClient> {
    if (this.clients.has(mcpName)) {
      return this.clients.get(mcpName)!;
    }

    logger.info({ mcp: mcpName }, 'Creating MCP client');

    try {
      const transport = new StdioClientTransport({ command, args });
      const client = await createMCPClient({ transport });
      this.clients.set(mcpName, client);
      logger.info({ mcp: mcpName }, 'MCP client created successfully');
      return client;
    } catch (error) {
      logger.error(
        {
          mcp: mcpName,
          error: error instanceof Error ? error.message : String(error)
        },
        'Failed to create MCP client'
      );
      throw error;
    }
  }

  async getTools(mcpName: string, client: MCPClient): Promise<Record<string, any>> {
    logger.debug({ mcp: mcpName }, 'Loading tools from MCP');

    try {
      // Use Schema Discovery (simpler, just works)
      const tools = await client.tools();
      logger.info({ mcp: mcpName, toolCount: Object.keys(tools).length }, 'Tools loaded');
      return tools;
    } catch (error) {
      logger.error(
        {
          mcp: mcpName,
          error: error instanceof Error ? error.message : String(error)
        },
        'Failed to load tools'
      );
      return {};
    }
  }

  async close(): Promise<void> {
    logger.info('Closing MCP clients');
    for (const client of this.clients.values()) {
      try {
        await client.close?.();
      } catch (error) {
        logger.error({ error }, 'Error closing client');
      }
    }
    this.clients.clear();
  }
}

export const mcpCache = new MCPClientCache();
