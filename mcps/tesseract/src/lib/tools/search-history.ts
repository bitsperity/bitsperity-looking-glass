import { callTesseract } from '../api-client.js';
import { logger } from '../../logger.js';
import {
  searchHistoryInputSchema,
  searchHistoryOutputSchema,
  searchStatsInputSchema,
  searchStatsOutputSchema,
  type SearchHistoryInput,
  type SearchHistoryOutput,
  type SearchStatsInput,
  type SearchStatsOutput,
} from '../schemas.js';

export const getSearchHistoryTool = {
  name: 'get-search-history',
  config: {
    title: 'Get Search History',
    description: 'Get history of semantic searches performed in Tesseract. Returns past search queries with timestamps, result counts, and metadata. Useful for understanding search patterns, avoiding duplicate searches, learning what queries were already tried, or analyzing search behavior. Filter by query text (query_filter) to find similar past searches, or by days to see recent search activity. Helps agents avoid redundant semantic searches.',
    inputSchema: searchHistoryInputSchema.shape,
    outputSchema: searchHistoryOutputSchema.shape,
  },
  handler: async (input: SearchHistoryInput) => {
    logger.info({ tool: 'get-search-history', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const params = new URLSearchParams();
      if (input.limit) params.append('limit', input.limit.toString());
      if (input.query_filter) params.append('query_filter', input.query_filter);
      if (input.days) params.append('days', input.days.toString());

      const result = await callTesseract<SearchHistoryOutput>(
        `/v1/admin/search-history?${params.toString()}`,
        {
          method: 'GET',
        }
      );

      const duration = performance.now() - start;
      logger.info(
        {
          tool: 'get-search-history',
          duration,
          count: result.count,
        },
        'Tool completed'
      );

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as any,
      };
    } catch (error) {
      logger.error({ tool: 'get-search-history', error }, 'Tool failed');
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

export const getSearchStatsTool = {
  name: 'get-search-stats',
  config: {
    title: 'Get Search Statistics',
    description: 'Get aggregated statistics about semantic search patterns in Tesseract. Returns total searches, unique query count, average result count per search, most frequent queries, and search frequency over time. Helps understand search behavior, identify frequently searched topics, analyze search efficiency, or generate search usage reports. Filter by days to analyze specific time periods. Useful for optimizing search strategies or understanding what topics are most searched.',
    inputSchema: searchStatsInputSchema.shape,
    outputSchema: searchStatsOutputSchema.shape,
  },
  handler: async (input: SearchStatsInput) => {
    logger.info({ tool: 'get-search-stats', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const params = new URLSearchParams();
      if (input.days) params.append('days', input.days.toString());

      const result = await callTesseract<SearchStatsOutput>(
        `/v1/admin/search-stats?${params.toString()}`,
        {
          method: 'GET',
        }
      );

      const duration = performance.now() - start;
      logger.info(
        {
          tool: 'get-search-stats',
          duration,
          total_searches: result.total_searches,
        },
        'Tool completed'
      );

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as any,
      };
    } catch (error) {
      logger.error({ tool: 'get-search-stats', error }, 'Tool failed');
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

