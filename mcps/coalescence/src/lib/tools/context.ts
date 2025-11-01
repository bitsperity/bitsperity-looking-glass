import { z } from 'zod';
import { callCoalesence } from '../api-client.js';
import { logger } from '../../logger.js';

export const getRunContextTool = {
  name: 'get-run-context',
  config: {
    title: 'Get Run Context',
    description: 'Load run context for an agent (pre-run context loading).',
    inputSchema: z.object({
      agent_name: z.string().describe('Agent name'),
      days_back: z.number().default(7).describe('Number of days to look back')
    }).shape,
  },
  handler: async (input: { agent_name: string; days_back?: number }) => {
    logger.info({ tool: 'coalescence_get-run-context', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const params = new URLSearchParams();
      if (input.days_back) params.append('days_back', input.days_back.toString());
      
      const queryString = params.toString();
      const url = queryString 
        ? `/v1/context/${input.agent_name}?${queryString}`
        : `/v1/context/${input.agent_name}`;

      const result = await callCoalesence<any>(url, {}, 10000);

      const duration = performance.now() - start;
      logger.info({ tool: 'coalescence_get-run-context', duration }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'coalescence_get-run-context', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const saveRunContextTool = {
  name: 'save-run-context',
  config: {
    title: 'Save Run Context',
    description: 'Save run context for an agent (post-run knowledge persistence).',
    inputSchema: z.object({
      agent_name: z.string().describe('Agent name'),
      run_id: z.string().describe('Run ID'),
      context_summary: z.string().describe('Context summary'),
      kg_entities: z.array(z.string()).optional().describe('Knowledge graph entity IDs'),
      manifold_thoughts: z.array(z.string()).optional().describe('Manifold thought IDs')
    }).shape,
  },
  handler: async (input: {
    agent_name: string;
    run_id: string;
    context_summary: string;
    kg_entities?: string[];
    manifold_thoughts?: string[];
  }) => {
    logger.info({ tool: 'coalescence_save-run-context', input: { agent_name: input.agent_name, run_id: input.run_id } }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callCoalesence<any>('/v1/context', {
        method: 'POST',
        body: JSON.stringify(input),
      }, 10000);

      const duration = performance.now() - start;
      logger.info({ tool: 'coalescence_save-run-context', duration }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'coalescence_save-run-context', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

