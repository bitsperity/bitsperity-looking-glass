import { z } from 'zod';
import { callManifold } from '../api-client.js';
import { SearchRequestSchema } from '../schemas.js';

export const searchThoughtsTool = {
  name: 'mf-search',
  config: {
    title: 'Search Thoughts',
    description: 'Semantic search with filters, facets and optional diversity.',
    inputSchema: SearchRequestSchema.shape
  },
  handler: async (input: z.infer<typeof SearchRequestSchema>) => {
    const res = await callManifold('/v1/memory/search', { method: 'POST', body: JSON.stringify(input) }, 30000);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
};

export const getTimelineTool = {
  name: 'mf-timeline',
  config: {
    title: 'Timeline',
    description: 'Get thoughts timeline (bucketed by day/week).',
    inputSchema: z.object({
      from_dt: z.string().optional(),
      to_dt: z.string().optional(),
      type: z.string().optional(),
      tickers: z.string().optional(),
      session_id: z.string().optional(),
      workspace_id: z.string().optional(),
      days: z.number().int().positive().optional(),
      bucket: z.enum(['day','week']).optional(),
      limit: z.number().int().positive().max(5000).optional(),
    }).shape
  },
  handler: async (input: any) => {
    const params = new URLSearchParams();
    if (input.from_dt) params.append('from_dt', input.from_dt);
    if (input.to_dt) params.append('to_dt', input.to_dt);
    if (input.type) params.append('type', input.type);
    if (input.tickers) params.append('tickers', input.tickers);
    if (input.session_id) params.append('session_id', input.session_id);
    if (input.workspace_id) params.append('workspace_id', input.workspace_id);
    if (input.days) params.append('days', String(input.days));
    if (input.bucket) params.append('bucket', String(input.bucket));
    if (input.limit) params.append('limit', String(input.limit));
    const res = await callManifold(`/v1/memory/timeline?${params.toString()}`, {}, 15000);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
};

export const getStatsTool = {
  name: 'mf-stats',
  config: {
    title: 'Stats',
    description: 'Aggregated stats by type, status, avg confidence.',
    inputSchema: z.object({ 
      tickers: z.string().optional(), 
      timeframe: z.string().optional(),
      session_id: z.string().optional(),
      workspace_id: z.string().optional()
    }).shape
  },
  handler: async (input: any) => {
    const params = new URLSearchParams();
    if (input.tickers) params.append('tickers', input.tickers);
    if (input.timeframe) params.append('timeframe', input.timeframe);
    if (input.session_id) params.append('session_id', input.session_id);
    if (input.workspace_id) params.append('workspace_id', input.workspace_id);
    const res = await callManifold(`/v1/memory/stats?${params.toString()}`, {}, 10000);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
};


