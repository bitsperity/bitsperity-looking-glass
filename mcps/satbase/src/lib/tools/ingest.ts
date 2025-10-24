import { z } from 'zod';
import { callSatbase } from '../api-client.js';
import {
  EnqueueNewsRequestSchema,
  EnqueueNewsBodyRequestSchema,
  EnqueuePricesRequestSchema,
  EnqueueMacroRequestSchema,
  JobResponseSchema
} from '../schemas.js';
import logger from '../../logger.js';

export const enqueueNewsTool = {
  name: 'enqueue-news',
  config: {
    title: 'Trigger News Ingestion',
    description: 'Trigger background news ingestion for a search query.',
    inputSchema: EnqueueNewsRequestSchema.shape,
  },
  handler: async (input: z.infer<typeof EnqueueNewsRequestSchema>) => {
    logger.info({ tool: 'enqueue-news', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<z.infer<typeof JobResponseSchema>>(
        '/v1/ingest/news',
        {
          method: 'POST',
          body: JSON.stringify(input)
        },
        60000 // 60 seconds timeout for ingestion triggers
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'enqueue-news', duration, job_id: result.job_id }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'enqueue-news', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const enqueueNewsBodiesTool = {
  name: 'enqueue-news-bodies',
  config: {
    title: 'Trigger News Body Fetching',
    description: 'Trigger full HTML/text body fetching for news articles in a date range.',
    inputSchema: EnqueueNewsBodyRequestSchema.shape,
  },
  handler: async (input: z.infer<typeof EnqueueNewsBodyRequestSchema>) => {
    logger.info({ tool: 'enqueue-news-bodies', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<z.infer<typeof JobResponseSchema>>(
        '/v1/ingest/news-bodies',
        {
          method: 'POST',
          body: JSON.stringify(input)
        },
        60000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'enqueue-news-bodies', duration, job_id: result.job_id }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'enqueue-news-bodies', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const enqueuePricesTool = {
  name: 'enqueue-prices',
  config: {
    title: 'Trigger Price Data Ingestion',
    description: 'Trigger price data ingestion for tickers.',
    inputSchema: EnqueuePricesRequestSchema.shape,
  },
  handler: async (input: z.infer<typeof EnqueuePricesRequestSchema>) => {
    logger.info({ tool: 'enqueue-prices', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<z.infer<typeof JobResponseSchema>>(
        '/v1/ingest/prices',
        {
          method: 'POST',
          body: JSON.stringify(input)
        },
        60000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'enqueue-prices', duration, job_id: result.job_id }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'enqueue-prices', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const enqueueMacroTool = {
  name: 'enqueue-macro',
  config: {
    title: 'Trigger FRED Data Ingestion',
    description: 'Trigger FRED economic data ingestion for a series.',
    inputSchema: EnqueueMacroRequestSchema.shape,
  },
  handler: async (input: z.infer<typeof EnqueueMacroRequestSchema>) => {
    logger.info({ tool: 'enqueue-macro', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<z.infer<typeof JobResponseSchema>>(
        '/v1/ingest/macro',
        {
          method: 'POST',
          body: JSON.stringify(input)
        },
        60000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'enqueue-macro', duration, job_id: result.job_id }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'enqueue-macro', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};
