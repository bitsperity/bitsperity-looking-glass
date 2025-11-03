import { z } from 'zod';
import { callSatbase } from '../api-client.js';
import {
  ListNewsRequestSchema,
  ListNewsResponseSchema,
  DeleteNewsResponseSchema,
  NewsHeatmapRequestSchema,
  NewsHeatmapResponseSchema,
  TrendingTickersRequestSchema,
  TrendingTickersResponseSchema,
  ListNewsOverviewRequestSchema,
  ListNewsOverviewResponseSchema,
  BulkNewsBodiesRequestSchema,
  BulkNewsBodiesResponseSchema
} from '../schemas.js';
import logger from '../../logger.js';

export const listNewsTool = {
  name: 'list-news',
  config: {
    title: 'List News Articles',
    description: 'Fetch news articles from the database with comprehensive filtering options. Supports filtering by date range (required), tickers, semantic query (q), categories (business, technology, etc.), sources (Reuters, CNN, etc.), countries (ISO codes), and languages (ISO codes). Supports exclusion filters using negative syntax (e.g., "business,-sports" excludes sports). Use include_body=true to get full article content (token-expensive) or include_body=false to get metadata only (token-efficient). Use has_body=true to filter to only articles with fetched content. Content format can be text, html, or both. Sort by published_desc (newest first, default) or published_asc (oldest first). Returns paginated results with total count. Best for daily news discovery, topic-based queries, or ticker-specific news fetching.',
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
        has_body: input.has_body.toString(),
        sort: input.sort || 'published_desc'
      });

      if (input.q) params.append('q', input.q);
      if (input.tickers) params.append('tickers', input.tickers);
      if (input.content_format) params.append('content_format', input.content_format);
      if (input.categories) params.append('categories', input.categories);
      if (input.sources) params.append('sources', input.sources);
      if (input.countries) params.append('countries', input.countries);
      if (input.languages) params.append('languages', input.languages);

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

export const listNewsOverviewTool = {
  name: 'list-news-overview',
  config: {
    title: 'List News Overview (Token-Efficient Discovery)',
    description: 'Lightweight news discovery tool. Returns only metadata (id, title, source, published_at, tickers, topics, url, description) WITHOUT body content. Use this for discovery phase to identify relevant articles efficiently. Then use bulk-news-bodies for full content. Token-efficient alternative to list-news for initial article discovery.',
    inputSchema: ListNewsOverviewRequestSchema.shape
  },
  handler: async (input: z.infer<typeof ListNewsOverviewRequestSchema>) => {
    logger.info({ tool: 'list-news-overview', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const params = new URLSearchParams({
        from: input.from,
        to: input.to,
        limit: input.limit.toString(),
        offset: input.offset.toString(),
        sort: input.sort || 'published_desc'
      });

      if (input.q) params.append('q', input.q);
      if (input.tickers) params.append('tickers', input.tickers);
      if (input.categories) params.append('categories', input.categories);
      if (input.sources) params.append('sources', input.sources);
      if (input.countries) params.append('countries', input.countries);
      if (input.languages) params.append('languages', input.languages);

      const result = await callSatbase<z.infer<typeof ListNewsOverviewResponseSchema>>(
        `/v1/news/overview?${params.toString()}`
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'list-news-overview', duration, count: result.total }, 'Tool completed');
      
      // Compact JSON (no pretty-print for token efficiency)
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'list-news-overview', error }, 'Tool failed');
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
    description: 'Generate heatmap data showing article counts by topic and time period. Returns article counts for each topic per time bucket (month or year based on granularity). Format "flat" returns array of period-topic-count objects suitable for charts. Format "matrix" returns 2D matrix (rows=periods, columns=topics) suitable for heatmap visualizations. Useful for understanding topic coverage patterns over time, identifying coverage gaps, comparing topic activity, or generating visualizations. Specify comma-separated topics (e.g., "AI,Fed,Earnings").',
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
    description: 'Get trending stock tickers based on recent news mentions. Analyzes news articles from the past N hours and ranks tickers by mention frequency. Returns tickers sorted by mention count with article counts, total mentions, and sample headlines for each ticker. Useful for discovering which stocks are currently in the news, identifying market movers, finding hot topics, or focusing analysis on high-activity tickers. Use hours=24 for daily trends, hours=168 for weekly trends. Set min_mentions to filter out noise (e.g., min_mentions=5). Best for news discovery and identifying what the market is talking about right now.',
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
    description: 'Simple trend analysis showing article counts over time with trend direction (increasing/decreasing/stable) and moving averages. Analyzes article volume patterns over the specified days. Optionally filter by comma-separated topics to analyze specific themes. Returns trend direction, article counts per day/week, moving averages, and summary statistics. Useful for understanding news volume trends, identifying activity spikes or declines, or assessing coverage changes over time.',
    inputSchema: z.object({
      days: z.number().int().min(1).max(365).default(30).describe('Number of days to analyze. Default 30, max 365.'),
      topics: z.string().optional().describe('Comma-separated topic names to filter analysis (e.g., "AI,Fed"). If omitted, analyzes all topics.')
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
    description: 'Get a single news article by its unique article ID. Returns full article metadata including title, text, source, URL, published_at timestamp, tickers, topics, regions, and optionally body content if available. Use this when you have a specific article ID and need complete details. More efficient than list-news when you know the exact ID. Returns 404 if article not found.',
    inputSchema: z.object({
      article_id: z.string().describe('Unique article ID (UUID/hash) to retrieve. Get IDs from list-news or other news queries.')
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
    description: 'Fetch multiple news articles by their IDs in a single API call. Much more efficient than calling get-news-by-id multiple times (one call vs N calls). Accepts array of article IDs and returns all matching articles. Use include_body=true to get full article content (token-expensive) or include_body=false to get metadata only (token-efficient). Essential for efficient processing when you have multiple article IDs from list-news, trending-tickers, or similar-articles. ALWAYS prefer this over multiple get-news-by-id calls.',
    inputSchema: z.object({
      ids: z.array(z.string()).describe('Array of article IDs to fetch. Can fetch many articles in one call.'),
      include_body: z.boolean().default(false).describe('If true: includes full article body content (token-expensive). If false (default): returns only metadata (title, source, URL, tickers, topics, etc.) without body.')
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

export const bulkNewsBodiesTool = {
  name: 'bulk-news-bodies',
  config: {
    title: 'Bulk Fetch News Bodies (Token-Efficient Body Fetch)',
    description: 'Fetch article bodies for specific article IDs. Returns only id, body_text, published_at, and title. Use this after list-news-overview to get full content for selected articles. Much more token-efficient than list-news with include_body=true. ALWAYS includes bodies (no include_body parameter).',
    inputSchema: BulkNewsBodiesRequestSchema.shape
  },
  handler: async (input: z.infer<typeof BulkNewsBodiesRequestSchema>) => {
    logger.info({ tool: 'bulk-news-bodies', input: { ids_count: input.ids.length } }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<z.infer<typeof BulkNewsBodiesResponseSchema>>(
        '/v1/news/bulk-bodies',
        {
          method: 'POST',
          body: JSON.stringify({
            ids: input.ids
          })
        },
        30000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'bulk-news-bodies', duration, found: result.found, missing: result.missing }, 'Tool completed');

      // Compact JSON (no pretty-print for token efficiency)
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'bulk-news-bodies', error }, 'Tool failed');
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
