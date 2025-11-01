import { z } from 'zod';
import { callSatbase } from '../api-client.js';
import {
  GetTopicsResponseSchema,
  AddTopicsRequestSchema,
  AddTopicsResponseSchema
} from '../schemas.js';
import logger from '../../logger.js';

export const getTopicsTool = {
  name: 'get-topics',
  config: {
    title: 'Get Configured News Topics',
    description: 'Get current list of configured news search topics from watchlist (type=\'topic\').',
    inputSchema: z.object({}).shape
  },
  handler: async () => {
    logger.info({ tool: 'get-topics' }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<z.infer<typeof GetTopicsResponseSchema>>(
        '/v1/news/topics/configured',
        {},
        10000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'get-topics', duration, count: result.total || 0 }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'get-topics', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const addTopicsTool = {
  name: 'add-topics',
  config: {
    title: 'Add News Topic',
    description: 'Add a news topic to the configured topics list.',
    inputSchema: z.object({
      symbol: z.string().describe('Topic name/symbol (will be uppercased)'),
      expires_at: z.string().optional().describe('Expiration date (YYYY-MM-DD, defaults to 1 year)')
    }).shape
  },
  handler: async (input: { symbol: string; expires_at?: string }) => {
    logger.info({ tool: 'add-topics', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<any>(
        '/v1/news/topics/add',
        {
          method: 'POST',
          body: JSON.stringify(input)
        },
        30000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'add-topics', duration, success: result.success }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'add-topics', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const topicsAllTool = {
  name: 'topics-all',
  config: {
    title: 'Get All Topics from Database',
    description: 'Get all topics mentioned in articles (from database, not just configured).',
    inputSchema: z.object({
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Start date (YYYY-MM-DD)'),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('End date (YYYY-MM-DD)'),
      limit: z.number().int().min(1).max(1000).default(100).describe('Maximum number of topics')
    }).shape
  },
  handler: async (input: { from?: string; to?: string; limit?: number }) => {
    logger.info({ tool: 'topics-all', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const params = new URLSearchParams({
        limit: (input.limit || 100).toString()
      });
      if (input.from) params.append('from', input.from);
      if (input.to) params.append('to', input.to);

      const result = await callSatbase<any>(
        `/v1/news/topics/all?${params.toString()}`,
        {},
        20000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'topics-all', duration, total: result.total_unique_topics }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'topics-all', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const topicsSummaryTool = {
  name: 'topics-summary',
  config: {
    title: 'Get Topics Summary',
    description: 'Get lightweight topics summary for dashboard/overview.',
    inputSchema: z.object({
      limit: z.number().int().min(1).max(100).default(10).describe('Number of topics'),
      days: z.number().int().min(1).max(365).default(30).describe('Days to look back')
    }).shape
  },
  handler: async (input: { limit?: number; days?: number }) => {
    logger.info({ tool: 'topics-summary', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const params = new URLSearchParams({
        limit: (input.limit || 10).toString(),
        days: (input.days || 30).toString()
      });

      const result = await callSatbase<any>(
        `/v1/news/topics/summary?${params.toString()}`,
        {},
        15000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'topics-summary', duration, total: result.total_unique_topics }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'topics-summary', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const topicsStatsTool = {
  name: 'topics-stats',
  config: {
    title: 'Get Topics Statistics',
    description: 'Get time-series counts of articles per topic.',
    inputSchema: z.object({
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Start date (YYYY-MM-DD)'),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('End date (YYYY-MM-DD)'),
      granularity: z.enum(['month', 'year']).default('month').describe('Time period granularity')
    }).shape
  },
  handler: async (input: { from?: string; to?: string; granularity?: string }) => {
    logger.info({ tool: 'topics-stats', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const params = new URLSearchParams({
        granularity: input.granularity || 'month'
      });
      if (input.from) params.append('from', input.from);
      if (input.to) params.append('to', input.to);

      const result = await callSatbase<any>(
        `/v1/news/topics/stats?${params.toString()}`,
        {},
        30000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'topics-stats', duration, topics: result.topics?.length || 0 }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'topics-stats', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const topicsCoverageTool = {
  name: 'topics-coverage',
  config: {
    title: 'Get Topics Coverage',
    description: 'Get heatmap-compatible topic coverage data.',
    inputSchema: z.object({
      topics: z.string().describe('Comma-separated topic names (e.g., "AI,semiconductor")'),
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Start date (YYYY-MM-DD)'),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('End date (YYYY-MM-DD)'),
      granularity: z.enum(['month', 'year']).default('month').describe('Time period granularity'),
      format: z.enum(['flat', 'matrix']).default('flat').describe('Response format')
    }).shape
  },
  handler: async (input: { topics: string; from?: string; to?: string; granularity?: string; format?: string }) => {
    logger.info({ tool: 'topics-coverage', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const params = new URLSearchParams({
        topics: input.topics,
        granularity: input.granularity || 'month',
        format: input.format || 'flat'
      });
      if (input.from) params.append('from', input.from);
      if (input.to) params.append('to', input.to);

      const result = await callSatbase<any>(
        `/v1/news/topics/coverage?${params.toString()}`,
        {},
        30000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'topics-coverage', duration, topics: result.topics?.length || 0 }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'topics-coverage', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const deleteTopicTool = {
  name: 'delete-topic',
  config: {
    title: 'Delete Topic',
    description: 'Remove a topic from the configured topics list. WARNING: This does not delete articles, only removes the topic from configuration.',
    inputSchema: z.object({
      topic_name: z.string().describe('Topic name to delete')
    }).shape
  },
  handler: async (input: { topic_name: string }) => {
    logger.info({ tool: 'delete-topic', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<any>(
        `/v1/news/topics/${input.topic_name}`,
        { method: 'DELETE' },
        10000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'delete-topic', duration, success: result.success }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'delete-topic', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

