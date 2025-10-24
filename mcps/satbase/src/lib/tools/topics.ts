import { z } from 'zod';
import { callSatbase } from '../api-client.js';
import {
  GetTopicsResponseSchema,
  AddTopicsRequestSchema,
  AddTopicsResponseSchema
} from '../schemas.js';
import logger from '../../logger.js';

export const getTopicsTool = {
  name: 'get-topics',
  config: {
    title: 'Get News Topics',
    description: 'Get current list of news search topics.',
    inputSchema: z.object({}).shape
  },
  handler: async () => {
    logger.info({ tool: 'get-topics' }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<z.infer<typeof GetTopicsResponseSchema>>(
        '/v1/news/topics',
        {},
        10000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'get-topics', duration, count: result.count }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'get-topics', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const addTopicsTool = {
  name: 'add-topics',
  config: {
    title: 'Add News Topics',
    description: 'Add news search topics to monitor, optionally trigger news ingestion.',
    inputSchema: AddTopicsRequestSchema.shape
  },
  handler: async (input: z.infer<typeof AddTopicsRequestSchema>) => {
    logger.info({ tool: 'add-topics', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<z.infer<typeof AddTopicsResponseSchema>>(
        '/v1/news/topics',
        {
          method: 'POST',
          body: JSON.stringify(input)
        },
        30000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'add-topics', duration, count: result.count }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'add-topics', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

