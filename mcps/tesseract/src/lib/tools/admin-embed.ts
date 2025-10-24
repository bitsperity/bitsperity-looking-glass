import { callTesseract } from '../api-client.js';
import { logger } from '../../logger.js';
import {
  embedBatchInputSchema,
  embedBatchOutputSchema,
  embedStatusOutputSchema,
  type EmbedBatchInput,
  type EmbedBatchOutput,
  type EmbedStatusOutput,
} from '../schemas.js';
import { z } from 'zod';

export const startBatchEmbeddingTool = {
  name: 'start-batch-embedding',
  config: {
    title: 'Start Batch Embedding',
    description: 'Start background batch embedding of news articles from Satbase into Qdrant (can take several minutes)',
    inputSchema: embedBatchInputSchema.shape,
    outputSchema: embedBatchOutputSchema.shape,
  },
  handler: async (input: EmbedBatchInput) => {
    logger.info({ tool: 'start-batch-embedding', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callTesseract<EmbedBatchOutput>(
        `/v1/admin/embed-batch?from_date=${input.from_date}&to_date=${input.to_date}`,
        {
          method: 'POST',
          timeout: 300000, // 5 minutes timeout for batch operations
        }
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'start-batch-embedding', duration }, 'Tool completed');

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    } catch (error) {
      logger.error({ tool: 'start-batch-embedding', error }, 'Tool failed');
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

export const getEmbeddingStatusTool = {
  name: 'get-embedding-status',
  config: {
    title: 'Get Embedding Status',
    description: 'Get current batch embedding status, progress, and collection metadata',
    inputSchema: {},
    outputSchema: embedStatusOutputSchema.shape,
  },
  handler: async () => {
    logger.info({ tool: 'get-embedding-status' }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callTesseract<EmbedStatusOutput>('/v1/admin/embed-status', {
        method: 'GET',
      });

      const duration = performance.now() - start;
      logger.info(
        {
          tool: 'get-embedding-status',
          duration,
          status: result.status,
          percent: result.percent,
        },
        'Tool completed'
      );

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    } catch (error) {
      logger.error({ tool: 'get-embedding-status', error }, 'Tool failed');
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

