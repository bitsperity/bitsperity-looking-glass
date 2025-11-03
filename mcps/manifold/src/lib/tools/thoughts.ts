import { z } from 'zod';
import { callManifold } from '../api-client.js';
import { ThoughtEnvelopeSchema, PatchThoughtSchema, MergeThoughtsRequestSchema } from '../schemas.js';
import { logger } from '../../logger.js';

export const createThoughtTool = {
  name: 'mf-create-thought',
  config: {
    title: 'Create Thought',
    description: 'Create a new thought in the knowledge graph. **IMPORTANT**: workspace_id is REQUIRED - every thought must belong to a workspace. session_id is optional but must be within the same workspace if provided. Automatically computes embeddings for title, summary, and content vectors on the server. Valid thought types: observation (factual observation), hypothesis (testable claim), analysis (detailed examination), decision (action taken), reflection (meta-thinking), question (unanswered query), summary (aggregate overview). Use structured titles (not raw news headlines), include metadata (tags, tickers, sectors) for organization, and set confidence_score (0-1) based on evidence quality. Always check for duplicates before creating using mf-check-duplicate.',
    inputSchema: z.object({
      id: z.string().optional().describe('Optional custom ID. If omitted, UUID is auto-generated.'),
      type: z.string().min(1).describe('Thought type: observation, hypothesis, analysis, decision, reflection, question, or summary. Each type has different semantics and use cases.'),
      status: z.string().optional().describe('Thought status: active (default), deleted, quarantined. Usually omitted on creation.'),
      title: z.string().optional().describe('Brief, structured title summarizing the thought. Use clear language (not raw news headlines). Format: "Who/What/Impact/Context".'),
      content: z.string().optional().describe('Full content with context, market implications, relationships, and supporting details. Should be comprehensive and self-contained.'),
      summary: z.string().optional().describe('1-2 sentence summary capturing the core insight. Include key metrics/numbers if relevant. Used for quick scanning and embeddings.'),
      tickers: z.array(z.string()).optional().describe('Array of stock ticker symbols mentioned or relevant (e.g., ["AAPL", "NVDA"]). Empty array if none.'),
      tags: z.array(z.string()).optional().describe('Array of organizational tags (e.g., ["news-analysis", "daily", "2025-11-01", "earnings"]). Include date tags for temporal filtering.'),
      sectors: z.array(z.string()).optional().describe('Array of sector classifications (e.g., ["Technology", "Energy"]). Useful for sector-based analysis.'),
      confidence_score: z.number().min(0).max(1).optional().describe('Confidence level 0-1. 0.9+ = high certainty, 0.7-0.9 = medium, <0.7 = low/speculative. Based on evidence quality and source reliability.'),
      epistemology: z.record(z.any()).optional().describe('Optional reasoning structure: assumptions, evidence, reasoning chains. For complex analytical thoughts.'),
      links: z.record(z.any()).optional().describe('Optional links: ariadne_entities, ariadne_facts, news_ids, price_event_ids. Usually set via relations tools, not here.'),
      workspace_id: z.string().describe('REQUIRED: Every thought must belong to a workspace. Workspaces are persistent organizational units (projects, topics, themes). Use existing workspace_id or create new one (e.g., "tesla-analysis-2025", "market-research-q4").'),
      session_id: z.string().optional().describe('OPTIONAL: Session ID within the workspace. Sessions are temporary work units within a workspace (e.g., "week-1-analysis", "initial-research"). If provided, must belong to the same workspace_id. Sessions help organize thoughts chronologically or by work phase. Can be omitted if not using session-based organization.')
    }).shape
  },
  handler: async (input: z.infer<typeof ThoughtEnvelopeSchema>) => {
    logger.info({ tool: 'mf-create-thought', input: { type: input.type, title: input.title } }, 'Tool invoked');
    try {
      const res = await callManifold('/v1/memory/thought', { method: 'POST', body: JSON.stringify(input) }, 30000);
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
    }
  }
};

export const getThoughtTool = {
  name: 'mf-get-thought',
  config: {
    title: 'Get Thought',
    description: 'Load a complete thought by ID including all metadata, relations, versions, and links. Returns full payload with type, status, title, content, summary, tags, tickers, sectors, confidence_score, links (relations, ariadne_entities, news_ids), version history, and timestamps. Use this when you need complete context about a thought before modifying it, analyzing it, or linking to it. More efficient than mf-search when you know the exact ID.',
    inputSchema: z.object({ 
      id: z.string().describe('UUID of the thought to retrieve. Must be a valid thought ID from the knowledge graph.')
    }).shape
  },
  handler: async (input: { id: string }) => {
    try {
      const res = await callManifold(`/v1/memory/thought/${input.id}`, {}, 10000);
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
    }
  }
};

export const patchThoughtTool = {
  name: 'mf-patch-thought',
  config: {
    title: 'Patch Thought',
    description: 'Partially update a thought. Supports updating any field (title, content, summary, tags, tickers, sectors, confidence_score, links, etc.). Automatically re-computes embeddings if title, content, or summary changes. Maintains version history - each update creates a new version snapshot. Use this to refine thoughts, add metadata, update confidence after new evidence, or merge additional information. More efficient than delete+create for incremental updates.',
    inputSchema: z.object({ 
      id: z.string().describe('UUID of the thought to update. Must exist in the knowledge graph.'),
      patch: PatchThoughtSchema.describe('Partial update object. Can include any thought fields. Only provided fields will be updated. If title/content/summary change, embeddings are automatically recomputed.')
    }).shape
  },
  handler: async (input: { id: string; patch: any }) => {
    try {
      const res = await callManifold(`/v1/memory/thought/${input.id}`, { method: 'PATCH', body: JSON.stringify(input.patch) }, 20000);
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
    }
  }
};

