import { z } from 'zod';
import { callCoalesence } from '../api-client.js';
import { logger } from '../../logger.js';

export const listAllToolsTool = {
  name: 'list-all-tools',
  config: {
    title: 'List All Tools',
    description: 'List all available tools from all MCPs (Manifold, Satbase, Tesseract, Coalescence, etc.) registered with the orchestrator. Returns tool names, descriptions, input schemas, and MCP source for each tool. Optionally filter by mcp_name to see tools from a specific MCP only. Useful for discovering available tools, understanding tool capabilities, or verifying tool availability. Tools are prefixed with MCP name (e.g., "satbase_list-news", "manifold_mf-create-thought").',
    inputSchema: z.object({
      mcp_name: z.string().optional().describe('Optional filter by MCP name (e.g., "satbase", "tesseract", "manifold", "coalescence"). If omitted, returns tools from all MCPs.')
    }).shape,
  },
  handler: async (input: { mcp_name?: string }) => {
    logger.info({ tool: 'coalescence_list-all-tools', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const params = new URLSearchParams();
      if (input.mcp_name) params.append('mcp_name', input.mcp_name);
      
      const queryString = params.toString();
      const url = queryString 
        ? `/v1/tools?${queryString}`
        : '/v1/tools';

      const result = await callCoalesence<any>(url, {}, 10000);

      const duration = performance.now() - start;
      logger.info({ tool: 'coalescence_list-all-tools', duration }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'coalescence_list-all-tools', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

