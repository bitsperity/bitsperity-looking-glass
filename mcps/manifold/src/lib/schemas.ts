import { z } from 'zod';

// Thought Envelope (input essentials)
export const ThoughtEnvelopeSchema = z.object({
  id: z.string().optional(),
  type: z.string().min(1),
  status: z.string().optional(),
  title: z.string().optional(),
  content: z.string().optional(),
  summary: z.string().optional(),
  tickers: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  sectors: z.array(z.string()).optional(),
  confidence_score: z.number().min(0).max(1).optional(),
  epistemology: z.record(z.any()).optional(),
  links: z.record(z.any()).optional(),
  workspace_id: z.string().describe('REQUIRED: Every thought must belong to a workspace. Workspaces are persistent organizational units (projects, topics, themes). Create or use existing workspace_id.'),
  session_id: z.string().optional().describe('OPTIONAL: Session ID within the workspace. Sessions are temporary work units within a workspace (e.g., "week-1-analysis", "initial-research"). If provided, must belong to the same workspace_id. Sessions help organize thoughts chronologically or by work phase.')
});

export const PatchThoughtSchema = z.object({}).passthrough();

// Search
export const SearchRequestSchema = z.object({
  query: z.string().optional(),
  vector_type: z.enum(['text','title','summary']).optional(),
  include_content: z.boolean().optional(),
  filters: z.any().optional(),
  boosts: z.any().optional(),
  diversity: z.any().optional(),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0)
});

// Relations
export const RelationPayloadSchema = z.object({
  related_id: z.string(),
  relation_type: z.enum(['supports','contradicts','followup','duplicate','related']).default('related'),
  weight: z.number().min(0).max(1).default(1.0),
  description: z.string().optional().describe('Optional explanation of why this relation exists. Use this to clarify the specific connection, reasoning, or context that links these thoughts. Examples: "Both articles discuss the same regulatory change", "Thought B provides evidence for Thought A\'s hypothesis", "Contradicts on timeline but agrees on impact".')
});

export const BatchLinkRelationSchema = z.object({
  related_id: z.string(),
  relation_type: z.enum(['supports','contradicts','followup','duplicate','related']).default('related'),
  weight: z.number().min(0).max(1).default(1.0),
  description: z.string().optional().describe('Optional explanation of why this relation exists. Use this to clarify the specific connection, reasoning, or context that links these thoughts. Examples: "Both articles discuss the same regulatory change", "Thought B provides evidence for Thought A\'s hypothesis", "Contradicts on timeline but agrees on impact".')
});

export const BatchLinkRequestSchema = z.object({
  relations: z.array(BatchLinkRelationSchema).min(1).max(100).describe('Array of relations to create (max 100)')
});

// Promote / Sync
export const PromoteRequestSchema = z.object({
  auto_mark: z.boolean().optional()
});

export const AriadneSyncRequestSchema = z.object({
  thought_id: z.string(),
  ariadne_fact_id: z.string().optional(),
  ariadne_entity_ids: z.array(z.string()).optional(),
  status: z.string().optional()
});

// Admin
export const ReembedRequestSchema = z.object({
  vectors: z.array(z.enum(['text','title'])).default(['text','title'])
});

export const ReindexRequestSchema = z.object({
  dry_run: z.boolean().default(true),
  filters: z.any().optional()
});

export const BulkIdsSchema = z.object({ ids: z.array(z.string()) });

// Check Duplicate
export const CheckDuplicateRequestSchema = z.object({
  title: z.string().optional(),
  summary: z.string().optional(),
  content: z.string().optional(),
  threshold: z.number().min(0).max(1).default(0.90)
});

// Quarantine
export const QuarantineRequestSchema = z.object({
  reason: z.string().optional()
});

// Explain Search
export const ExplainSearchRequestSchema = z.object({
  query: z.string(),
  filters: z.any().optional(),
  limit: z.number().int().min(1).max(200).optional()
});

// Merge Thoughts
export const MergeThoughtsRequestSchema = z.object({
  strategy: z.enum(['keep_target', 'merge_content', 'keep_source']).default('keep_target').optional()
});


