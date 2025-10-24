import { z } from 'zod';
import { callManifold } from '../api-client.js';
import { RelationPayloadSchema } from '../schemas.js';

export const linkRelatedTool = {
  name: 'mf-link-related',
  config: {
    title: 'Link Related Thought',
    description: 'Create a relation from a thought to another thought.',
    inputSchema: z.object({ thought_id: z.string(), payload: RelationPayloadSchema }).shape
  },
  handler: async (input: { thought_id: string; payload: z.infer<typeof RelationPayloadSchema> }) => {
    const res = await callManifold(`/v1/memory/thought/${input.thought_id}/related`, { method: 'POST', body: JSON.stringify(input.payload) }, 10000);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
};

export const unlinkRelatedTool = {
  name: 'mf-unlink-related',
  config: {
    title: 'Unlink Related Thought',
    description: 'Remove a relation between thoughts.',
    inputSchema: z.object({ thought_id: z.string(), related_id: z.string() }).shape
  },
  handler: async (input: { thought_id: string; related_id: string }) => {
    const res = await callManifold(`/v1/memory/thought/${input.thought_id}/related/${input.related_id}`, { method: 'DELETE' }, 10000);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
};

export const getRelatedTool = {
  name: 'mf-get-related',
  config: {
    title: 'Get Related Thoughts',
    description: 'Get related thoughts up to depth.',
    inputSchema: z.object({ thought_id: z.string(), depth: z.number().int().min(1).max(3).default(1) }).shape
  },
  handler: async (input: { thought_id: string; depth?: number }) => {
    const params = new URLSearchParams();
    if (input.depth) params.append('depth', String(input.depth));
    const res = await callManifold(`/v1/memory/thought/${input.thought_id}/related?${params.toString()}`, {}, 15000);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
};

export const getRelatedFacetsTool = {
  name: 'mf-related-facets',
  config: {
    title: 'Related Facets',
    description: 'Facet counts among neighbors.',
    inputSchema: z.object({ thought_id: z.string() }).shape
  },
  handler: async (input: { thought_id: string }) => {
    const res = await callManifold(`/v1/memory/thought/${input.thought_id}/related/facets`, {}, 10000);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
};

export const getRelatedGraphTool = {
  name: 'mf-related-graph',
  config: {
    title: 'Related Graph',
    description: 'Return nodes/edges for related subgraph.',
    inputSchema: z.object({ thought_id: z.string(), depth: z.number().int().min(1).max(3).default(1) }).shape
  },
  handler: async (input: { thought_id: string; depth?: number }) => {
    const params = new URLSearchParams();
    if (input.depth) params.append('depth', String(input.depth));
    const res = await callManifold(`/v1/memory/thought/${input.thought_id}/related/graph?${params.toString()}`, {}, 15000);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
};


