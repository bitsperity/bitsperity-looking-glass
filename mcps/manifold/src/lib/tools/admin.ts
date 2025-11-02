import { z } from 'zod';
import { callManifold } from '../api-client.js';
import { ReembedRequestSchema, ReindexRequestSchema, BulkIdsSchema } from '../schemas.js';

export const getHistoryTool = {
  name: 'mf-get-history',
  config: { title: 'Get History', description: 'Get version info for a thought', inputSchema: z.object({ thought_id: z.string() }).shape },
  handler: async (input: { thought_id: string }) => {
    const res = await callManifold(`/v1/memory/thought/${input.thought_id}/history`, {}, 8000);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
};

export const reembedThoughtTool = {
  name: 'mf-reembed-thought',
  config: { title: 'Re-embed Thought', description: 'Recompute vectors for a thought', inputSchema: z.object({ thought_id: z.string(), body: ReembedRequestSchema }).shape },
  handler: async (input: { thought_id: string; body: any }) => {
    const res = await callManifold(`/v1/memory/thought/${input.thought_id}/reembed`, { method: 'POST', body: JSON.stringify(input.body) }, 20000);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
};

export const reindexCollectionTool = {
  name: 'mf-reindex',
  config: { title: 'Reindex Collection', description: 'Dry-run or full reindex', inputSchema: ReindexRequestSchema.shape },
  handler: async (input: any) => {
    const res = await callManifold('/v1/memory/reindex', { method: 'POST', body: JSON.stringify(input) }, 60000);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
};

export const dedupeThoughtsTool = {
  name: 'mf-dedupe',
  config: { title: 'Dedupe Thoughts', description: 'Stub for semantic deduplication', inputSchema: z.object({ strategy: z.string().optional(), filters: z.any().optional(), threshold: z.number().optional() }).shape },
  handler: async (input: any) => {
    const res = await callManifold('/v1/memory/dedupe', { method: 'POST', body: JSON.stringify(input) }, 30000);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
};

export const bulkQuarantineTool = {
  name: 'mf-bulk-quarantine',
  config: { title: 'Bulk Quarantine', description: 'Quarantine many thoughts', inputSchema: z.object({ ids: z.array(z.string()), reason: z.string().optional() }).shape },
  handler: async (input: any) => {
    const res = await callManifold('/v1/memory/bulk/quarantine', { method: 'POST', body: JSON.stringify(input) }, 15000);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
};

export const bulkUnquarantineTool = {
  name: 'mf-bulk-unquarantine',
  config: { title: 'Bulk Unquarantine', description: 'Unquarantine many thoughts', inputSchema: BulkIdsSchema.shape },
  handler: async (input: any) => {
    const res = await callManifold('/v1/memory/bulk/unquarantine', { method: 'POST', body: JSON.stringify(input) }, 15000);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
};

export const bulkReembedTool = {
  name: 'mf-bulk-reembed',
  config: { title: 'Bulk Re-embed', description: 'Re-embed many thoughts', inputSchema: z.object({ ids: z.array(z.string()), vectors: z.array(z.enum(['text','title'])).default(['text','title']) }).shape },
  handler: async (input: any) => {
    const res = await callManifold('/v1/memory/bulk/reembed', { method: 'POST', body: JSON.stringify(input) }, 60000);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
};

export const bulkPromoteTool = {
  name: 'mf-bulk-promote',
  config: { title: 'Bulk Promote', description: 'Mark many thoughts as promoted_to_kg', inputSchema: BulkIdsSchema.shape },
  handler: async (input: any) => {
    const res = await callManifold('/v1/memory/bulk/promote', { method: 'POST', body: JSON.stringify(input) }, 15000);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
};

export const getTrashTool = {
  name: 'mf-get-trash',
  config: { title: 'Get Trash', description: 'Get soft-deleted thoughts', inputSchema: z.object({}).shape },
  handler: async () => {
    const res = await callManifold('/v1/memory/trash', {}, 15000);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
};

export const restoreFromTrashTool = {
  name: 'mf-restore-trash',
  config: { title: 'Restore From Trash', description: 'Restore a soft-deleted thought', inputSchema: z.object({ thought_id: z.string() }).shape },
  handler: async (input: { thought_id: string }) => {
    const res = await callManifold(`/v1/memory/trash/${input.thought_id}/restore`, { method: 'POST' }, 15000);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
};

export const getSimilarTool = {
  name: 'mf-get-similar',
  config: { 
    title: 'Get Similar', 
    description: 'Find the most similar thoughts to a given thought using vector similarity search. Compares the given thought\'s embeddings (title, summary, content) against all other thoughts and returns the k most similar results with similarity scores. Much more precise than mf-search when you have a specific thought and want to find related ones. Use this to discover connections, find similar analyses, or identify related hypotheses. Returns thought objects with similarity scores. Best practice: Use this when you have a thought ID and want to find similar thoughts; use mf-search for general semantic queries.',
    inputSchema: z.object({ 
      thought_id: z.string().describe('The thought ID to find similar thoughts for.'),
      k: z.number().int().min(1).max(20).default(5).describe('KRITISCH: Number of similar thoughts to return. Default 5 (token-efficient), max 20. Each result costs ~500-2000 tokens! Use k=3-5 for discovery, k=10-15 only when needed.')
    }).shape 
  },
  handler: async (input: { thought_id: string; k?: number }) => {
    const params = new URLSearchParams();
    params.append('k', String(input.k ?? 5));
    params.append('mcp', 'true');  // Always set mcp=true for MCP calls (token safety limits)
    const res = await callManifold(`/v1/memory/similar/${input.thought_id}?${params.toString()}`, {}, 15000);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
};

export const checkDuplicateTool = {
  name: 'mf-check-duplicate',
  config: {
    title: 'Check Duplicate',
    description: 'Check if a formulated thought (title/summary/content) is similar to existing thoughts BEFORE creating it. This prevents duplicate thought creation. Use this with a structured thought (not raw news headlines) that you plan to create - formulate the thought first, then check for duplicates. Returns is_duplicate boolean and array of similar thoughts with similarity scores. If is_duplicate=true, consider updating existing thought instead or linking as related. Recommended threshold: 0.85-0.92. Lower threshold (0.85) catches more variations, higher (0.90+) only near-exact duplicates. ALWAYS use this before mf-create-thought to avoid redundancy. For checking multiple thoughts, use mf-bulk-check-duplicate instead (much more efficient).',
    inputSchema: z.object({
      title: z.string().optional().describe('Structured title of the thought to check. Should be formulated/structured, not raw news headline.'),
      summary: z.string().optional().describe('Summary of the thought to check. Include key metrics if relevant.'),
      content: z.string().optional().describe('Full content of the thought to check. More comprehensive = better duplicate detection.'),
      threshold: z.number().min(0).max(1).default(0.90).describe('Similarity threshold 0-1. Default 0.90 (high precision). Lower values (0.85-0.87) catch more variations with similar meaning. Higher (0.92+) only near-exact duplicates. Recommended: 0.85-0.90 depending on desired strictness.')
    }).shape
  },
  handler: async (input: { title?: string; summary?: string; content?: string; threshold?: number }) => {
    try {
      const body: any = {};
      if (input.title !== undefined) body.title = input.title;
      if (input.summary !== undefined) body.summary = input.summary;
      if (input.content !== undefined) body.content = input.content;
      if (input.threshold !== undefined) body.threshold = input.threshold;
      const res = await callManifold('/v1/memory/check-duplicate', { method: 'POST', body: JSON.stringify(body) }, 20000);
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
    }
  }
};

export const bulkCheckDuplicateTool = {
  name: 'mf-bulk-check-duplicate',
  config: {
    title: 'Bulk Check Duplicate',
    description: 'Check multiple thoughts for duplicates in a single batch. Much more efficient than multiple mf-check-duplicate calls. Supports 1-100 thoughts per batch. Each thought object should have title, summary, content (at least one required). Returns detailed results for each thought (is_duplicate, similar_count, similar thoughts). Use this BEFORE mf-bulk-create-thoughts to filter out duplicates - only create thoughts where is_duplicate=false. Token-efficient: single API call with batch embedding instead of N calls. Recommended workflow: 1) Prepare array of thoughts to create, 2) Call mf-bulk-check-duplicate, 3) Filter results (keep only non-duplicates), 4) Call mf-bulk-create-thoughts with filtered list.',
    inputSchema: z.object({
      thoughts: z.array(z.object({
        title: z.string().optional().describe('Structured title of the thought to check.'),
        summary: z.string().optional().describe('Summary of the thought to check.'),
        content: z.string().optional().describe('Full content of the thought to check.')
      })).min(1).max(100).describe('Array of 1-100 thought objects to check. Each thought should have at least one of: title, summary, content.'),
      threshold: z.number().min(0).max(1).default(0.90).optional().describe('Similarity threshold 0-1. Default 0.90 (high precision). Lower values (0.85-0.87) catch more variations. Higher (0.92+) only near-exact duplicates.')
    }).shape
  },
  handler: async (input: { thoughts: Array<{ title?: string; summary?: string; content?: string }>; threshold?: number }) => {
    try {
      const body: any = {
        thoughts: input.thoughts
      };
      if (input.threshold !== undefined) body.threshold = input.threshold;
      const res = await callManifold('/v1/memory/check-duplicate/bulk', { method: 'POST', body: JSON.stringify(body) }, 40000); // Longer timeout for bulk operations
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
    }
  }
};

// DEPRECATED: Use mf-get-all-duplicates({include_marked: false, include_similarity: true}) instead
// Kept for backward compatibility but will be removed in future versions
export const getDuplicateWarningsTool = {
  name: 'mf-get-duplicate-warnings',
  config: {
    title: 'Get Duplicate Warnings [DEPRECATED]',
    description: '[DEPRECATED] Use mf-get-all-duplicates({include_marked: false, include_similarity: true}) instead. This tool is kept for backward compatibility only. Scans the knowledge graph to find similarity-based duplicate thought pairs (unmarked potential duplicates). Returns full thought objects for both thoughts in each pair, similarity score, and reason for flagging. Supports temporal filtering (from_dt/to_dt/days). Filter by session_id or workspace_id to limit scope.',
    inputSchema: z.object({
      threshold: z.number().min(0).max(1).default(0.92).optional().describe('Similarity threshold. Default 0.92 (high precision). Lower (0.85-0.87) finds more potential duplicates including variations. Higher (0.92+) only near-exact duplicates.'),
      limit: z.number().int().min(1).max(1000).default(100).optional().describe('Maximum number of duplicate pairs to return. Default 100, max 1000. Use limit to process in batches.'),
      session_id: z.string().optional().describe('Filter to specific session for session-scoped duplicate detection.'),
      workspace_id: z.string().optional().describe('Filter to specific workspace for workspace-scoped duplicate detection.'),
      from_dt: z.string().optional().describe('Start date in ISO format (e.g., "2025-11-01T00:00:00Z"). Use with to_dt for absolute date range.'),
      to_dt: z.string().optional().describe('End date in ISO format. Use with from_dt for absolute date range.'),
      days: z.number().int().min(1).optional().describe('Relative days from now (e.g., 7 = last week). Alternative to from_dt/to_dt. Calculates from_dt/to_dt automatically.')
    }).shape
  },
  handler: async (input: { threshold?: number; limit?: number; session_id?: string; workspace_id?: string; from_dt?: string; to_dt?: string; days?: number }) => {
    try {
      // Redirect to new endpoint internally
      const params = new URLSearchParams();
      if (input.threshold !== undefined) params.append('threshold', String(input.threshold));
      if (input.limit !== undefined) params.append('limit', String(input.limit));
      if (input.session_id) params.append('session_id', input.session_id);
      if (input.workspace_id) params.append('workspace_id', input.workspace_id);
      if (input.from_dt) params.append('from_dt', input.from_dt);
      if (input.to_dt) params.append('to_dt', input.to_dt);
      if (input.days) params.append('days', String(input.days));
      params.append('include_marked', 'false');
      params.append('include_similarity', 'true');
      params.append('mcp', 'true');  // Always set mcp=true for MCP calls (token safety limits)
      const res = await callManifold(`/v1/memory/duplicates/all?${params.toString()}`, {}, 30000);
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
    }
  }
};

export const getStatisticsTool = {
  name: 'mf-get-statistics',
  config: {
    title: 'Get Statistics',
    description: 'Get comprehensive statistics about thoughts.',
    inputSchema: z.object({
      session_id: z.string().optional()
    }).shape
  },
  handler: async (input: { session_id?: string }) => {
    try {
      const params = new URLSearchParams();
      if (input.session_id) params.append('session_id', input.session_id);
      const res = await callManifold(`/v1/memory/statistics?${params.toString()}`, {}, 20000);
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
    }
  }
};

export const getGraphMetricsTool = {
  name: 'mf-get-graph-metrics',
  config: {
    title: 'Get Graph Metrics',
    description: 'Calculate graph metrics (centrality, clustering, etc).',
    inputSchema: z.object({
      session_id: z.string().optional()
    }).shape
  },
  handler: async (input: { session_id?: string }) => {
    try {
      const params = new URLSearchParams();
      if (input.session_id) params.append('session_id', input.session_id);
      const res = await callManifold(`/v1/memory/graph/metrics?${params.toString()}`, {}, 30000);
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
    }
  }
};

export const getOverviewTool = {
  name: 'mf-get-overview',
  config: {
    title: 'Get Overview',
    description: 'Get comprehensive overview combining statistics and graph metrics in a single call. Returns distributions (by type, status, confidence, month), relation statistics (thoughts with relations, total relations, avg relations per thought), hierarchy stats (orphans, thoughts with parents), network metrics (density, centrality, degree distribution), and top nodes by centrality. This is the most efficient way to get a complete health check of the knowledge graph. Use this at the start of analysis runs to understand graph state, identify issues (high orphan count, low relation density), or generate summary reports. More comprehensive than mf-stats or mf-get-graph-metrics alone.',
    inputSchema: z.object({
      session_id: z.string().optional().describe('Optional session_id filter to get overview for specific session only.')
    }).shape
  },
  handler: async (input: { session_id?: string }) => {
    try {
      const params = new URLSearchParams();
      if (input.session_id) params.append('session_id', input.session_id);
      const res = await callManifold(`/v1/memory/overview?${params.toString()}`, {}, 30000);
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
    }
  }
};

export const getRelationTimelineTool = {
  name: 'mf-get-relation-timeline',
  config: {
    title: 'Get Relation Timeline',
    description: 'Get timeline of all relation creations with timestamps.',
    inputSchema: z.object({
      session_id: z.string().optional()
    }).shape
  },
  handler: async (input: { session_id?: string }) => {
    try {
      const params = new URLSearchParams();
      if (input.session_id) params.append('session_id', input.session_id);
      const res = await callManifold(`/v1/memory/relation-timeline?${params.toString()}`, {}, 20000);
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
    }
  }
};

export const quarantineThoughtTool = {
  name: 'mf-quarantine-thought',
  config: {
    title: 'Quarantine Thought',
    description: 'Quarantine a single thought.',
    inputSchema: z.object({
      thought_id: z.string(),
      reason: z.string().optional()
    }).shape
  },
  handler: async (input: { thought_id: string; reason?: string }) => {
    try {
      const body: any = {};
      if (input.reason !== undefined) body.reason = input.reason;
      const res = await callManifold(`/v1/memory/thought/${input.thought_id}/quarantine`, { method: 'POST', body: JSON.stringify(body) }, 10000);
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
    }
  }
};

export const unquarantineThoughtTool = {
  name: 'mf-unquarantine-thought',
  config: {
    title: 'Unquarantine Thought',
    description: 'Unquarantine a single thought.',
    inputSchema: z.object({
      thought_id: z.string()
    }).shape
  },
  handler: async (input: { thought_id: string }) => {
    try {
      const res = await callManifold(`/v1/memory/thought/${input.thought_id}/unquarantine`, { method: 'POST' }, 10000);
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
    }
  }
};

export const getAllDuplicatesTool = {
  name: 'mf-get-all-duplicates',
  config: {
    title: 'Get All Duplicates',
    description: 'Comprehensive duplicate detection combining both marked duplicate relations AND similarity-based detection in a single call. **KRITISCH - TOKEN-KOSTEN**: Default limit=50, include_content=false (saves massive tokens!), max 100. Each duplicate pair returns 2 thought objects (~1000-4000 tokens per pair with content, ~200-400 without!). Use lower limits (20-30) to save tokens. Returns unified list of all duplicate pairs with source indicator (marked_relation vs similarity_detection). Supports temporal filtering (from_dt/to_dt/days) to focus on recent thoughts. Use this as the primary tool for duplicate cleanup workflows. Review each pair and decide: merge (mf-merge-thoughts), unlink if false positive (mf-unlink-related), or leave as-is.',
    inputSchema: z.object({
      threshold: z.number().min(0).max(1).default(0.92).optional().describe('Similarity threshold for similarity-based detection. Default 0.92 (high precision). Lower (0.85-0.87) finds more potential duplicates.'),
      limit: z.number().int().min(1).max(100).default(50).optional().describe('KRITISCH: Maximum number of duplicate pairs to return. Default 50 (token-efficient), max 100. Each pair returns 2 thought objects (~200-400 tokens without content, ~1000-4000 with!). Use lower limits (20-30) to save tokens.'),
      session_id: z.string().optional().describe('Filter to specific session.'),
      workspace_id: z.string().optional().describe('Filter to specific workspace.'),
      from_dt: z.string().optional().describe('Start date in ISO format (e.g., "2025-11-01T00:00:00Z"). Use with to_dt for absolute date range.'),
      to_dt: z.string().optional().describe('End date in ISO format. Use with from_dt for absolute date range.'),
      days: z.number().int().min(1).optional().describe('Relative days from now (e.g., 7 = last week). Alternative to from_dt/to_dt.'),
      include_marked: z.boolean().default(true).optional().describe('Include marked duplicate relations (type="duplicate"). Default true.'),
      include_similarity: z.boolean().default(true).optional().describe('Include similarity-based detection (unmarked potential duplicates). Default true.'),
      include_content: z.boolean().default(false).optional().describe('KRITISCH: If false (default): returns only metadata (id, title, summary, type, status, confidence_level, created_at) without full content - MUCH more token-efficient! Set to true ONLY when you need full content for detailed comparison. Default false saves massive tokens (80-90% reduction).')
    }).shape
  },
  handler: async (input: { threshold?: number; limit?: number; session_id?: string; workspace_id?: string; from_dt?: string; to_dt?: string; days?: number; include_marked?: boolean; include_similarity?: boolean; include_content?: boolean }) => {
    try {
      const params = new URLSearchParams();
      if (input.threshold !== undefined) params.append('threshold', String(input.threshold));
      if (input.limit !== undefined) params.append('limit', String(input.limit));
      if (input.session_id) params.append('session_id', input.session_id);
      if (input.workspace_id) params.append('workspace_id', input.workspace_id);
      if (input.from_dt) params.append('from_dt', input.from_dt);
      if (input.to_dt) params.append('to_dt', input.to_dt);
      if (input.days) params.append('days', String(input.days));
      if (input.include_marked !== undefined) params.append('include_marked', String(input.include_marked));
      if (input.include_similarity !== undefined) params.append('include_similarity', String(input.include_similarity));
      if (typeof input.include_content === 'boolean') params.append('include_content', String(input.include_content));
      params.append('mcp', 'true');  // Always set mcp=true for MCP calls (token safety limits)
      const res = await callManifold(`/v1/memory/duplicates/all?${params.toString()}`, {}, 30000);
      
      // Additional MCP-level pruning: Even if backend returns content, ensure we only return essential fields
      // This ensures we always return token-efficient responses for duplicate detection (often used for discovery)
      if (res.duplicates && Array.isArray(res.duplicates)) {
        res.duplicates = res.duplicates.map((pair: any) => {
          if (!input.include_content) {
            // Keep only essential fields for duplicate comparison
            return {
              ...pair,
              thought_1: {
                id: pair.thought_1?.id,
                title: pair.thought_1?.title,
                summary: pair.thought_1?.summary,
                type: pair.thought_1?.type,
                status: pair.thought_1?.status,
                confidence_level: pair.thought_1?.confidence_level,
                created_at: pair.thought_1?.created_at,
              },
              thought_2: {
                id: pair.thought_2?.id,
                title: pair.thought_2?.title,
                summary: pair.thought_2?.summary,
                type: pair.thought_2?.type,
                status: pair.thought_2?.status,
                confidence_level: pair.thought_2?.confidence_level,
                created_at: pair.thought_2?.created_at,
              },
            };
          }
          return pair;
        });
      }
      
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
    }
  }
};

export const explainSearchTool = {
  name: 'mf-explain-search',
  config: {
    title: 'Explain Search',
    description: 'Explain search scoring (helps understand why certain results were returned).',
    inputSchema: z.object({
      query: z.string(),
      filters: z.any().optional(),
      limit: z.number().int().min(1).max(200).optional()
    }).shape
  },
  handler: async (input: { query: string; filters?: any; limit?: number }) => {
    try {
      const body: any = { query: input.query };
      if (input.filters !== undefined) body.filters = input.filters;
      if (input.limit !== undefined) body.limit = input.limit;
      const res = await callManifold('/v1/memory/explain/search', { method: 'POST', body: JSON.stringify(body) }, 20000);
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    } catch (e: any) {
      // Handle 501 Not Implemented gracefully
      if (e.message?.includes('501') || e.message?.includes('not implemented')) {
        return { content: [{ type: 'text', text: JSON.stringify({ status: 'not_implemented', message: 'Explain search is not yet implemented in the backend' }, null, 2) }] };
      }
      return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
    }
  }
};


