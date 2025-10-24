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
    description: 'Search Federal Reserve Economic Data (FRED) series by keyword.',
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
    description: 'Fetch FRED economic data observations for a given series.',
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
        ? `/v1/macro/fred/series/${input.series_id}?${queryString}`
        : `/v1/macro/fred/series/${input.series_id}`;

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
    description: 'Browse FRED series organized by economic category (inflation, employment, GDP, etc). Returns all categories or filter by one.',
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
        ? `/v1/macro/fred/categories?${queryString}`
        : `/v1/macro/fred/categories`;

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
