import { z } from 'zod';
import { callManifold } from '../api-client.js';

export const getBirdviewGraphTool = {
  name: 'mf-graph',
  config: {
    title: 'Birdview Graph',
    description: 'Get global graph structure (nodes and edges) across the entire knowledge graph or filtered subset. Returns arrays of nodes (thoughts) and edges (relations) with their types and weights. Supports filtering by type, status, tickers, session_id, or workspace_id. Useful for global visualization, understanding overall graph structure, network analysis, or exporting graph data. More efficient than fetching all thoughts when you only need graph structure. Default limit 500 nodes, max 5000. Higher limits may be slow for large graphs.',
    inputSchema: z.object({
      limit: z.number().int().min(10).max(5000).default(500).describe('Maximum nodes to include. Default 500, max 5000.'),
      type: z.string().optional().describe('Filter by thought type (observation, hypothesis, analysis, etc.).'),
      status: z.string().optional().describe('Filter by status (active, deleted, quarantined).'),
      tickers: z.string().optional().describe('Filter by ticker symbols (comma-separated, e.g., "AAPL,NVDA").'),
      session_id: z.string().optional().describe('Filter to specific session.'),
      workspace_id: z.string().optional().describe('Filter to specific workspace.')
    }).shape
  },
  handler: async (input: any) => {
    const params = new URLSearchParams();
    params.append('limit', String(input.limit ?? 500));
    if (input.type) params.append('type', input.type);
    if (input.status) params.append('status', input.status);
    if (input.tickers) params.append('tickers', input.tickers);
    if (input.session_id) params.append('session_id', input.session_id);
    if (input.workspace_id) params.append('workspace_id', input.workspace_id);
    const res = await callManifold(`/v1/memory/graph?${params.toString()}`, {}, 20000);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
};


