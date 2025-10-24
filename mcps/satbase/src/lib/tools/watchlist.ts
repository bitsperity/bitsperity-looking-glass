import { z } from 'zod';
import { callSatbase } from '../api-client.js';
import {
  GetWatchlistResponseSchema,
  AddWatchlistRequestSchema,
  AddWatchlistResponseSchema,
  RemoveWatchlistRequestSchema,
  RemoveWatchlistResponseSchema
} from '../schemas.js';
import logger from '../../logger.js';

export const getWatchlistTool = {
  name: 'get-watchlist',
  config: {
    title: 'Get Watchlist',
    description: 'Get current watchlist of ticker symbols.',
    inputSchema: z.object({}).shape,
  },
  handler: async () => {
    logger.info({ tool: 'get-watchlist' }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<z.infer<typeof GetWatchlistResponseSchema>>(
        '/v1/watchlist',
        {},
        10000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'get-watchlist', duration, count: result.count }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'get-watchlist', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const addWatchlistTool = {
  name: 'add-watchlist',
  config: {
    title: 'Add to Watchlist',
    description: 'Add ticker symbols to watchlist, optionally trigger price ingestion.',
    inputSchema: AddWatchlistRequestSchema.shape,
  },
  handler: async (input: z.infer<typeof AddWatchlistRequestSchema>) => {
    logger.info({ tool: 'add-watchlist', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<z.infer<typeof AddWatchlistResponseSchema>>(
        '/v1/watchlist',
        {
          method: 'POST',
          body: JSON.stringify(input)
        },
        30000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'add-watchlist', duration, count: result.count }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'add-watchlist', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const removeWatchlistTool = {
  name: 'remove-watchlist',
  config: {
    title: 'Remove from Watchlist',
    description: 'Remove a ticker symbol from watchlist.',
    inputSchema: RemoveWatchlistRequestSchema.shape,
  },
  handler: async (input: z.infer<typeof RemoveWatchlistRequestSchema>) => {
    logger.info({ tool: 'remove-watchlist', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<z.infer<typeof RemoveWatchlistResponseSchema>>(
        `/v1/watchlist/${input.symbol}`,
        { method: 'DELETE' },
        10000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'remove-watchlist', duration, removed: result.removed }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'remove-watchlist', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const refreshWatchlistTool = {
  name: 'watchlist-refresh',
  config: {
    title: 'Refresh Watchlist (Prices + News)',
    description: 'Bulk refresh all watchlist tickers (trigger price and news ingestion).',
    inputSchema: z.object({
      prices: z.boolean().default(true),
      news: z.boolean().default(true),
      news_hours: z.number().int().min(1).max(720).default(24)
    }).shape
  },
  handler: async (input: { prices?: boolean; news?: boolean; news_hours?: number }) => {
    logger.info({ tool: 'watchlist-refresh', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const body = JSON.stringify({
        prices: input.prices ?? true,
        news: input.news ?? true,
        news_hours: input.news_hours ?? 24
      });

      const result = await callSatbase<any>(
        '/v1/watchlist/refresh',
        { method: 'POST', body },
        60000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'watchlist-refresh', duration, tickers: result.tickers?.length ?? 0 }, 'Tool completed');

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error: any) {
      logger.error({ tool: 'watchlist-refresh', error }, 'Tool failed');
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }
  }
};

export const watchlistStatusTool = {
  name: 'watchlist-status',
  config: {
    title: 'Watchlist Status',
    description: 'Get watchlist with freshness metrics (latest price date, news count 24h).',
    inputSchema: z.object({}).shape
  },
  handler: async () => {
    logger.info({ tool: 'watchlist-status' }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<any>('/v1/watchlist/status', {}, 20000);

      const duration = performance.now() - start;
      logger.info({ tool: 'watchlist-status', duration, count: result.count }, 'Tool completed');

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error: any) {
      logger.error({ tool: 'watchlist-status', error }, 'Tool failed');
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }
  }
};
