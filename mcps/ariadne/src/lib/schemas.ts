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

export const SearchRequestSchema = z.object({
  text: z.string().min(1),
  labels: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(10)
});

export const PathRequestSchema = z.object({
  from_id: z.string(),
  to_id: z.string(),
  max_hops: z.number().int().min(1).max(20).default(5),
  algo: z.enum(['shortest', 'ksp']).default('shortest')
});

export const TimeSliceRequestSchema = z.object({
  as_of: z.string(),
  topic: z.string().optional(),
  tickers: z.string().optional(),
  limit: z.number().int().min(1).max(1000).default(100)
});

export const CorrelationRequestSchema = z.object({
  symbols: z.array(z.string()).min(2),
  window: z.number().int().min(1).default(30),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  method: z.enum(['pearson', 'spearman']).default('spearman')
});

export const CommunityRequestSchema = z.object({});

// Write
export const FactRequestSchema = z.object({
  source_label: z.string(),
  source_id: z.string(),
  target_label: z.string(),
  target_id: z.string(),
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
  related_events: z.array(z.string()).default([])
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

// Analytics
export const CentralityRequestSchema = z.object({
  algo: z.enum(['pagerank', 'betweenness', 'closeness']).default('pagerank'),
  label: z.string().optional(),
  topk: z.number().int().min(1).max(100).default(10)
});

export const CommunitiesRequestSchema = z.object({
  algo: z.enum(['louvain', 'leiden']).default('louvain'),
  label: z.string().optional()
});

export const SimilarityRequestSchema = z.object({
  node_id: z.string(),
  method: z.enum(['gds', 'weighted']).default('gds'),
  topk: z.number().int().min(1).max(50).default(10)
});

export const LinkPredictionRequestSchema = z.object({
  node_id: z.string(),
  topk: z.number().int().min(1).max(50).default(10)
});

export const ConfidencePropagateRequestSchema = z.object({
  from_ticker: z.string().optional(),
  from_id: z.string().optional(),
  to_label: z.string().default('Company'),
  max_depth: z.number().int().min(1).max(10).default(5),
  mode: z.enum(['product', 'min', 'avg']).default('product'),
  min_confidence: z.number().min(0).max(1).default(0),
  limit: z.number().int().min(1).max(100).default(20)
});

// Decision
export const RiskRequestSchema = z.object({
  ticker: z.string(),
  include_centrality: z.boolean().default(false)
});

export const LineageRequestSchema = z.object({
  ticker: z.string(),
  max_depth: z.number().int().min(1).max(10).default(5),
  limit: z.number().int().min(1).max(100).default(20)
});

export const ImpactSimulationRequestSchema = z.object({
  ticker: z.string().optional(),
  node_id: z.string().optional(),
  max_depth: z.number().int().min(1).max(5).default(3),
  rel_filter: z.string().optional(),
  decay: z.enum(['linear', 'exponential']).default('exponential'),
  min_confidence: z.number().min(0).max(1).default(0),
  limit: z.number().int().min(1).max(100).default(20)
});

export const OpportunitiesRequestSchema = z.object({
  label: z.string().default('Company'),
  w_gap: z.number().min(0).max(1).default(0.3),
  w_centrality: z.number().min(0).max(1).default(0.4),
  w_anomaly: z.number().min(0).max(1).default(0.3),
  limit: z.number().int().min(1).max(50).default(15)
});

// Quality
export const GapsRequestSchema = z.object({
  label: z.string().default('Company'),
  min_relations: z.number().int().min(1).default(10),
  low_confidence_threshold: z.number().min(0).max(1).default(0.5),
  gap_threshold: z.number().min(0).max(1).default(0.5)
});

export const AnomaliesRequestSchema = z.object({
  label: z.string().default('Company'),
  z_threshold: z.number().min(1).default(2.5),
  growth_threshold: z.number().min(0).max(1).default(0.3)
});

export const DuplicatesRequestSchema = z.object({
  label: z.string().default('Company'),
  similarity_threshold: z.number().min(0).max(1).default(0.85),
  limit: z.number().int().min(1).max(100).default(20)
});

// Dedup Admin
export const DedupPlanRequestSchema = z.object({
  label: z.string().default('Company'),
  threshold: z.number().min(0).max(1).default(0.85),
  limit: z.number().int().min(1).max(100).default(20)
});

export const DedupExecuteRequestSchema = z.object({
  source_id: z.string(),
  target_id: z.string(),
  strategy: z.enum(['prefer_target', 'prefer_source', 'merge_all_properties']).default('prefer_target'),
  dry_run: z.boolean().default(true)
});

// Learning Admin
export const LearningFeedbackRequestSchema = z.object({
  label: z.string().default('Company'),
  window_days: z.number().int().min(1).max(365).default(30),
  max_adjust: z.number().default(0.2),
  step: z.number().default(0.05),
  dry_run: z.boolean().default(true)
});

export const LearningHistoryRequestSchema = z.object({
  relation_id: z.string(),
  limit: z.number().int().min(1).max(50).default(10)
});

// Admin Snapshot
export const SnapshotDegreesRequestSchema = z.object({
  label: z.string().default('Company')
});


