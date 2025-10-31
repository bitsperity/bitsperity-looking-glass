import { callTesseract } from '../api-client.js';
import { logger } from '../../logger.js';
import {
  articleSimilarityInputSchema,
  articleSimilarityOutputSchema,
  type ArticleSimilarityInput,
  type ArticleSimilarityOutput,
} from '../schemas.js';

export const articleSimilarityTool = {
  name: 'get-article-similarity',
  config: {
    title: 'Get Article Content Similarity',
    description: 'Calculate cosine similarity between title/summary/body vectors of an article. Useful for content quality assessment, detecting clickbait, and validating extraction quality. High similarity (>0.8) indicates consistent, well-structured content. Low similarity (<0.5) may indicate clickbait, poor extraction, or misleading titles.',
    inputSchema: articleSimilarityInputSchema.shape,
    outputSchema: articleSimilarityOutputSchema.shape,
  },
  handler: async (input: ArticleSimilarityInput) => {
    logger.info({ tool: 'get-article-similarity', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callTesseract<ArticleSimilarityOutput>(
        `/v1/admin/similarity/${input.news_id}`,
        {
          method: 'GET',
        }
      );

      const duration = performance.now() - start;
      logger.info(
        {
          tool: 'get-article-similarity',
          duration,
          news_id: result.news_id,
          title_body_sim: result.similarity.title_body,
          summary_body_sim: result.similarity.summary_body,
        },
        'Tool completed'
      );

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as any,
      };
    } catch (error) {
      logger.error({ tool: 'get-article-similarity', error }, 'Tool failed');
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

