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
        ticker: input.ticker,
        from: input.from,
        to: input.to
      });

      const result = await callSatbase<z.infer<typeof ListPricesResponseSchema>>(
        `/v1/prices?${params.toString()}`
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'list-prices', duration, count: result.count }, 'Tool completed');

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
