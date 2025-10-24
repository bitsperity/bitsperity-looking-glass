import { z } from 'zod';
import { callManifold } from '../api-client.js';

export const getBirdviewGraphTool = {
  name: 'mf-graph',
  config: {
    title: 'Birdview Graph',
    description: 'Global graph (nodes/edges) with optional filters.',
    inputSchema: z.object({
      limit: z.number().int().min(10).max(5000).default(500),
      type: z.string().optional(),
      status: z.string().optional(),
      tickers: z.string().optional()
    }).shape
  },
  handler: async (input: any) => {
    const params = new URLSearchParams();
    params.append('limit', String(input.limit ?? 500));
    if (input.type) params.append('type', input.type);
    if (input.status) params.append('status', input.status);
    if (input.tickers) params.append('tickers', input.tickers);
    const res = await callManifold(`/v1/memory/graph?${params.toString()}`, {}, 20000);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
};


