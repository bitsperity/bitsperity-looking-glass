import { z } from 'zod';
import { logger } from '../../logger.js';
import { config } from '../../config.js';

const SearchNewsRequestSchema = z.object({
  keywords: z.string().optional().describe('Search keywords (can exclude with - prefix, e.g., "AI -corona")'),
  categories: z.string().optional().describe('News categories: general, business, entertainment, health, science, sports, technology (can exclude with - prefix, e.g., "business,-sports")'),
  sources: z.string().optional().describe('News sources (can exclude with - prefix, e.g., "reuters,-bbc")'),
  countries: z.string().optional().describe('Country codes (ISO 2-letter, can exclude with - prefix, e.g., "us,gb,-de")'),
  languages: z.string().optional().describe('Language codes (ISO 2-letter, can exclude with - prefix, e.g., "en,-de")'),
  date: z.string().optional().describe('Date or date range (YYYY-MM-DD or YYYY-MM-DD,YYYY-MM-DD for range). Default: last 7 days'),
  sort: z.enum(['published_desc', 'published_asc', 'popularity']).default('published_desc').describe('Sort order: published_desc (newest first, default), published_asc (oldest first), popularity (most popular)'),
  limit: z.number().int().min(1).max(50).default(10).describe('Maximum number of results (1-50, default 10 for token efficiency)')
});

export const searchNewsTool = {
  name: 'explore-search-news',
  config: {
    title: 'Search News (Mediastack)',
    description: 'Search live news articles using Mediastack API. Returns metadata only (title, description, url, category, source, published_at) - token-efficient for discovery. Use for finding news about new/unlisted companies, trending topics, or sector-specific news before onboarding to Satbase. Supports filtering by categories (business, technology, etc.), sources (Reuters, Bloomberg, etc.), countries, languages, and keywords. Sort by popularity for trending topics or published_desc for latest news. Note: This provides live API data (ephemeral) - use Satbase list-news for persistent watchlist-based news.',
    inputSchema: SearchNewsRequestSchema.shape,
  },
  handler: async (input: z.infer<typeof SearchNewsRequestSchema>) => {
    logger.info({ tool: 'explore-search-news', input }, 'Tool invoked');
    const start = performance.now();

    try {
      if (!config.MEDIASTACK_API_KEY) {
        throw new Error('MEDIASTACK_API_KEY not configured. Set environment variable MEDIASTACK_API_KEY.');
      }

      // Build API URL
      const baseUrl = 'https://api.mediastack.com/v1/news';
      const params = new URLSearchParams({
        access_key: config.MEDIASTACK_API_KEY,
        limit: input.limit.toString(),
        sort: input.sort || 'published_desc',
      });

      // Add optional parameters
      if (input.keywords) {
        params.append('keywords', input.keywords);
      }
      if (input.categories) {
        params.append('categories', input.categories);
      }
      if (input.sources) {
        params.append('sources', input.sources);
      }
      if (input.countries) {
        params.append('countries', input.countries);
      }
      if (input.languages) {
        params.append('languages', input.languages);
      }
      if (input.date) {
        params.append('date', input.date);
      } else {
        // Default: last 7 days (Mediastack format: YYYY-MM-DD,YYYY-MM-DD)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        const dateRange = `${startDate.toISOString().split('T')[0]},${endDate.toISOString().split('T')[0]}`;
        params.append('date', dateRange);
      }

      const apiUrl = `${baseUrl}?${params.toString()}`;
      logger.debug({ apiUrl: apiUrl.replace(config.MEDIASTACK_API_KEY, '***') }, 'Calling Mediastack API');

      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Exploration-MCP/1.0)',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Mediastack API error: ${response.status} - ${errorText.substring(0, 200)}`);
      }

      const data = await response.json();

      // Check for API errors
      if (data.error) {
        throw new Error(`Mediastack API error: ${data.error.code} - ${data.error.message}`);
      }

      const articles = data.data || [];
      const pagination = data.pagination || {};

      // Token-efficient: Only return essential metadata
      const results = articles.map((article: any) => ({
        title: article.title || '',
        description: (article.description || '').substring(0, 300), // Truncate for token efficiency
        url: article.url || '',
        source: article.source || '',
        category: article.category || '',
        language: article.language || '',
        country: article.country || '',
        published_at: article.published_at || '',
        author: article.author || null,
        image: article.image || null,
      }));

      const duration = performance.now() - start;
      logger.info({ 
        tool: 'explore-search-news', 
        duration, 
        count: results.length,
        total: pagination.total 
      }, 'Tool completed');

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            query: {
              keywords: input.keywords || null,
              categories: input.categories || null,
              sources: input.sources || null,
              countries: input.countries || null,
              languages: input.languages || null,
              date: input.date || 'last 7 days',
              sort: input.sort,
            },
            pagination: {
              limit: pagination.limit || input.limit,
              offset: pagination.offset || 0,
              count: pagination.count || results.length,
              total: pagination.total || results.length,
            },
            results,
          }, null, 2)
        }],
      };
    } catch (error: any) {
      logger.error({ tool: 'explore-search-news', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

