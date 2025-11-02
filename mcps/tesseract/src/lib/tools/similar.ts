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
    description: 'Find the most similar news articles to a SPECIFIC article by its news_id. Uses vector similarity to compare the given article\'s embeddings against all other articles in the corpus. Returns ranked list of similar articles with similarity scores (0-1). Much more precise than semantic-search when you have a specific article and want to find related ones - semantic-search is for general queries, this is for article-to-article similarity. Use this to find follow-up articles, related coverage, or clusters of similar news. Returns article metadata including title, source, published_at, tickers, topics, and similarity scores. Essential for understanding article relationships and news clustering.',
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

