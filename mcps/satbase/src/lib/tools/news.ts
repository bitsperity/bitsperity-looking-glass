import { z } from 'zod';
import { callSatbase } from '../api-client.js';
import {
  ListNewsRequestSchema,
  ListNewsResponseSchema,
  DeleteNewsResponseSchema,
  NewsHeatmapRequestSchema,
  NewsHeatmapResponseSchema,
  TrendingTickersRequestSchema,
  TrendingTickersResponseSchema
} from '../schemas.js';
import logger from '../../logger.js';

export const listNewsTool = {
  name: 'list-news',
  config: {
    title: 'List News Articles',
    description: 'Fetch news articles with filters (date range, tickers, query). Supports token-efficient content retrieval via content_format parameter.',
    inputSchema: ListNewsRequestSchema.shape
  },
  handler: async (input: z.infer<typeof ListNewsRequestSchema>) => {
    logger.info({ tool: 'list-news', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const params = new URLSearchParams({
        from: input.from,
        to: input.to,
        limit: input.limit.toString(),
        offset: input.offset.toString(),
        include_body: input.include_body.toString(),
        has_body: input.has_body.toString()
      });

      if (input.q) params.append('q', input.q);
      if (input.tickers) params.append('tickers', input.tickers);
      if (input.content_format) params.append('content_format', input.content_format);

      const result = await callSatbase<z.infer<typeof ListNewsResponseSchema>>(
        `/v1/news?${params.toString()}`
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'list-news', duration, count: result.total }, 'Tool completed');
      
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'list-news', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const deleteNewsTool = {
  name: 'delete-news',
  config: {
    title: 'Delete News Article',
    description: 'Delete a news article by ID (removes from parquet files). Use with caution.',
    inputSchema: z.object({
      news_id: z.string().describe('ID of the news article to delete')
    }).shape,
    outputSchema: DeleteNewsResponseSchema.shape
  },
  handler: async (input: { news_id: string }) => {
    logger.info({ tool: 'delete-news', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<z.infer<typeof DeleteNewsResponseSchema>>(
        `/v1/news/${input.news_id}`,
        { method: 'DELETE' }
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'delete-news', duration, success: result.success }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        structuredContent: result
      };
    } catch (error: any) {
      logger.error({ tool: 'delete-news', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const newsHeatmapTool = {
  name: 'news-heatmap',
  config: {
    title: 'News Heatmap',
    description: 'Generate heatmap of article counts by topic and time period. Visualize "Which topics had how many articles per year/month?"',
    inputSchema: NewsHeatmapRequestSchema.shape
  },
  handler: async (input: z.infer<typeof NewsHeatmapRequestSchema>) => {
    logger.info({ tool: 'news-heatmap', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const params = new URLSearchParams({
        topics: input.topics,
        granularity: input.granularity,
        format: input.format
      });

      if (input.from) params.append('from', input.from);
      if (input.to) params.append('to', input.to);

      const result = await callSatbase<z.infer<typeof NewsHeatmapResponseSchema>>(
        `/v1/news/heatmap?${params.toString()}`
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'news-heatmap', duration, topics: result.topics.length, periods: result.periods.length }, 'Tool completed');
      
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'news-heatmap', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const trendingTickersTool = {
  name: 'news-trending-tickers',
  config: {
    title: 'Trending Tickers',
    description: 'Get trending tickers from recent news. Returns tickers ranked by mention count with sample headlines.',
    inputSchema: TrendingTickersRequestSchema.shape
  },
  handler: async (input: z.infer<typeof TrendingTickersRequestSchema>) => {
    logger.info({ tool: 'news-trending-tickers', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const params = new URLSearchParams({
        hours: input.hours.toString(),
        limit: input.limit.toString(),
        min_mentions: input.min_mentions.toString()
      });

      const result = await callSatbase<z.infer<typeof TrendingTickersResponseSchema>>(
        `/v1/news/trending/tickers?${params.toString()}`
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'news-trending-tickers', duration, tickers: result.total_tickers }, 'Tool completed');
      
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'news-trending-tickers', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const newsAnalyticsTool = {
  name: 'news-analytics',
  config: {
    title: 'News Analytics & Trends',
    description: 'Simple trend analysis: article counts over time with trend direction and moving averages.',
    inputSchema: z.object({
      days: z.number().int().min(1).max(365).default(30).describe('Number of days to analyze'),
      topics: z.string().optional().describe('Comma-separated topic names to filter')
    }).shape
  },
  handler: async (input: { days?: number; topics?: string }) => {
    logger.info({ tool: 'news-analytics', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const params = new URLSearchParams({
        days: (input.days || 30).toString()
      });
      if (input.topics) params.append('topics', input.topics);

      const result = await callSatbase<any>(
        `/v1/news/analytics?${params.toString()}`,
        {},
        30000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'news-analytics', duration, trend: result.trend }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'news-analytics', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const getNewsByIdTool = {
  name: 'get-news-by-id',
  config: {
    title: 'Get News Article by ID',
    description: 'Get a single news article by its ID.',
    inputSchema: z.object({
      article_id: z.string().describe('Article ID to retrieve')
    }).shape
  },
  handler: async (input: { article_id: string }) => {
    logger.info({ tool: 'get-news-by-id', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<any>(
        `/v1/news/${input.article_id}`,
        {},
        10000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'get-news-by-id', duration }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'get-news-by-id', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const bulkNewsTool = {
  name: 'bulk-news',
  config: {
    title: 'Bulk Fetch News Articles',
    description: 'Fetch multiple news articles by their IDs in one request (token-efficient).',
    inputSchema: z.object({
      ids: z.array(z.string()).describe('Array of article IDs to fetch'),
      include_body: z.boolean().default(false).describe('Include full article content')
    }).shape
  },
  handler: async (input: { ids: string[]; include_body?: boolean }) => {
    logger.info({ tool: 'bulk-news', input: { ...input, ids_count: input.ids.length } }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<any>(
        '/v1/news/bulk',
        {
          method: 'POST',
          body: JSON.stringify({
            ids: input.ids,
            include_body: input.include_body || false
          })
        },
        30000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'bulk-news', duration, found: result.found, missing: result.missing }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'bulk-news', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const newsHealthTool = {
  name: 'news-health',
  config: {
    title: 'News Pipeline Health Check',
    description: 'Health check for news ingestion pipeline. Returns status, last ingestion, articles today, crawl success rate, staleness.',
    inputSchema: z.object({}).shape
  },
  handler: async () => {
    logger.info({ tool: 'news-health' }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<any>(
        '/v1/news/health',
        {},
        10000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'news-health', duration, status: result.status }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'news-health', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const integrityCheckTool = {
  name: 'news-integrity-check',
  config: {
    title: 'News Data Integrity Check',
    description: 'Verify data integrity of SQLite database.',
    inputSchema: z.object({}).shape
  },
  handler: async () => {
    logger.info({ tool: 'news-integrity-check' }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<any>(
        '/v1/news/integrity-check',
        {},
        20000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'news-integrity-check', duration, status: result.status }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'news-integrity-check', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};
