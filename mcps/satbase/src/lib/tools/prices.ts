import { z } from 'zod';
import { callSatbase } from '../api-client.js';
import { ListPricesRequestSchema, ListPricesResponseSchema } from '../schemas.js';
import logger from '../../logger.js';

export const listPricesTool = {
  name: 'list-prices',
  config: {
    title: 'Get Historical Price Data',
    description: 'Fetch historical OHLCV price data for a ticker.',
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
    description: 'Get detailed company information for a ticker (sector, industry, description, etc.).',
    inputSchema: z.object({
      ticker: z.string().describe('Ticker symbol')
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
    description: 'Get key financial metrics for a ticker (PE ratio, market cap, revenue, etc.).',
    inputSchema: z.object({
      ticker: z.string().describe('Ticker symbol')
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
