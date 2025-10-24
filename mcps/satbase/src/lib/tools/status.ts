import { z } from 'zod';
import { callSatbase } from '../api-client.js';
import { CoverageResponseSchema } from '../schemas.js';
import logger from '../../logger.js';

export const getCoverageTool = {
  name: 'get-coverage',
  config: {
    title: 'Get Data Coverage',
    description: 'Get complete data coverage overview. Returns inventory of all available data: news, prices, macro indicators. Agents use this to understand what data they have access to.',
    inputSchema: z.object({}).shape // No input parameters
  },
  handler: async () => {
    logger.info({ tool: 'get-coverage' }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<z.infer<typeof CoverageResponseSchema>>(
        `/v1/status/coverage`
      );

      const duration = performance.now() - start;
      logger.info({ 
        tool: 'get-coverage', 
        duration, 
        news: result.news.total_articles,
        prices: result.prices.ticker_count,
        macro: result.macro.series_count
      }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'get-coverage', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

