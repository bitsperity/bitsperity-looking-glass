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
