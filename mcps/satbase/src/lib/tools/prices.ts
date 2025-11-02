import { z } from 'zod';
import { callSatbase } from '../api-client.js';
import { ListPricesRequestSchema, ListPricesResponseSchema, ListPricesBulkRequestSchema, ListPricesBulkResponseSchema } from '../schemas.js';
import logger from '../../logger.js';

export const listPricesTool = {
  name: 'list-prices',
  config: {
    title: 'Get Historical Price Data',
    description: 'Fetch historical OHLCV (Open, High, Low, Close, Volume) price data for a single ticker over a date range. Returns daily price bars with timestamps. Dates must be in YYYY-MM-DD format. Use this for single-ticker analysis. For multiple tickers, use list-prices-bulk instead (much more efficient). Price data is sourced from Alpaca/Yahoo Finance and stored in parquet format. Returns array of bars with date, open, high, low, close, volume fields. Useful for price analysis, calculating returns, identifying trends, or correlating price movements with news events.',
    inputSchema: ListPricesRequestSchema.shape,
  },
  handler: async (input: z.infer<typeof ListPricesRequestSchema>) => {
    logger.info({ tool: 'list-prices', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const params = new URLSearchParams({
        from: input.from,
        to: input.to
      });

      const result = await callSatbase<z.infer<typeof ListPricesResponseSchema>>(
        `/v1/prices/${input.ticker}?${params.toString()}`
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'list-prices', duration, count: result.bars?.length || 0 }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'list-prices', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const searchPricesTool = {
  name: 'prices-search',
  config: {
    title: 'Search Tickers',
    description: 'Search for stocks by ticker or company name using Yahoo Finance.',
    inputSchema: z.object({
      q: z.string().describe('Search query (ticker symbol or company name)'),
      limit: z.number().int().min(1).max(100).default(10).describe('Maximum number of results')
    }).shape
  },
  handler: async (input: { q: string; limit?: number }) => {
    logger.info({ tool: 'prices-search', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const params = new URLSearchParams({
        q: input.q,
        limit: (input.limit || 10).toString()
      });

      const result = await callSatbase<any>(
        `/v1/prices/search?${params.toString()}`,
        {},
        15000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'prices-search', duration, count: result.count }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'prices-search', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const pricesInfoTool = {
  name: 'prices-info',
  config: {
    title: 'Get Ticker Information',
    description: 'Get detailed company information for a ticker including sector classification, industry, company description, business summary, and other metadata. Useful for understanding what a company does, its business model, and industry context. Returns sector, industry, description, website, employees, etc. Use this to add context before analyzing news about a company or to understand sector classifications. Complements price and fundamental data.',
    inputSchema: z.object({
      ticker: z.string().describe('Stock ticker symbol (e.g., "AAPL", "NVDA"). Must be a valid ticker.')
    }).shape
  },
  handler: async (input: { ticker: string }) => {
    logger.info({ tool: 'prices-info', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<any>(
        `/v1/prices/info/${input.ticker}`,
        {},
        15000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'prices-info', duration }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'prices-info', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const pricesFundamentalsTool = {
  name: 'prices-fundamentals',
  config: {
    title: 'Get Ticker Fundamentals',
    description: 'Get key financial metrics and fundamental data for a ticker including valuation ratios (PE, P/B, P/S), market capitalization, revenue, earnings, margins, growth rates, and balance sheet metrics. Essential for comprehensive stock analysis - combine with price data and company info for full picture. Returns metrics like PE ratio, market cap, revenue, net income, profit margins, ROE, debt-to-equity, etc. Use this to assess valuation (is stock over/undervalued?), financial health, profitability, and growth trends. Critical for fundamental analysis and determining if price movements are justified by fundamentals.',
    inputSchema: z.object({
      ticker: z.string().describe('Stock ticker symbol (e.g., "AAPL", "MSFT"). Must be a valid ticker.')
    }).shape
  },
  handler: async (input: { ticker: string }) => {
    logger.info({ tool: 'prices-fundamentals', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<any>(
        `/v1/prices/fundamentals/${input.ticker}`,
        {},
        15000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'prices-fundamentals', duration }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'prices-fundamentals', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const pricesStatusTool = {
  name: 'prices-status',
  config: {
    title: 'Get Price Data Status',
    description: 'Get price data status for a ticker (latest date, bar count, missing days, etc.).',
    inputSchema: z.object({
      ticker: z.string().describe('Ticker symbol')
    }).shape
  },
  handler: async (input: { ticker: string }) => {
    logger.info({ tool: 'prices-status', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<any>(
        `/v1/prices/status/${input.ticker}`,
        {},
        10000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'prices-status', duration, latest_date: result.latest_date }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'prices-status', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const listPricesBulkTool = {
  name: 'list-prices-bulk',
  config: {
    title: 'Get Historical Price Data (Bulk)',
    description: 'Fetch historical OHLCV price data for MULTIPLE tickers in a single API call. Much more efficient than calling list-prices multiple times (one call vs N calls). Accepts array of ticker symbols and returns price data for all tickers over the same date range. Dates must be in YYYY-MM-DD format. Returns a dictionary/map with ticker as key and array of price bars as value. Use this when analyzing multiple stocks (e.g., all tickers mentioned in news articles, sector-wide analysis, portfolio analysis). Critical for efficiency when processing many tickers. ALWAYS prefer this over multiple list-prices calls.',
    inputSchema: ListPricesBulkRequestSchema.shape,
  },
  handler: async (input: z.infer<typeof ListPricesBulkRequestSchema>) => {
    logger.info({ tool: 'list-prices-bulk', tickerCount: input.tickers.length }, 'Tool invoked');
    const start = performance.now();

    try {
      const body = {
        tickers: input.tickers,
        from_: input.from,
        to: input.to,
        sync_timeout_s: input.sync_timeout_s || 10
      };

      const result = await callSatbase<z.infer<typeof ListPricesBulkResponseSchema>>(
        `/v1/prices/bulk`,
        { 
          method: 'POST',
          body: JSON.stringify(body),
          headers: { 'Content-Type': 'application/json' }
        },
        60000 // 60s timeout for bulk requests
      );

      const duration = performance.now() - start;
      const successCount = Object.values(result.results || {}).filter((r: any) => !r.error).length;
      logger.info({ tool: 'list-prices-bulk', duration, tickerCount: input.tickers.length, successCount }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'list-prices-bulk', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};
