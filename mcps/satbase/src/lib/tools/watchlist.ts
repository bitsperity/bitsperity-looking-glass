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
    title: 'Get Watchlist Items',
    description: 'Get current watchlist items (stocks, topics, macro indicators).',
    inputSchema: z.object({
      type: z.enum(['stock', 'topic', 'macro']).optional().describe('Filter by type'),
      enabled: z.boolean().optional().describe('Filter by enabled status'),
      active_now: z.boolean().default(false).describe('Only return currently active items')
    }).shape,
  },
  handler: async (input: { type?: string; enabled?: boolean; active_now?: boolean }) => {
    logger.info({ tool: 'get-watchlist', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const params = new URLSearchParams();
      if (input.type) params.append('type', input.type);
      if (input.enabled !== undefined) params.append('enabled', input.enabled.toString());
      if (input.active_now) params.append('active_now', input.active_now.toString());

      const queryString = params.toString();
      const url = queryString ? `/v1/watchlist/items?${queryString}` : '/v1/watchlist/items';

      const result = await callSatbase<z.infer<typeof GetWatchlistResponseSchema>>(
        url,
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
    title: 'Add Items to Watchlist',
    description: 'Add watchlist items (stocks, topics, macro indicators).',
    inputSchema: AddWatchlistRequestSchema.shape,
  },
  handler: async (input: z.infer<typeof AddWatchlistRequestSchema>) => {
    logger.info({ tool: 'add-watchlist', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<z.infer<typeof AddWatchlistResponseSchema>>(
        '/v1/watchlist/items',
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
    title: 'Remove Item from Watchlist',
    description: 'Remove a watchlist item by its ID.',
    inputSchema: RemoveWatchlistRequestSchema.shape,
  },
  handler: async (input: z.infer<typeof RemoveWatchlistRequestSchema>) => {
    logger.info({ tool: 'remove-watchlist', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<z.infer<typeof RemoveWatchlistResponseSchema>>(
        `/v1/watchlist/items/${input.item_id}`,
        { method: 'DELETE' },
        10000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'remove-watchlist', duration, status: result.status }, 'Tool completed');

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
    title: 'Watchlist Active Items',
    description: 'Get all currently active watchlist items (for scheduler/monitoring).',
    inputSchema: z.object({}).shape
  },
  handler: async () => {
    logger.info({ tool: 'watchlist-status' }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<any>('/v1/watchlist/active', {}, 20000);

      const duration = performance.now() - start;
      logger.info({ tool: 'watchlist-status', duration, count: result.count }, 'Tool completed');

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error: any) {
      logger.error({ tool: 'watchlist-status', error }, 'Tool failed');
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }
  }
};

export const updateWatchlistTool = {
  name: 'update-watchlist',
  config: {
    title: 'Update Watchlist Item',
    description: 'Update a watchlist item (partial update - enable/disable, label, expires_at, etc.).',
    inputSchema: z.object({
      item_id: z.number().int().describe('Watchlist item ID to update'),
      enabled: z.boolean().optional().describe('Enable/disable this item'),
      label: z.string().optional().describe('Display label'),
      expires_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Expiration date (YYYY-MM-DD)')
    }).shape
  },
  handler: async (input: { item_id: number; enabled?: boolean; label?: string; expires_at?: string }) => {
    logger.info({ tool: 'update-watchlist', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const body: any = {};
      if (input.enabled !== undefined) body.enabled = input.enabled;
      if (input.label !== undefined) body.label = input.label;
      if (input.expires_at !== undefined) body.expires_at = input.expires_at;

      const result = await callSatbase<any>(
        `/v1/watchlist/items/${input.item_id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(body)
        },
        10000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'update-watchlist', duration, status: result.status }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'update-watchlist', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};
