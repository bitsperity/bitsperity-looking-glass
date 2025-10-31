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
  config: { title: 'Get Similar', description: 'Find similar thoughts via vector similarity', inputSchema: z.object({ thought_id: z.string(), k: z.number().int().min(1).max(50).default(10) }).shape },
  handler: async (input: { thought_id: string; k?: number }) => {
    const params = new URLSearchParams();
    params.append('k', String(input.k ?? 10));
    const res = await callManifold(`/v1/memory/similar/${input.thought_id}?${params.toString()}`, {}, 15000);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
};

export const checkDuplicateTool = {
  name: 'mf-check-duplicate',
  config: {
    title: 'Check Duplicate',
    description: 'Check if a thought (title/summary/content) is similar to existing thoughts.',
    inputSchema: z.object({
      title: z.string().optional(),
      summary: z.string().optional(),
      content: z.string().optional(),
      threshold: z.number().min(0).max(1).default(0.90)
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

export const getDuplicateWarningsTool = {
  name: 'mf-get-duplicate-warnings',
  config: {
    title: 'Get Duplicate Warnings',
    description: 'Find potential duplicate thoughts in the system.',
    inputSchema: z.object({
      threshold: z.number().min(0).max(1).default(0.92).optional(),
      limit: z.number().int().min(1).max(1000).default(100).optional(),
      session_id: z.string().optional(),
      workspace_id: z.string().optional()
    }).shape
  },
  handler: async (input: { threshold?: number; limit?: number; session_id?: string; workspace_id?: string }) => {
    try {
      const params = new URLSearchParams();
      if (input.threshold !== undefined) params.append('threshold', String(input.threshold));
      if (input.limit !== undefined) params.append('limit', String(input.limit));
      if (input.session_id) params.append('session_id', input.session_id);
      if (input.workspace_id) params.append('workspace_id', input.workspace_id);
      const res = await callManifold(`/v1/memory/warnings/duplicates?${params.toString()}`, {}, 30000);
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
    description: 'Get complete overview of thought system (combines statistics & metrics).',
    inputSchema: z.object({
      session_id: z.string().optional()
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


