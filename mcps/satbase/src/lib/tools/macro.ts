import { z } from 'zod';
import { callSatbase } from '../api-client.js';
import {
  FredSearchRequestSchema,
  FredSearchResponseSchema,
  FredObservationsRequestSchema,
  FredObservationsResponseSchema,
  FredCategoriesRequestSchema,
  FredCategoriesResponseSchema
} from '../schemas.js';
import logger from '../../logger.js';

export const fredSearchTool = {
  name: 'fred-search',
  config: {
    title: 'Search FRED Economic Series',
    description: 'Search Federal Reserve Economic Data (FRED) economic series by keyword. FRED provides thousands of economic indicators (inflation, employment, GDP, interest rates, etc.). Search by keywords like "inflation", "unemployment", "GDP", "interest rate" to find relevant series. Returns series metadata including ID, title, frequency, units, date ranges, and popularity. Use the series_id from results with fred-observations to get actual data. Default limit 20 results, max 100.',
    inputSchema: FredSearchRequestSchema.shape
  },
  handler: async (input: z.infer<typeof FredSearchRequestSchema>) => {
    logger.info({ tool: 'fred-search', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const params = new URLSearchParams({
        q: input.q,
        limit: input.limit.toString()
      });

      const result = await callSatbase<z.infer<typeof FredSearchResponseSchema>>(
        `/v1/macro/fred/search?${params.toString()}`
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'fred-search', duration, count: result.count }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'fred-search', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const fredObservationsTool = {
  name: 'fred-observations',
  config: {
    title: 'Get FRED Economic Data',
    description: 'Fetch historical economic data observations for a FRED series. Returns time series data (date-value pairs) for the specified series_id. Optionally filter by date range (from/to in YYYY-MM-DD format). Returns all available observations if no date range specified. Values may be "." for missing data. Essential for economic analysis, macro trends, correlation with market movements, or fundamental economic research. Combine with price data to analyze relationships between economic indicators and stock performance.',
    inputSchema: FredObservationsRequestSchema.shape
  },
  handler: async (input: z.infer<typeof FredObservationsRequestSchema>) => {
    logger.info({ tool: 'fred-observations', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const params = new URLSearchParams();
      if (input.from) params.append('from', input.from);
      if (input.to) params.append('to', input.to);

      const queryString = params.toString();
      const url = queryString 
        ? `/v1/macro/series/${input.series_id}?${queryString}`
        : `/v1/macro/series/${input.series_id}`;

      const result = await callSatbase<z.infer<typeof FredObservationsResponseSchema>>(url);

      const duration = performance.now() - start;
      logger.info({ tool: 'fred-observations', duration, count: result.items.length }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'fred-observations', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const fredCategoriesTool = {
  name: 'fred-categories',
  config: {
    title: 'Browse FRED Categories',
    description: 'Browse FRED economic series organized by category. Returns all available economic categories (inflation, employment, GDP, money/credit, prices, production, etc.) or filter to a specific category to see series within it. Useful for discovering relevant economic indicators, understanding FRED organization, or finding series by economic theme. Each category includes series count and metadata. Leave category empty to get all categories.',
    inputSchema: FredCategoriesRequestSchema.shape
  },
  handler: async (input: z.infer<typeof FredCategoriesRequestSchema>) => {
    logger.info({ tool: 'fred-categories', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const params = new URLSearchParams();
      if (input.category) params.append('category', input.category);

      const queryString = params.toString();
      const url = queryString
        ? `/v1/macro/categories?${queryString}`
        : `/v1/macro/categories`;

      const result = await callSatbase<z.infer<typeof FredCategoriesResponseSchema>>(url);

      const duration = performance.now() - start;
      const catCount = result.categories?.length || (result.category ? 1 : 0);
      logger.info({ tool: 'fred-categories', duration, categories: catCount }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'fred-categories', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const fredRefreshCoreTool = {
  name: 'fred-refresh-core',
  config: {
    title: 'Refresh FRED Core Indicators',
    description: 'Trigger background refresh for all 28 core FRED economic indicators (CPI, unemployment, Fed funds rate, GDP, etc.). This fetches latest data from FRED API and updates the database. Returns job_id for tracking. Use this to ensure economic data is current. Core indicators include: CPIAUCSL (CPI), UNRATE (unemployment), FEDFUNDS (Fed funds rate), GDP, DGS10 (10Y treasury), DEXUSEU (EUR/USD), etc. Refresh runs asynchronously.',
    inputSchema: z.object({}).shape
  },
  handler: async () => {
    logger.info({ tool: 'fred-refresh-core' }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<any>(
        '/v1/macro/refresh-core',
        { method: 'POST' },
        30000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'fred-refresh-core', duration, job_id: result.job_id }, 'Tool completed');

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error: any) {
      logger.error({ tool: 'fred-refresh-core', error }, 'Tool failed');
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }
  }
};

export const macroStatusTool = {
  name: 'macro-status',
  config: {
    title: 'Get FRED Series Status',
    description: 'Get status and metadata for a FRED series including observation count, date range (first/last observation), latest value, update timestamp, and data freshness. Useful for checking if a series has recent data, understanding data coverage, or verifying series availability before fetching observations. Returns summary information without the full time series.',
    inputSchema: z.object({
      series_id: z.string().describe('FRED series ID (e.g., "CPIAUCSL", "UNRATE", "GDP").')
    }).shape
  },
  handler: async (input: { series_id: string }) => {
    logger.info({ tool: 'macro-status', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<any>(
        `/v1/macro/status/${input.series_id}`,
        {},
        10000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'macro-status', duration, observations: result.observation_count }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'macro-status', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};
