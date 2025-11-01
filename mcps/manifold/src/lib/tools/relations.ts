import { z } from 'zod';
import { callManifold } from '../api-client.js';
import { RelationPayloadSchema, BatchLinkRequestSchema } from '../schemas.js';

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

export const batchLinkRelatedTool = {
  name: 'mf-batch-link-related',
  config: {
    title: 'Batch Link Related Thoughts',
    description: 'Create multiple relations from a thought to other thoughts at once. More efficient than multiple single link calls.',
    inputSchema: z.object({ 
      thought_id: z.string().describe('Source thought ID'),
      relations: BatchLinkRequestSchema.shape.relations
    }).shape
  },
  handler: async (input: { thought_id: string; relations: z.infer<typeof BatchLinkRequestSchema>['relations'] }) => {
    const res = await callManifold(
      `/v1/memory/thought/${input.thought_id}/related/batch`, 
      { 
        method: 'POST', 
        body: JSON.stringify({ relations: input.relations }) 
      }, 
      15000
    );
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

export const getThoughtTreeTool = {
  name: 'mf-get-thought-tree',
  config: {
    title: 'Get Thought Tree',
    description: 'Get hierarchical tree: parent → thought → children, plus related thoughts.',
    inputSchema: z.object({ 
      thought_id: z.string(),
      depth: z.number().int().min(1).max(3).default(2).optional()
    }).shape
  },
  handler: async (input: { thought_id: string; depth?: number }) => {
    try {
      const params = new URLSearchParams();
      if (input.depth) params.append('depth', String(input.depth));
      const res = await callManifold(`/v1/memory/thought/${input.thought_id}/tree?${params.toString()}`, {}, 15000);
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
    }
  }
};


