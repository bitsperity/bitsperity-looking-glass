import { z } from 'zod';
import { callManifold } from '../api-client.js';
import { RelationPayloadSchema, BatchLinkRequestSchema } from '../schemas.js';

export const linkRelatedTool = {
  name: 'mf-link-related',
  config: {
    title: 'Link Related Thought',
    description: 'Create a single typed relation from one thought to another. Relation types: supports (thought B supports claim A), contradicts (thought B contradicts A), followup (B is a follow-up to A), duplicate (B is duplicate of A), related (general connection). Weight (0-1) indicates relation strength. Optional description field explains WHY the relation exists (e.g., "Both discuss same regulatory change", "Thought B provides evidence for A\'s hypothesis"). Always provide description when creating relations to make connections transparent. For creating multiple relations efficiently, use mf-batch-link-related instead. Relations are bidirectional for querying but stored directionally. Returns creation timestamp.',
    inputSchema: z.object({ 
      thought_id: z.string().describe('Source thought ID (the thought creating the relation).'),
      payload: RelationPayloadSchema.describe('Relation payload containing related_id, relation_type, optional weight (0-1, default 1.0), and optional description explaining why this relation exists.')
    }).shape
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
    description: 'Create multiple relations from one thought to multiple other thoughts in a single API call. Much more efficient than multiple mf-link-related calls. Supports up to 100 relations per call. Each relation can have its own type (supports, contradicts, followup, duplicate, related), weight (0-1), and optional description explaining WHY the relation exists. Always provide descriptions to make connections transparent (e.g., "Both discuss same regulatory change", "Thought B provides evidence for A\'s hypothesis"). Use this when linking a thought to multiple similar thoughts, creating a network of connections, or establishing complex relationship structures. Returns detailed results for each relation (linked, skipped, updated).',
    inputSchema: z.object({ 
      thought_id: z.string().describe('Source thought ID (the thought creating all relations).'),
      relations: BatchLinkRequestSchema.shape.relations.describe('Array of 1-100 relation objects. Each must have related_id, optional relation_type (default: "related"), optional weight (default: 1.0), and optional description explaining why the relation exists.')
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
    description: 'Remove a relation between two thoughts. Deletes the relation from both the related_thoughts list and the typed relations array. Use this to correct mistaken relations, remove false "duplicate" links after verification, or clean up relations before deleting a thought. Returns status confirming unlinking. Note: This removes the relation entirely - if you want to change the relation type or weight, use mf-batch-link-related with update.',
    inputSchema: z.object({ 
      thought_id: z.string().describe('Source thought ID (the thought removing the relation).'),
      related_id: z.string().describe('Target thought ID (the thought to unlink from source).')
    }).shape
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
    description: 'Get all thoughts related to a given thought, including both outgoing (thought → others) and incoming (others → thought) relations. Returns full thought objects, typed relations (supports, contradicts, followup, duplicate, related), and relation metadata. Depth parameter controls how many hops to traverse (1 = direct neighbors only, 2 = neighbors of neighbors, max 3). Use this to understand the thought\'s position in the knowledge graph, explore connections, or analyze relationship patterns. Returns structured data with incoming/outgoing relations separately identified.',
    inputSchema: z.object({ 
      thought_id: z.string().describe('The thought ID to get relations for.'),
      depth: z.number().int().min(1).max(3).default(1).describe('Traversal depth: 1 = direct neighbors only, 2 = 2 hops, 3 = 3 hops (max). Higher depth can be slow for highly connected thoughts.')
    }).shape
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
    description: 'Get facet/aggregation counts for all thoughts related to a given thought. Returns counts by type (observation, hypothesis, analysis, etc.), status (active, deleted, quarantined), tickers mentioned, and sectors. Useful for understanding the context around a thought - what types of thoughts connect to it, which tickers are most prominent in its neighborhood, what sectors are represented. Helps with discovery, pattern analysis, and understanding thought clusters.',
    inputSchema: z.object({ 
      thought_id: z.string().describe('The thought ID to analyze neighbors of.')
    }).shape
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
    description: 'Get graph structure (nodes and edges) for the subgraph around a thought. Returns arrays of nodes (thoughts) and edges (relations) with their types and weights. Useful for visualization, graph analysis, understanding network topology, or exporting subgraphs. Depth controls traversal (1-3 hops). Each edge includes relation type (supports, contradicts, followup, duplicate, related) and weight. More efficient than get-related when you only need structure, not full thought content.',
    inputSchema: z.object({ 
      thought_id: z.string().describe('Central thought ID for the subgraph.'),
      depth: z.number().int().min(1).max(3).default(1).describe('Graph depth: 1 = direct neighbors, 2-3 = extended neighborhood.')
    }).shape
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
    description: 'Get hierarchical tree structure for a thought: parent (if exists), the thought itself, all children (sorted by ordinal), and related thoughts. Useful for understanding hierarchical structures where thoughts have parent-child relationships (e.g., analyses with numbered sub-points, decision trees, structured breakdowns). Returns full thought objects for parent, children (ordered), and related thoughts separately. Different from get-related-graph as it focuses on hierarchy (parent/children) plus relations, not just the relation network.',
    inputSchema: z.object({ 
      thought_id: z.string().describe('Root thought ID for the tree.'),
      depth: z.number().int().min(1).max(3).default(2).optional().describe('Maximum depth for related thoughts exploration. Default 2.')
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

export const getThoughtsWithRelationTypeTool = {
  name: 'mf-get-thoughts-with-relation-type',
  config: {
    title: 'Get Thoughts with Relation Type',
    description: 'Find all thought pairs connected by a specific relation type across the entire knowledge graph. Useful for finding all "supports", "contradicts", "followup", "related", or "duplicate" relations. **KRITISCH - TOKEN-KOSTEN**: Default include_content=false (saves massive tokens!). Returns pairs with thought objects (from_thought, to_thought) if include_thoughts=true. Each pair includes relation weight and creation timestamp. Supports temporal filtering (from_dt/to_dt/days) to focus on recent thoughts. Much more efficient than scanning all thoughts manually. Use include_thoughts=false if you only need IDs and relation metadata. NOTE: For duplicate cleanup workflows, use mf-get-all-duplicates instead - it combines marked duplicate relations AND similarity-based detection.',
    inputSchema: z.object({
      relation_type: z.enum(['supports', 'contradicts', 'followup', 'duplicate', 'related']).describe('The relation type to filter by. Most common use: "duplicate" to find all duplicate pairs for cleanup.'),
      limit: z.number().int().min(1).max(100).default(20).describe('KRITISCH: Maximum number of pairs to return. Default 20 (token-efficient), max 100. Each pair with thoughts costs ~200-400 tokens without content, ~1000-4000 with!'),
      include_thoughts: z.boolean().default(true).optional().describe('If true (default): returns thought objects for both from_thought and to_thought. If false: returns only IDs and relation metadata. Set false to save tokens when you only need to identify pairs.'),
      include_content: z.boolean().default(false).optional().describe('KRITISCH: If false (default) and include_thoughts=true: returns only metadata (id, title, summary, type, tags, tickers, confidence_score, created_at, status) without full content/links/epistemology - MUCH more token-efficient! Set to true ONLY when you need full content. Default false saves massive tokens (80-90% reduction).'),
      from_dt: z.string().optional().describe('Start date in ISO format (e.g., "2025-11-01T00:00:00Z"). Use with to_dt for absolute date range. Filters by source thought created_at.'),
      to_dt: z.string().optional().describe('End date in ISO format. Use with from_dt for absolute date range. Filters by source thought created_at.'),
      days: z.number().int().min(1).optional().describe('Relative days from now (e.g., 7 = last week). Alternative to from_dt/to_dt.'),
      session_id: z.string().optional().describe('Filter to specific session.'),
      workspace_id: z.string().optional().describe('Filter to specific workspace.')
    }).shape
  },
  handler: async (input: { relation_type: string; limit?: number; include_thoughts?: boolean; include_content?: boolean; from_dt?: string; to_dt?: string; days?: number; session_id?: string; workspace_id?: string }) => {
    const params = new URLSearchParams();
    if (input.limit) params.append('limit', String(input.limit));
    if (input.include_thoughts !== undefined) params.append('include_thoughts', String(input.include_thoughts));
    if (typeof input.include_content === 'boolean') params.append('include_content', String(input.include_content));
    if (input.from_dt) params.append('from_dt', input.from_dt);
    if (input.to_dt) params.append('to_dt', input.to_dt);
    if (input.days) params.append('days', String(input.days));
    if (input.session_id) params.append('session_id', input.session_id);
    if (input.workspace_id) params.append('workspace_id', input.workspace_id);
    params.append('mcp', 'true');  // Always set mcp=true for MCP calls (token safety limits)
    const res = await callManifold(`/v1/memory/thought/with-relation-type/${input.relation_type}?${params.toString()}`, {}, 15000);
    
    // Additional MCP-level pruning: Even if backend returns content, ensure we only return essential fields
    // This ensures we always return token-efficient responses for relation-type queries (often used for discovery)
    if (res.pairs && Array.isArray(res.pairs) && input.include_thoughts && !input.include_content) {
      res.pairs = res.pairs.map((pair: any) => {
        const pruneThought = (thought: any) => {
          if (!thought) return thought;
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
        };
        return {
          ...pair,
          from_thought: pruneThought(pair.from_thought),
          to_thought: pruneThought(pair.to_thought),
        };
      });
    }
    
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
};


