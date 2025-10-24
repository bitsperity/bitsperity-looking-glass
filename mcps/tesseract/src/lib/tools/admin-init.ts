import { callTesseract } from '../api-client.js';
import { logger } from '../../logger.js';
import {
  initCollectionOutputSchema,
  type InitCollectionOutput,
} from '../schemas.js';
import { z } from 'zod';

export const initCollectionTool = {
  name: 'init-collection',
  config: {
    title: 'Initialize Collection',
    description: 'Create a new versioned Qdrant collection and set up alias for zero-downtime updates',
    inputSchema: {},
    outputSchema: initCollectionOutputSchema.shape,
  },
  handler: async () => {
    logger.info({ tool: 'init-collection' }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callTesseract<InitCollectionOutput>('/v1/admin/init-collection', {
        method: 'POST',
      });

      const duration = performance.now() - start;
      logger.info({ tool: 'init-collection', duration, collection: result.collection }, 'Tool completed');

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    } catch (error) {
      logger.error({ tool: 'init-collection', error }, 'Tool failed');
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
};

