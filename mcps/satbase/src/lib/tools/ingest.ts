import { z } from 'zod';
import { callSatbase } from '../api-client.js';
import {
  EnqueueNewsRequestSchema,
  EnqueueNewsBodyRequestSchema,
  EnqueuePricesRequestSchema,
  EnqueueMacroRequestSchema,
  JobResponseSchema
} from '../schemas.js';
import logger from '../../logger.js';

export const enqueueNewsTool = {
  name: 'enqueue-news',
  config: {
    title: 'Trigger News Ingestion',
    description: 'Trigger background news ingestion from Mediastack API for a search query. Queues a job to fetch news articles matching the query from the last N hours (default 24 hours, max 720 hours / 30 days). Returns job_id for tracking progress. Job runs asynchronously - use list-jobs or get-job to check status. Use this to fetch latest news for specific topics, tickers, or keywords. News is stored in Satbase and available via list-news.',
    inputSchema: EnqueueNewsRequestSchema.shape,
  },
  handler: async (input: z.infer<typeof EnqueueNewsRequestSchema>) => {
    logger.info({ tool: 'enqueue-news', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<z.infer<typeof JobResponseSchema>>(
        '/v1/ingest/news',
        {
          method: 'POST',
          body: JSON.stringify(input)
        },
        60000 // 60 seconds timeout for ingestion triggers
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'enqueue-news', duration, job_id: result.job_id }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'enqueue-news', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const enqueueNewsBodiesTool = {
  name: 'enqueue-news-bodies',
  config: {
    title: 'Refetch News Bodies',
    description: 'Re-fetch article body content for news articles that currently have no body. Useful after resetting bodies or when improving extraction logic. Scans articles missing body content, attempts to fetch and extract full article text from source URLs, and updates articles. Use dry_run=true to preview how many articles would be affected without actually fetching. Max 1000 articles per run. Returns count of articles processed.',
    inputSchema: z.object({
      max_items: z.number().int().min(1).max(1000).default(100).describe('Maximum articles to process. Default 100, max 1000. Processes articles in order until limit reached.'),
      dry_run: z.boolean().default(false).describe('If true: preview affected articles without actually fetching bodies. If false (default): actually fetch and update article bodies.')
    }).shape,
  },
  handler: async (input: { max_items?: number; dry_run?: boolean }) => {
    logger.info({ tool: 'enqueue-news-bodies', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const params = new URLSearchParams({
        max_items: (input.max_items || 100).toString(),
        dry_run: (input.dry_run || false).toString()
      });

      const result = await callSatbase<any>(
        `/v1/admin/news/refetch-bodies?${params.toString()}`,
        { method: 'POST' },
        120000 // 2 minutes for body fetching
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'enqueue-news-bodies', duration, success: result.success }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'enqueue-news-bodies', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const enqueuePricesTool = {
  name: 'enqueue-prices',
  config: {
    title: 'Trigger Price Data Ingestion',
    description: 'Trigger background price data ingestion for one or more stock tickers from Alpaca Markets API. Fetches historical price bars (OHLCV data) for the specified tickers and stores in Satbase. Returns job status. Price data is used for analysis, correlation with news, or technical indicators. Tickers should be valid stock symbols (e.g., "AAPL", "MSFT"). Job runs asynchronously.',
    inputSchema: EnqueuePricesRequestSchema.shape,
  },
  handler: async (input: z.infer<typeof EnqueuePricesRequestSchema>) => {
    logger.info({ tool: 'enqueue-prices', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<any>(
        '/v1/prices/ingest',
        {
          method: 'POST',
          body: JSON.stringify(input)
        },
        60000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'enqueue-prices', duration, status: result.status }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'enqueue-prices', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const enqueueMacroTool = {
  name: 'enqueue-macro',
  config: {
    title: 'Trigger FRED Data Ingestion',
    description: 'Trigger background FRED (Federal Reserve Economic Data) ingestion for one or more economic series. Always fetches ALL historical data available for each series (from earliest available date to latest). Returns job status. Use fred-search to find relevant series IDs (e.g., "CPIAUCSL" for CPI, "UNRATE" for unemployment). Macro data is essential for economic analysis and correlation with markets. Job runs asynchronously.',
    inputSchema: z.object({
      series: z.array(z.string()).describe('List of FRED series IDs to ingest (e.g., ["CPIAUCSL", "UNRATE", "GDP"]). All historical data will be fetched for each series.')
    }).shape,
  },
  handler: async (input: { series: string[] }) => {
    logger.info({ tool: 'enqueue-macro', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<any>(
        '/v1/macro/ingest',
        {
          method: 'POST',
          body: JSON.stringify(input)
        },
        60000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'enqueue-macro', duration, status: result.status }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'enqueue-macro', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const newsBackfillTool = {
  name: 'news-backfill',
  config: {
    title: 'Backfill Historical News',
    description: 'Backfill historical news data for a date range from Mediastack API. Fetches articles matching the search query for each day in the specified range. Maximum 365 days per job (split larger ranges into multiple jobs). Optionally tag articles with a topic name for organization. Controls article volume per day with max_articles_per_day (default 100, max 1000). Returns job_id for tracking. Use this to fill coverage gaps, build historical datasets, or recover missing periods. Job runs asynchronously - monitor with backfill-monitor.',
    inputSchema: z.object({
      query: z.string().describe('Search query for news (e.g., "AI", "Federal Reserve", "earnings").'),
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Start date in YYYY-MM-DD format. Must be within Mediastack\'s historical coverage (typically last 5 years).'),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('End date in YYYY-MM-DD format. Must be after from date, and range cannot exceed 365 days.'),
      topic: z.string().optional().describe('Optional topic name to tag fetched articles (e.g., "AI", "Fed"). Useful for organizing backfilled data.'),
      max_articles_per_day: z.number().int().min(1).max(1000).default(100).describe('Maximum articles to fetch per day. Default 100, max 1000. Prevents excessive API usage and storage.')
    }).shape
  },
  handler: async (input: { query: string; from: string; to: string; topic?: string; max_articles_per_day?: number }) => {
    logger.info({ tool: 'news-backfill', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const body: any = {
        query: input.query,
        from: input.from,
        to: input.to,
        max_articles_per_day: input.max_articles_per_day || 100
      };
      if (input.topic) body.topic = input.topic;

      const result = await callSatbase<any>(
        '/v1/ingest/news/backfill',
        {
          method: 'POST',
          body: JSON.stringify(body)
        },
        60000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'news-backfill', duration, job_id: result.job_id }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'news-backfill', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};
