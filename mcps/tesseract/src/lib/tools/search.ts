import { callTesseract } from '../api-client.js';
import { logger } from '../../logger.js';
import {
  searchInputSchema,
  searchOutputSchema,
  type SearchInput,
  type SearchOutput,
} from '../schemas.js';

export const searchTool = {
  name: 'semantic-search',
  config: {
    title: 'Semantic News Search',
    description: 'Search Satbase news corpus semantically using multilingual embeddings (intfloat/multilingual-e5-large)',
    inputSchema: searchInputSchema,
    outputSchema: searchOutputSchema,
  },
  handler: async (input: SearchInput) => {
    logger.info({ tool: 'semantic-search', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callTesseract<SearchOutput>('/v1/tesseract/search', {
        method: 'POST',
        body: JSON.stringify({
          query: input.query,
          filters: {
            tickers: input.tickers,
            from: input.from_date,
            to: input.to_date,
          },
          limit: input.limit,
        }),
      });

      const duration = performance.now() - start;
      logger.info(
        { tool: 'semantic-search', duration, count: result.count },
        'Tool completed'
      );

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    } catch (error) {
      logger.error({ tool: 'semantic-search', error }, 'Tool failed');
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

