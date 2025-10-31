import { z } from 'zod';
import { callCoalesence } from '../api-client.js';
import { logger } from '../../logger.js';

export const saveInsightsTool = {
  name: 'save-insights',
  config: {
    title: 'Save Insights',
    description: 'Save insights for an agent (post-run knowledge persistence).',
    inputSchema: z.object({
      agent_name: z.string().describe('Agent name'),
      insight: z.string().describe('Insight text'),
      priority: z.enum(['high', 'medium', 'low']).default('medium').describe('Priority level'),
      run_id: z.string().optional().describe('Associated run ID'),
      related_entities: z.array(z.string()).optional().describe('Related entity IDs')
    }).shape,
  },
  handler: async (input: {
    agent_name: string;
    insight: string;
    priority?: 'high' | 'medium' | 'low';
    run_id?: string;
    related_entities?: string[];
  }) => {
    logger.info({ tool: 'coalescence_save-insights', agent_name: input.agent_name }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callCoalesence<any>('/v1/insights', {
        method: 'POST',
        body: JSON.stringify(input),
      }, 10000);

      const duration = performance.now() - start;
      logger.info({ tool: 'coalescence_save-insights', duration }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'coalescence_save-insights', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const getInsightsTool = {
  name: 'get-insights',
  config: {
    title: 'Get Insights',
    description: 'Get insights for an agent.',
    inputSchema: z.object({
      agent_name: z.string().describe('Agent name'),
      days_back: z.number().default(7).describe('Number of days to look back')
    }).shape,
  },
  handler: async (input: { agent_name: string; days_back?: number }) => {
    logger.info({ tool: 'coalescence_get-insights', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const params = new URLSearchParams();
      if (input.days_back) params.append('days_back', input.days_back.toString());
      
      const queryString = params.toString();
      const url = queryString 
        ? `/v1/insights/${input.agent_name}?${queryString}`
        : `/v1/insights/${input.agent_name}`;

      const result = await callCoalesence<any>(url, {}, 10000);

      const duration = performance.now() - start;
      logger.info({ tool: 'coalescence_get-insights', duration, count: result.count }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'coalescence_get-insights', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

