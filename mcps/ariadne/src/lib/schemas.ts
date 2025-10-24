import { z } from 'zod';

// Read / Analyse
export const ContextRequestSchema = z.object({
  topic: z.string().optional(),
  tickers: z.array(z.string()).optional(),
  as_of: z.string().optional(),
  depth: z.number().int().min(1).max(3).optional(),
  limit: z.number().int().min(1).max(1000).optional()
});

export const ImpactRequestSchema = z.object({
  event_id: z.string().optional(),
  event_query: z.string().optional(),
  k: z.number().int().min(1).max(100).optional(),
  as_of: z.string().optional()
});

export const TimelineRequestSchema = z.object({
  entity_id: z.string().optional(),
  ticker: z.string().optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional()
});

export const SimilarEntitiesRequestSchema = z.object({
  ticker: z.string(),
  method: z.enum(['weighted_jaccard','gds']).optional(),
  limit: z.number().int().min(1).max(100).optional()
});

export const PatternsSearchRequestSchema = z.object({
  category: z.string().optional(),
  min_confidence: z.number().min(0).max(1).optional(),
  min_occurrences: z.number().int().min(0).optional()
});

export const PatternOccurrencesRequestSchema = z.object({
  pattern_id: z.string(),
  from_date: z.string().optional(),
  to_date: z.string().optional()
});

export const RegimesSimilarRequestSchema = z.object({
  characteristics: z.array(z.string()),
  limit: z.number().int().min(1).max(50).optional()
});

// Write
export const FactRequestSchema = z.object({
  source_label: z.string(),
  source_id: z.union([z.string(), z.number()]),
  target_label: z.string(),
  target_id: z.union([z.string(), z.number()]),
  rel_type: z.string(),
  source: z.string().optional(),
  confidence: z.number().min(0).max(1).default(0.7),
  method: z.string().optional(),
  valid_from: z.string().optional(),
  valid_to: z.string().optional(),
  properties: z.record(z.any()).default({})
});

export const ObservationRequestSchema = z.object({
  date: z.string(),
  content: z.string(),
  tags: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.7),
  related_tickers: z.array(z.string()).default([]),
  related_events: z.array(z.union([z.string(), z.number()])).default([])
});

export const HypothesisRequestSchema = z.object({
  source_label: z.string(),
  source_id: z.string(),
  target_label: z.string(),
  target_id: z.string(),
  hypothesis: z.string(),
  confidence: z.number().min(0).max(1).default(0.5),
  properties: z.record(z.any()).default({})
});

// Validate
export const EvidenceRequestSchema = z.object({
  evidence_source_type: z.string(),
  evidence_source_id: z.string(),
  evidence_type: z.enum(['supporting','contradicting']).default('supporting'),
  confidence: z.number().min(0).max(1).default(0.7),
  notes: z.string().optional(),
  annotated_by: z.string().optional()
});

export const ValidationRequestSchema = z.object({
  decision: z.enum(['validate','invalidate','defer']),
  validated_by: z.string().default('agent'),
  reasoning: z.string().optional(),
  create_pattern: z.boolean().default(true)
});

// Admin
export const UpdateNodeRequestSchema = z.object({
  node_id: z.string(),
  properties: z.record(z.any())
});

export const UpdateEdgeRequestSchema = z.object({
  source_id: z.string(),
  target_id: z.string(),
  rel_type: z.string(),
  properties: z.record(z.any())
});

export const DeleteEdgeRequestSchema = z.object({
  source_id: z.string(),
  target_id: z.string(),
  rel_type: z.string(),
  version: z.number().int().optional()
});

export const CleanupOrphansRequestSchema = z.object({
  dry_run: z.boolean().default(true)
});


