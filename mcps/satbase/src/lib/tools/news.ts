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
