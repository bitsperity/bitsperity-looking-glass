// Ariadne Knowledge Graph Types

export interface Node {
  id: string;
  label: string;
  properties: Record<string, any>;
}

export interface Edge {
  source_id: string;
  target_id: string;
  rel_type: string;
  properties: Record<string, any>;
}

export interface Subgraph {
  nodes: Node[];
  edges: Edge[];
  summary?: string;
}

export interface Event {
  id: string;
  type: string;
  title: string;
  occurred_at: string;
  description?: string;
  source?: string;
  confidence: number;
}

export interface PriceEvent {
  id: string;
  symbol: string;
  event_type: string;
  occurred_at: string;
  properties: Record<string, any>;
  source: string;
  confidence: number;
}

export interface ContextResponse {
  query: string;
  subgraph: Subgraph;
  as_of?: string | null;
}

export interface ImpactResponse {
  event: Event;
  impacted_entities: {
    node: Node;
    impact: number;
    paths: number;
  }[];
}

export interface TimelineResponse {
  entity: Node;
  events: Event[];
  price_events: PriceEvent[];
  relations: Edge[];
}

export interface SimilarEntitiesResponse {
  source: Node;
  similar: {
    node: Node;
    similarity: number;
    shared_relations: number | null;
  }[];
}

export interface Pattern {
  id: string;
  name: string;
  description?: string;
  category: string;
  confidence: number;
  validated_at?: string;
  validated_by?: string;
  manifold_source_id?: string;
  occurrences: number;
  success_rate?: number;
}

export interface PatternOccurrence {
  event_id: string;
  title: string;
  occurred_at: string;
  outcome?: string;
}

export interface Regime {
  id: string;
  name: string;
  type: string;
  characteristics: string[];
  start_date: string;
  end_date?: string | null;
  confidence: number;
  similarity_score?: number;
  match_count?: number;
}

export interface Hypothesis {
  id: string;
  statement: string;
  source_entity_id: string;
  target_entity_id: string;
  relation_type: string;
  confidence: number;
  created_at: string;
  created_by: string;
  manifold_thought_id?: string;
  status: string;
  evidence_count: number;
  contradiction_count: number;
  validation_threshold: number;
}

export interface Evidence {
  id: string;
  source_id: string;
  source_type: string;
  source_name?: string;
  evidence_type: 'supporting' | 'contradicting';
  confidence: number;
  notes?: string;
  annotated_by?: string;
}

export interface HypothesisDetail {
  hypothesis: Hypothesis;
  supporting_evidence: Evidence[];
  contradictions: Evidence[];
}

export interface HealthResponse {
  status: string;
  service: string;
  neo4j_connected: boolean;
  node_count?: number | null;
  edge_count?: number | null;
}

export interface StatsResponse {
  status: string;
  total_nodes: number;
  total_edges: number;
  nodes_by_label: Record<string, number>;
  edges_by_type: Record<string, number>;
  last_updated: string;
}

export interface DetailedStatsResponse {
  status: string;
  node_stats: { label: string; count: number }[];
  edge_stats: { rel_type: string; count: number }[];
  temporal_coverage_pct: number;
  avg_confidence?: number | null;
  edges_with_confidence: number;
}

// Request Types
export interface FactRequest {
  source_label: string;
  source_id: string;
  target_label: string;
  target_id: string;
  rel_type: string;
  properties?: Record<string, any>;
  valid_from?: string;
  valid_to?: string | null;
  source: string;
  confidence: number;
  method?: string;
}

export interface ObservationRequest {
  date: string;
  content: string;
  tags: string[];
  related_tickers?: string[];
  related_events?: string[];
  confidence: number;
}

export interface HypothesisRequest {
  source_id: string;
  source_label: string;
  target_id: string;
  target_label: string;
  hypothesis: string;
  confidence: number;
  properties?: Record<string, any>;
}

export interface EvidenceRequest {
  hypothesis_id: string;
  evidence_type: 'supporting' | 'contradicting';
  evidence_source_id: string;
  evidence_source_type: string;
  confidence: number;
  notes?: string;
  annotated_by: string;
}

export interface ValidationRequest {
  hypothesis_id: string;
  decision: 'validate' | 'invalidate' | 'defer';
  reasoning: string;
  validated_by: string;
  create_pattern?: boolean;
}

export interface CorrelationRequest {
  symbols: string[];
  window: number;
  from_date?: string;
  to_date?: string;
  method: 'spearman' | 'pearson';
}

export interface NodeUpdateRequest {
  node_id: string;
  properties: Record<string, any>;
}

export interface EdgeUpdateRequest {
  source_id: string;
  target_id: string;
  rel_type: string;
  properties: Record<string, any>;
}

export interface EdgeDeleteRequest {
  source_id: string;
  target_id: string;
  rel_type: string;
  version?: number | null;
}

