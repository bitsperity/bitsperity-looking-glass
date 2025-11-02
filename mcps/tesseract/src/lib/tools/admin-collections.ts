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
    description: 'List all Qdrant collections with metadata including points count (number of embedded articles), vector dimensions, active alias status, and collection names. Collections are versioned storage for news article embeddings. The active alias points to the current collection used for searches. Useful for understanding vector database structure, checking collection sizes, or identifying active vs archived collections.',
    inputSchema: {},
    outputSchema: collectionsListOutputSchema.shape,
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
    description: 'Switch the active collection alias to a different Qdrant collection for zero-downtime updates. This changes which collection is used for semantic searches without interrupting service. After creating a new collection with fresh embeddings (via batch-embedding), use this to activate it. The old collection remains but is no longer used for searches. Useful for rolling out new embedding versions or switching between test/production collections.',
    inputSchema: collectionSwitchInputSchema.shape,
    outputSchema: collectionSwitchOutputSchema.shape,
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
    description: 'Delete a Qdrant collection permanently. Includes safety checks - cannot delete the active collection (the one currently used for searches). Use this to clean up old/archived collections after switching to new ones. Returns deletion confirmation. WARNING: This permanently removes the collection and all embedded articles in it. Ensure collection is not active before deleting.',
    inputSchema: collectionDeleteInputSchema.shape,
    outputSchema: collectionDeleteOutputSchema.shape,
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

