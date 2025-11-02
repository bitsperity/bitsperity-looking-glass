import { z } from 'zod';
import { callCoalesence } from '../api-client.js';
import { logger } from '../../logger.js';

export const saveInsightsTool = {
  name: 'save-insights',
  config: {
    title: 'Save Insights',
    description: 'Save an insight discovered during agent execution for future reference. Insights are key findings, observations, or learnings that should be preserved beyond the current run. Use priority to indicate importance (high = critical, medium = notable, low = interesting). Optionally link to knowledge graph entities or associate with a specific run_id. Insights are retrievable via get-insights for future agent runs. Use this to capture important discoveries, patterns, or conclusions.',
    inputSchema: z.object({
      agent_name: z.string().describe('Agent name that discovered this insight. Must match agent configuration name.'),
      insight: z.string().describe('Insight text describing the key finding, observation, or learning. Be specific and actionable.'),
      priority: z.enum(['high', 'medium', 'low']).default('medium').describe('Priority level: high = critical/urgent, medium = notable/important (default), low = interesting/nice-to-know.'),
      run_id: z.string().optional().describe('Associated run ID if this insight came from a specific agent execution.'),
      related_entities: z.array(z.string()).optional().describe('Array of Ariadne knowledge graph entity IDs related to this insight.')
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
    description: 'Get saved insights for an agent from previous runs. Returns insights discovered by the agent within the specified time window (days_back). Insights are key findings and learnings preserved for future reference. Useful for understanding what the agent has learned, identifying patterns, or accessing previous discoveries. Filter by priority or timeframe to focus on most relevant insights. Returns array of insights with text, priority, timestamps, and related entities.',
    inputSchema: z.object({
      agent_name: z.string().describe('Agent name to get insights for. Must match agent configuration name.'),
      days_back: z.number().default(7).describe('Number of days to look back for insights. Default 7 days, can be increased for longer history.')
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

