import { z } from 'zod';
import { callManifold } from '../api-client.js';
import { SearchRequestSchema } from '../schemas.js';

export const searchThoughtsTool = {
  name: 'mf-search',
  config: {
    title: 'Search Thoughts',
    description: 'Semantic vector search across the knowledge graph with powerful filtering, faceting, and diversity controls. **KRITISCH - TOKEN-KOSTEN**: Default limit=10, include_content=false (saves massive tokens!). Use higher limits (20-30) only when absolutely necessary. Each full thought object costs ~500-2000 tokens. Searches across title, summary, and content vectors (configurable via vector_type). Supports complex filters (must, should, must_not) for type, status, tags, tickers, sectors, date ranges, and custom fields. Best for discovery, finding similar thoughts, or complex querying. For finding thoughts similar to a specific thought ID, use mf-get-similar instead.',
    inputSchema: z.object({
      query: z.string().optional().describe('Semantic search query string. If empty, uses filters only (useful for pure filtering without semantic search).'),
      vector_type: z.enum(['text','title','summary']).optional().describe('Which vector to search: "text" (content, default), "title", or "summary". Use title for quick lookups, summary for overview searches, text for comprehensive content matching.'),
      include_content: z.boolean().default(false).describe('KRITISCH: If false (default): returns only metadata (title, summary, tags, tickers) without full content - MUCH more token-efficient! Set to true ONLY when you need full content. Default false saves significant tokens.'),
      filters: z.any().optional().describe('Complex filter object with must/should/must_not clauses. Filter by: type, status, tags (use op="any" for tag matching), tickers, sectors, date ranges (created_at, updated_at), confidence_score ranges. Example: {"must": [{"field": "type", "op": "match", "value": "analysis"}, {"field": "tags", "op": "any", "value": ["2025-11-01"]}]}.'),
      boosts: z.any().optional().describe('Boost factors to prioritize certain results. Example: {"type": {"analysis": 1.5, "hypothesis": 1.2}} increases scores for analysis/hypothesis thoughts.'),
      diversity: z.any().optional().describe('Diversity controls to avoid redundant results from similar clusters. Helps when you want diverse perspectives rather than all similar thoughts.'),
      limit: z.number().int().min(1).max(50).default(10).describe('KRITISCH: Maximum results to return. Default 10 (token-efficient), max 50. Use lower limits (5-10) for discovery, higher (20-30) only when needed. Each result costs tokens!'),
      offset: z.number().int().min(0).default(0).describe('Offset for pagination. Use with limit for large result sets.')
    }).shape
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
    description: 'Get thoughts organized in a timeline, bucketed by day or week. **KRITISCH - TOKEN-KOSTEN**: Default limit=20, include_content=false (saves massive tokens!). Use max 100 only when necessary. Each full thought object costs ~500-2000 tokens. Returns thoughts per time bucket with optional filtering by type, tickers, session_id, or workspace_id. Useful for understanding thought creation patterns over time, identifying activity spikes, analyzing temporal coverage. Supports date range filtering (from_dt/to_dt) or relative days (e.g., days=7 for last week). Bucket granularity: "day" or "week".',
    inputSchema: z.object({
      from_dt: z.string().optional().describe('Start date in ISO format (e.g., "2025-11-01T00:00:00Z"). Use with to_dt for absolute date range.'),
      to_dt: z.string().optional().describe('End date in ISO format. Use with from_dt for absolute date range.'),
      type: z.string().optional().describe('Filter by thought type (observation, hypothesis, analysis, etc.).'),
      tickers: z.string().optional().describe('Filter by ticker symbols (comma-separated, e.g., "AAPL,NVDA").'),
      session_id: z.string().optional().describe('Filter by session ID for session-specific timelines.'),
      workspace_id: z.string().optional().describe('Filter by workspace ID for workspace-specific timelines.'),
      days: z.number().int().positive().optional().describe('Relative days from now (e.g., 7 = last week). Alternative to from_dt/to_dt.'),
      bucket: z.enum(['day','week']).optional().describe('Time bucket granularity: "day" for daily buckets, "week" for weekly buckets. Default behavior varies.'),
      limit: z.number().int().positive().max(100).default(20).describe('KRITISCH: Maximum number of time buckets or thoughts to return. Default 20 (token-efficient), max 100. Use lower limits (10-20) to save tokens. Each thought object costs ~500-2000 tokens!'),
      include_content: z.boolean().default(false).describe('KRITISCH: If false (default): returns only metadata (id, title, summary, type, tags, tickers, confidence_score, created_at, status) without full content/links/epistemology - MUCH more token-efficient! Set to true ONLY when you need full content. Default false saves massive tokens.')
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
    if (typeof input.include_content === 'boolean') params.append('include_content', String(input.include_content));
    const res = await callManifold(`/v1/memory/timeline?${params.toString()}`, {}, 15000);
    
    // Additional MCP-level pruning: Even if backend returns content, strip unnecessary fields for LLM efficiency
    // This ensures we always return token-efficient responses for timeline (mostly used for discovery)
    if (res.timeline && Array.isArray(res.timeline)) {
      res.timeline = res.timeline.map((thought: any) => {
        if (!input.include_content) {
          // Keep only essential fields for timeline overview
          return {
            id: thought.id,
            title: thought.title,
            summary: thought.summary,
            type: thought.type,
            tags: thought.tags,
            tickers: thought.tickers,
            confidence_score: thought.confidence_score,
            created_at: thought.created_at,
            status: thought.status,
          };
        }
        return thought;
      });
    }
    if (res.bucketed && typeof res.bucketed === 'object') {
      res.bucketed = Object.fromEntries(
        Object.entries(res.bucketed).map(([key, thoughts]: [string, any]) => [
          key,
          Array.isArray(thoughts) ? thoughts.map((thought: any) => {
            if (!input.include_content) {
              return {
                id: thought.id,
                title: thought.title,
                summary: thought.summary,
                type: thought.type,
                tags: thought.tags,
                tickers: thought.tickers,
                confidence_score: thought.confidence_score,
                created_at: thought.created_at,
                status: thought.status,
              };
            }
            return thought;
          }) : thoughts
        ])
      );
    }
    
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
};

export const getStatsTool = {
  name: 'mf-stats',
  config: {
    title: 'Stats',
    description: 'Get aggregated statistics about the knowledge graph with optional filtering. Returns distributions by type (how many observations, hypotheses, analyses, etc.), by status (active, deleted, quarantined), by confidence level, and by month. Also includes relation statistics (thoughts with relations, total relations, average relations per thought) and hierarchy statistics (thoughts with parents, orphan thoughts). Useful for health checks, understanding graph composition, identifying imbalances, or generating summary reports. Filter by tickers, timeframe, session_id, or workspace_id to get subset statistics.',
    inputSchema: z.object({ 
      tickers: z.string().optional().describe('Filter by ticker symbols (comma-separated) to get stats for specific stocks only.'),
      timeframe: z.string().optional().describe('Timeframe filter (e.g., "last_30_days", "2025-11") to get stats for specific periods.'),
      session_id: z.string().optional().describe('Filter by session ID for session-specific statistics.'),
      workspace_id: z.string().optional().describe('Filter by workspace ID for workspace-specific statistics.')
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