export const deleteThoughtTool = {
  name: 'mf-delete-thought',
  config: {
    title: 'Delete Thought',
    description: 'Delete a thought from the knowledge graph. By default performs soft-delete (sets status=deleted, deleted_at timestamp) which preserves the thought for recovery but hides it from normal queries. Soft-deleted thoughts can be restored with mf-restore-trash. Hard delete (soft=false) permanently removes the thought and cannot be undone. WARNING: Deleting a thought does NOT automatically remove relations pointing to it - consider cleaning up relations first using mf-unlink-related. Use soft-delete for data quality issues, redundancy, or temporary removal. Use hard-delete only for complete removal with no recovery needed.',
    inputSchema: z.object({ 
      id: z.string().describe('UUID of the thought to delete. Must exist in the knowledge graph.'),
      soft: z.boolean().default(true).describe('If true (default): soft-delete (recoverable). If false: hard-delete (permanent, irreversible).')
    }).shape
  },
  handler: async (input: { id: string; soft?: boolean }) => {
    try {
      const soft = input.soft === undefined ? true : input.soft;
      const res = await callManifold(`/v1/memory/thought/${input.id}?soft=${soft ? 'true' : 'false'}`, { method: 'DELETE' }, 10000);
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
    }
  }
};

export const getThoughtChildrenTool = {
  name: 'mf-get-thought-children',
  config: {
    title: 'Get Thought Children',
    description: 'Get all direct child thoughts (where parent_id equals the given thought_id). Results are automatically sorted by ordinal field (ascending). Useful for hierarchical thought structures where parent thoughts have ordered children (e.g., analysis with numbered points, decision trees, structured breakdowns). Returns array of child thought objects with all their metadata. Empty array if no children exist.',
    inputSchema: z.object({ 
      id: z.string().describe('UUID of the parent thought. Returns all thoughts where parent_id equals this ID, sorted by ordinal.')
    }).shape
  },
  handler: async (input: { id: string }) => {
    try {
      const res = await callManifold(`/v1/memory/thought/${input.id}/children`, {}, 10000);
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
    }
  }
};

export const mergeThoughtsTool = {
  name: 'mf-merge-thoughts',
  config: {
    title: 'Merge Thoughts',
    description: 'Merge source thought into target thought. Transfers all relations (outgoing and incoming), metadata (tags, tickers, sectors), and optionally merges content. Then soft-deletes source thought.',
    inputSchema: z.object({
      target_id: z.string().describe('ID of target thought (will be kept)'),
      source_id: z.string().describe('ID of source thought (will be deleted after merge)'),
      strategy: z.enum(['keep_target', 'merge_content', 'keep_source']).default('keep_target').optional().describe('Merge strategy: keep_target (default), merge_content (combine), or keep_source (use source content if better)')
    }).shape
  },
  handler: async (input: { target_id: string; source_id: string; strategy?: 'keep_target' | 'merge_content' | 'keep_source' }) => {
    logger.info({ tool: 'mf-merge-thoughts', target_id: input.target_id, source_id: input.source_id, strategy: input.strategy }, 'Tool invoked');
    try {
      const body = input.strategy ? { strategy: input.strategy } : {};
      const res = await callManifold(`/v1/memory/thought/${input.target_id}/merge/${input.source_id}`, {
        method: 'POST',
        body: JSON.stringify(body)
      }, 30000);
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
    }
  }
};

export const bulkCreateThoughtsTool = {
  name: 'mf-bulk-create-thoughts',
  config: {
    title: 'Bulk Create Thoughts',
    description: 'Create multiple thoughts in a single batch. Much more efficient than multiple mf-create-thought calls. Supports 1-100 thoughts per batch. **IMPORTANT**: Each thought MUST have workspace_id (required). session_id is optional but must be within the same workspace if provided. Each thought follows ThoughtEnvelope schema (type, title, content, summary, tags, tickers, sectors, workspace_id, session_id, etc.). Automatically computes embeddings for all thoughts. Returns detailed results for each thought (created, errors). Use this when creating multiple related thoughts (e.g., TOP-3 discoveries, multiple observations from one analysis). Token-efficient: single API call instead of N calls.',
    inputSchema: z.object({
      thoughts: z.array(ThoughtEnvelopeSchema).min(1).max(100).describe('Array of 1-100 thought objects to create. Each thought follows ThoughtEnvelope schema with type (required), title, content, summary, tags, tickers, sectors, workspace_id (REQUIRED), session_id (optional), etc. All thoughts are created atomically - if one fails, others still succeed.')
    }).shape
  },
  handler: async (input: { thoughts: any[] }) => {
    logger.info({ tool: 'mf-bulk-create-thoughts', count: input.thoughts?.length || 0 }, 'Tool invoked');
    try {
      if (!input.thoughts || !Array.isArray(input.thoughts) || input.thoughts.length === 0) {
        return { content: [{ type: 'text', text: 'Error: thoughts array is required and must contain at least one thought' }], isError: true };
      }
      const res = await callManifold('/v1/memory/thought/bulk', {
        method: 'POST',
        body: JSON.stringify({ thoughts: input.thoughts })
      }, 60000); // Longer timeout for bulk operations
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    } catch (e: any) {
      logger.error({ tool: 'mf-bulk-create-thoughts', error: e }, 'Tool failed');
      return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
    }
  }
};


