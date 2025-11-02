import { z } from 'zod';
import { config } from '../../config.js';
import { logger } from '../../logger.js';

const SearchWebRequestSchema = z.object({
  query: z.string().describe('Search query'),
  num: z.number().int().min(1).max(20).default(10).describe('Maximum number of results (1-20, default 10)'),
  tbs: z.enum(['qdr:h', 'qdr:d', 'qdr:w', 'qdr:m', 'qdr:y']).optional().describe('Time-based search: h=hour, d=day, w=week, m=month, y=year'),
});

const FetchUrlRequestSchema = z.object({
  url: z.string().url().describe('URL to fetch and extract content from'),
  max_chars: z.number().int().min(100).max(5000).default(2000).describe('Maximum characters to extract (100-5000, default 2000)'),
});

export const searchWebTool = {
  name: 'explore-search-web',
  config: {
    title: 'Search Web (Jina Proxy)',
    description: 'Search the web using Jina AI. Returns URLs, titles, snippets. Token-efficient: returns only metadata (no full content). Use for discovery and research before deeper analysis. Requires JINA_API_KEY environment variable.',
    inputSchema: SearchWebRequestSchema.shape,
  },
  handler: async (input: z.infer<typeof SearchWebRequestSchema>) => {
    logger.info({ tool: 'explore-search-web', input }, 'Tool invoked');
    const start = performance.now();

    if (!config.JINA_API_KEY) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: 'JINA_API_KEY not configured' }, null, 2) }],
        isError: true
      };
    }

    try {
      // Call Jina Search API - using their HTTP API directly
      // Jina MCP Server exposes tools via SSE, but we call the underlying HTTP API
      const params = new URLSearchParams({
        query: input.query,
        num: String(input.num),
      });
      if (input.tbs) {
        params.append('tbs', input.tbs);
      }

      // Jina HTTP API endpoint (not SSE endpoint)
      const apiUrl = config.JINA_API_URL.replace('/sse', ''); // Remove /sse suffix if present
      const response = await fetch(`${apiUrl}/search_web?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.JINA_API_KEY}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Jina API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Extract and normalize results - Jina returns different formats, handle both
      let results: any[] = [];
      if (Array.isArray(data)) {
        results = data;
      } else if (data.results && Array.isArray(data.results)) {
        results = data.results;
      } else if (data.content && Array.isArray(data.content)) {
        // MCP tool response format
        const contentItem = data.content.find((c: any) => c.type === 'text');
        if (contentItem) {
          try {
            const parsed = JSON.parse(contentItem.text);
            results = parsed.results || (Array.isArray(parsed) ? parsed : [parsed]);
          } catch {
            // If parsing fails, try direct access
            results = data.results || [];
          }
        }
      } else if (data.results) {
        results = Array.isArray(data.results) ? data.results : [];
      }
      
      const normalized = results.map((r: any) => ({
        url: r.url || r.link || r.href,
        title: r.title || r.name || r.headline || '',
        snippet: (r.snippet || r.description || r.text || r.summary || '').substring(0, 300), // Truncate for token efficiency
        score: r.score || r.relevance || r.rank,
      })).filter((r: any) => r.url); // Filter out results without URLs

      const duration = performance.now() - start;
      logger.info({ tool: 'explore-search-web', duration, count: normalized.length }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify({ query: input.query, results: normalized }, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'explore-search-web', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const fetchUrlTool = {
  name: 'explore-fetch-url',
  config: {
    title: 'Fetch URL Content (Jina Proxy)',
    description: 'Fetch and extract readable content from a URL using Jina AI. Returns clean markdown text. Token-efficient: truncates to max_chars (default 2000). Use for quick content extraction after web search. Requires JINA_API_KEY environment variable.',
    inputSchema: FetchUrlRequestSchema.shape,
  },
  handler: async (input: z.infer<typeof FetchUrlRequestSchema>) => {
    logger.info({ tool: 'explore-fetch-url', input }, 'Tool invoked');
    const start = performance.now();

    if (!config.JINA_API_KEY) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: 'JINA_API_KEY not configured' }, null, 2) }],
        isError: true
      };
    }

    try {
      // Call Jina Read URL API - using their HTTP API directly
      const apiUrl = config.JINA_API_URL.replace('/sse', ''); // Remove /sse suffix if present
      const response = await fetch(`${apiUrl}/read_url`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.JINA_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          url: input.url,
        }),
      });

      if (!response.ok) {
        throw new Error(`Jina API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Extract content - handle different response formats
      let content = '';
      if (typeof data === 'string') {
        content = data;
      } else if (data.content) {
        if (typeof data.content === 'string') {
          content = data.content;
        } else if (Array.isArray(data.content)) {
          // MCP tool response format
          const contentItem = data.content.find((c: any) => c.type === 'text');
          if (contentItem) {
            const parsed = JSON.parse(contentItem.text);
            content = parsed.content || parsed.text || parsed;
          }
        }
      } else if (data.text) {
        content = data.text;
      }
      
      const truncated = content.substring(0, input.max_chars);
      const truncatedMsg = content.length > input.max_chars ? ' (truncated)' : '';

      const duration = performance.now() - start;
      logger.info({ tool: 'explore-fetch-url', duration, chars: truncated.length }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify({ url: input.url, content: truncated + truncatedMsg, length: truncated.length }, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'explore-fetch-url', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

