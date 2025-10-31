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
    description: 'Trigger background news ingestion for a search query.',
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
    description: 'Re-fetch bodies for articles that have no body. Useful after reset-bodies to re-crawl with improved extraction.',
    inputSchema: z.object({
      max_items: z.number().int().min(1).max(1000).default(100).describe('Max articles to process (default 100)'),
      dry_run: z.boolean().default(false).describe('Preview without fetching')
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
    description: 'Trigger price data ingestion for tickers.',
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
    description: 'Trigger FRED economic data ingestion for series (always fetches all historical data).',
    inputSchema: z.object({
      series: z.array(z.string()).describe('List of FRED series IDs to ingest')
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
    description: 'Backfill historical news data for a date range (max 365 days per job).',
    inputSchema: z.object({
      query: z.string().describe('Search query for news'),
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Start date (YYYY-MM-DD)'),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('End date (YYYY-MM-DD)'),
      topic: z.string().optional().describe('Optional topic name'),
      max_articles_per_day: z.number().int().min(1).max(1000).default(100).describe('Maximum articles per day')
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
