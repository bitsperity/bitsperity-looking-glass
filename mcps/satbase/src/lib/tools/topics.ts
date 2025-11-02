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
    description: 'Get current list of configured news search topics from the watchlist (where type=\'topic\'). These are topics that are actively monitored for news. Returns topic names, expiration dates, enabled status, and metadata. Use this to see what topics the system is currently tracking, or before adding new topics to avoid duplicates.',
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
    description: 'Add a news topic to the configured topics watchlist. Topics are search terms used for news discovery (e.g., "AI", "Fed", "semiconductor"). The topic name will be automatically uppercased. Optionally set expiration date (YYYY-MM-DD format, defaults to 1 year from now). After adding, the topic will be included in news searches and monitoring. Returns success status and topic details.',
    inputSchema: z.object({
      symbol: z.string().describe('Topic name/symbol (e.g., "AI", "semiconductor", "earnings"). Will be automatically uppercased.'),
      expires_at: z.string().optional().describe('Expiration date in YYYY-MM-DD format. Defaults to 1 year from now if omitted.')
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
    description: 'Get all topics that appear in news articles (from the database, not just configured topics). Returns topics ranked by mention frequency over the specified date range. Useful for discovering what topics are actually being discussed in the news, finding trending topics, or identifying coverage patterns. Different from get-topics which only returns configured/active topics. Filter by date range to see topics for specific periods. Returns topic names and mention counts.',
    inputSchema: z.object({
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Start date in YYYY-MM-DD format. Filters topics to those appearing in articles from this date onwards.'),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('End date in YYYY-MM-DD format. Filters topics to those appearing in articles up to this date.'),
      limit: z.number().int().min(1).max(1000).default(100).describe('Maximum number of topics to return. Default 100, max 1000. Topics are ranked by mention frequency.')
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
    description: 'Get lightweight topics summary for dashboard/overview. Returns top N topics by mention frequency over the last N days. Includes topic names, mention counts, and trend indicators. More efficient than topics-all for quick overviews. Useful for understanding recent topic activity, identifying trending themes, or generating summary reports. Default returns top 10 topics from last 30 days.',
    inputSchema: z.object({
      limit: z.number().int().min(1).max(100).default(10).describe('Number of top topics to return. Default 10, max 100.'),
      days: z.number().int().min(1).max(365).default(30).describe('Number of days to look back. Default 30, max 365.')
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
    description: 'Get time-series statistics showing article counts per topic over time. Returns counts bucketed by month or year (granularity parameter). Useful for understanding topic coverage trends, identifying seasonal patterns, analyzing topic growth/decline, or generating time-series visualizations. Filter by date range to analyze specific periods. Returns topic names with time buckets and article counts per bucket.',
    inputSchema: z.object({
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Start date in YYYY-MM-DD format. If omitted, uses all available data.'),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('End date in YYYY-MM-DD format. If omitted, uses current date.'),
      granularity: z.enum(['month', 'year']).default('month').describe('Time bucket granularity: "month" for monthly buckets (default), "year" for yearly buckets.')
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
    description: 'Get heatmap-compatible topic coverage data for visualization. Returns article counts for specified topics over time, bucketed by month or year. Format "flat" returns array of period-topic-count objects suitable for charts. Format "matrix" returns 2D matrix (rows=periods, columns=topics) suitable for heatmaps. Useful for comparing topic coverage, identifying coverage gaps, or generating visualizations. Specify comma-separated topics (e.g., "AI,semiconductor,Fed").',
    inputSchema: z.object({
      topics: z.string().describe('Comma-separated topic names (e.g., "AI,semiconductor,Fed"). Topics will be matched case-insensitively.'),
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Start date in YYYY-MM-DD format. If omitted, uses default lookback period.'),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('End date in YYYY-MM-DD format. If omitted, uses current date.'),
      granularity: z.enum(['month', 'year']).default('month').describe('Time bucket granularity: "month" (default) or "year".'),
      format: z.enum(['flat', 'matrix']).default('flat').describe('Response format: "flat" returns array of {period, topic, count} objects (good for charts). "matrix" returns 2D array (good for heatmaps).')
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
    description: 'Remove a topic from the configured topics watchlist. This removes the topic from active monitoring and search configuration. WARNING: This does NOT delete any articles - it only removes the topic from the watchlist configuration. Articles mentioning this topic remain in the database. Use this to stop tracking a topic that is no longer relevant. Returns success status.',
    inputSchema: z.object({
      topic_name: z.string().describe('Topic name to delete from watchlist (e.g., "AI", "semiconductor"). Must match existing configured topic.')
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

