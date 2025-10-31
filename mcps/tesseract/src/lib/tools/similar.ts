import { callTesseract } from '../api-client.js';
import { logger } from '../../logger.js';
import {
  similarInputSchema,
  similarOutputSchema,
  type SimilarInput,
  type SimilarOutput,
} from '../schemas.js';

export const similarTool = {
  name: 'find-similar-articles',
  config: {
    title: 'Find Similar Articles',
    description: 'Find similar news articles to a given article using vector similarity',
    inputSchema: similarInputSchema.shape,
    outputSchema: similarOutputSchema.shape,
  },
  handler: async (input: SimilarInput) => {
    logger.info({ tool: 'find-similar-articles', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callTesseract<SimilarOutput>(
        `/v1/tesseract/similar/${input.news_id}?limit=${input.limit}`,
        {
          method: 'GET',
        }
      );

      const duration = performance.now() - start;
      logger.info(
        {
          tool: 'find-similar-articles',
          duration,
          count: result.similar_articles.length,
        },
        'Tool completed'
      );

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as any,
      };
    } catch (error) {
      logger.error({ tool: 'find-similar-articles', error }, 'Tool failed');
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

