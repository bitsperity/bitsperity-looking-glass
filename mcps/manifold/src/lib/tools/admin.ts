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


