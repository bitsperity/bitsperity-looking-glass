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
    description: 'Get current watchlist items including stocks (tickers), topics, and macro indicators (FRED series). The watchlist defines what the system actively monitors for news and price data. Filter by type (stock/topic/macro), enabled status, or active_now (currently active = not expired and enabled). Returns item IDs, symbols, types, enabled status, expiration dates, labels, and metadata. Essential for understanding what assets/topics are being tracked.',
    inputSchema: z.object({
      type: z.enum(['stock', 'topic', 'macro']).optional().describe('Filter by item type: "stock" for tickers, "topic" for news topics, "macro" for FRED series.'),
      enabled: z.boolean().optional().describe('Filter by enabled status. true = active, false = disabled.'),
      active_now: z.boolean().default(false).describe('If true: only return items that are currently active (enabled=true AND not expired). If false (default): return all matching items regardless of expiration.')
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
    description: 'Add items to the watchlist (stocks/tickers, topics, or macro indicators/FRED series). After adding, these items will be actively monitored for news and price data (depending on type). Supports bulk adding multiple items. Each item requires type, symbol, and optional label/expires_at. Stocks: use ticker symbols (e.g., "AAPL"). Topics: use topic names (e.g., "AI"). Macro: use FRED series IDs (e.g., "CPIAUCSL"). Returns count of items added and details.',
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
    description: 'Remove a watchlist item by its item_id. This stops monitoring the item (stock/topic/macro) but does NOT delete any historical data. After removal, the item will no longer be included in active monitoring or automatic data collection. Returns status confirmation. Use update-watchlist with enabled=false if you want to temporarily disable without removing.',
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
    description: 'Bulk refresh all active watchlist tickers by triggering price and news ingestion. This fetches latest price data and news articles for all enabled, non-expired tickers in the watchlist. Runs asynchronously - returns job status and ticker count. Use prices=true to refresh price data, news=true to refresh news (specify news_hours lookback window). Essential for keeping watchlist data current. This is typically run automatically by scheduler, but can be triggered manually.',
    inputSchema: z.object({
      prices: z.boolean().default(true).describe('If true: refresh price data for all active watchlist tickers.'),
      news: z.boolean().default(true).describe('If true: refresh news articles for all active watchlist tickers.'),
      news_hours: z.number().int().min(1).max(720).default(24).describe('Hours to look back for news refresh. Default 24 hours, max 720 (30 days).')
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
    description: 'Get all currently active watchlist items (enabled=true AND not expired) organized by type. Returns stocks, topics, and macro indicators separately with counts. Used by scheduler and monitoring systems to determine what should be actively tracked. More efficient than get-watchlist with active_now=true as it returns pre-organized data by type. Returns summary with counts and item lists per type.',
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
    description: 'Partially update a watchlist item by item_id. Supports updating enabled status (enable/disable), display label, and expiration date. All fields are optional - only provided fields will be updated. Use enabled=false to temporarily disable monitoring without removing the item. Use expires_at to extend or shorten the monitoring period. Returns updated item details.',
    inputSchema: z.object({
      item_id: z.number().int().describe('Watchlist item ID to update. Get IDs from get-watchlist.'),
      enabled: z.boolean().optional().describe('Enable (true) or disable (false) this item. Disabled items are not monitored but remain in watchlist.'),
      label: z.string().optional().describe('Display label for the item (human-readable name).'),
      expires_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('New expiration date in YYYY-MM-DD format. Item will be inactive after this date.')
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
