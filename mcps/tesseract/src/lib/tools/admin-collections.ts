import { callTesseract } from '../api-client.js';
import { logger } from '../../logger.js';
import {
  collectionsListOutputSchema,
  collectionSwitchInputSchema,
  collectionSwitchOutputSchema,
  collectionDeleteInputSchema,
  collectionDeleteOutputSchema,
  type CollectionsListOutput,
  type CollectionSwitchInput,
  type CollectionSwitchOutput,
  type CollectionDeleteInput,
  type CollectionDeleteOutput,
} from '../schemas.js';
import { z } from 'zod';

export const listCollectionsTool = {
  name: 'list-collections',
  config: {
    title: 'List Collections',
    description: 'List all Qdrant collections with metadata (points count, vector size, active alias)',
    inputSchema: z.object({}),
    outputSchema: collectionsListOutputSchema,
  },
  handler: async () => {
    logger.info({ tool: 'list-collections' }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callTesseract<CollectionsListOutput>('/v1/admin/collections', {
        method: 'GET',
      });

      const duration = performance.now() - start;
      logger.info(
        {
          tool: 'list-collections',
          duration,
          count: result.collections.length,
        },
        'Tool completed'
      );

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    } catch (error) {
      logger.error({ tool: 'list-collections', error }, 'Tool failed');
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

export const switchCollectionTool = {
  name: 'switch-collection',
  config: {
    title: 'Switch Collection',
    description: 'Switch the active collection alias to a different collection (zero-downtime)',
    inputSchema: collectionSwitchInputSchema,
    outputSchema: collectionSwitchOutputSchema,
  },
  handler: async (input: CollectionSwitchInput) => {
    logger.info({ tool: 'switch-collection', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callTesseract<CollectionSwitchOutput>(
        `/v1/admin/collections/switch?name=${encodeURIComponent(input.name)}`,
        {
          method: 'POST',
        }
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'switch-collection', duration, target: result.target }, 'Tool completed');

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    } catch (error) {
      logger.error({ tool: 'switch-collection', error }, 'Tool failed');
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

export const deleteCollectionTool = {
  name: 'delete-collection',
  config: {
    title: 'Delete Collection',
    description: 'Delete a Qdrant collection (with safety checks - cannot delete active collection)',
    inputSchema: collectionDeleteInputSchema,
    outputSchema: collectionDeleteOutputSchema,
  },
  handler: async (input: CollectionDeleteInput) => {
    logger.info({ tool: 'delete-collection', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callTesseract<CollectionDeleteOutput>(
        `/v1/admin/collections/${encodeURIComponent(input.collection_name)}`,
        {
          method: 'DELETE',
        }
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'delete-collection', duration, collection: result.collection }, 'Tool completed');

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    } catch (error) {
      logger.error({ tool: 'delete-collection', error }, 'Tool failed');
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

