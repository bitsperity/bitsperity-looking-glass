import type {
  ContextResponse,
  ImpactResponse,
  TimelineResponse,
  SimilarEntitiesResponse,
  Pattern,
  PatternOccurrence,
  Regime,
  Hypothesis,
  HypothesisDetail,
  HealthResponse,
  StatsResponse,
  DetailedStatsResponse,
  FactRequest,
  ObservationRequest,
  HypothesisRequest,
  EvidenceRequest,
  ValidationRequest,
  CorrelationRequest,
  NodeUpdateRequest,
  EdgeUpdateRequest,
  EdgeDeleteRequest,
} from '$lib/types/ariadne';

const ARIADNE_BASE = import.meta.env.VITE_ARIADNE_API_BASE || 'http://127.0.0.1:8082';

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`${ARIADNE_BASE}${path}`, init);
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`${resp.status} ${resp.statusText}: ${txt}`);
  }
  return (await resp.json()) as T;
}

// Health & Stats
export const getHealth = () => http<HealthResponse>(`/health`);
export const getStats = () => http<StatsResponse>(`/v1/kg/stats`);
export const getAdminStats = () => http<StatsResponse>(`/v1/kg/admin/stats`);
export const getDetailedStats = () => http<DetailedStatsResponse>(`/v1/kg/admin/stats/detailed`);

// Suggestions
export const getTickerSuggestions = () => http<{ status: string; tickers: string[]; count: number }>(`/v1/kg/suggestions/tickers`);
export const getTopicSuggestions = () => http<{ status: string; topics: string[]; count: number }>(`/v1/kg/suggestions/topics`);
export const getEventTypeSuggestions = () => http<{ status: string; event_types: string[]; count: number }>(`/v1/kg/suggestions/event-types`);
export const getSectorSuggestions = () => http<{ status: string; sectors: Array<{ sector: string; count: number }>; count: number }>(`/v1/kg/suggestions/sectors`);
export const getRelationTypeSuggestions = () => http<{ status: string; relation_types: string[]; count: number }>(`/v1/kg/suggestions/relation-types`);

// Read Endpoints
export const getContext = (params: {
  topic?: string;
  tickers?: string[];
  as_of?: string;
  depth?: number;
  limit?: number;
}) => {
  const q = new URLSearchParams();
  if (params.topic) q.set('topic', params.topic);
  if (params.tickers && params.tickers.length > 0) {
    params.tickers.forEach(t => q.append('tickers', t));
  }
  if (params.as_of) q.set('as_of', params.as_of);
  if (params.depth != null) q.set('depth', String(params.depth));
  if (params.limit != null) q.set('limit', String(params.limit));
  return http<ContextResponse>(`/v1/kg/context?${q.toString()}`);
};

export const getImpact = (params: {
  event_id?: string;
  event_query?: string;
  k?: number;
  as_of?: string;
}) => {
  const q = new URLSearchParams();
  if (params.event_id) q.set('event_id', params.event_id);
  if (params.event_query) q.set('event_query', params.event_query);
  if (params.k != null) q.set('k', String(params.k));
  if (params.as_of) q.set('as_of', params.as_of);
  return http<ImpactResponse>(`/v1/kg/impact?${q.toString()}`);
};

export const getTimeline = (params: {
  entity_id?: string;
  ticker?: string;
  from_date?: string;
  to_date?: string;
}) => {
  const q = new URLSearchParams();
  if (params.entity_id) q.set('entity_id', params.entity_id);
  if (params.ticker) q.set('ticker', params.ticker);
  if (params.from_date) q.set('from_date', params.from_date);
  if (params.to_date) q.set('to_date', params.to_date);
  return http<TimelineResponse>(`/v1/kg/timeline?${q.toString()}`);
};

export const getSimilarEntities = (params: {
  ticker: string;
  method?: string;
  limit?: number;
}) => {
  const q = new URLSearchParams();
  q.set('ticker', params.ticker);
  if (params.method) q.set('method', params.method);
  if (params.limit != null) q.set('limit', String(params.limit));
  return http<SimilarEntitiesResponse>(`/v1/kg/similar-entities?${q.toString()}`);
};

export const getPatterns = (params?: {
  category?: string;
  min_confidence?: number;
  min_occurrences?: number;
}) => {
  const q = new URLSearchParams();
  if (params?.category) q.set('category', params.category);
  if (params?.min_confidence != null) q.set('min_confidence', String(params.min_confidence));
  if (params?.min_occurrences != null) q.set('min_occurrences', String(params.min_occurrences));
  return http<{ status: string; count: number; patterns: Pattern[] }>(`/v1/kg/patterns?${q.toString()}`);
};

export const getPatternOccurrences = (pattern_id: string, params?: {
  from_date?: string;
  to_date?: string;
}) => {
  const q = new URLSearchParams();
  if (params?.from_date) q.set('from_date', params.from_date);
  if (params?.to_date) q.set('to_date', params.to_date);
  return http<{ pattern: Pattern; occurrences: PatternOccurrence[]; count: number }>(`/v1/kg/patterns/${pattern_id}/occurrences?${q.toString()}`);
};

export const getCurrentRegimes = () => 
  http<{ status: string; count: number; regimes: Regime[] }>(`/v1/kg/regimes/current`);

export const getSimilarRegimes = (params: { characteristics: string[]; limit?: number }) => {
  const q = new URLSearchParams();
  params.characteristics.forEach(c => q.append('characteristics', c));
  if (params.limit != null) q.set('limit', String(params.limit));
  return http<{ status: string; query_characteristics: string[]; count: number; regimes: Regime[] }>(`/v1/kg/regimes/similar?${q.toString()}`);
};

// Write Endpoints
export const postFact = (body: FactRequest) =>
  http<{ status: string; edge: any }>(`/v1/kg/fact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

export const postObservation = (body: ObservationRequest) =>
  http<{ status: string; observation_id: string; linked_entities: number }>(`/v1/kg/observation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

export const postHypothesis = (body: HypothesisRequest) =>
  http<{ status: string; hypothesis_id: string; manifold_thought_id?: string; evidence_count: number; contradiction_count: number; validation_pending: boolean }>(`/v1/kg/hypothesis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

// Validate Endpoints
export const addEvidence = (hypothesis_id: string, body: EvidenceRequest) =>
  http<{ status: string; hypothesis_id: string; evidence_count: number; contradiction_count: number; validation_pending: boolean }>(`/v1/kg/validate/hypothesis/${hypothesis_id}/evidence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

export const validateHypothesis = (hypothesis_id: string, body: ValidationRequest) =>
  http<{ status: string; hypothesis_id: string; manifold_thought_id?: string; decision: string; pattern_created: boolean; pattern_id?: string | null }>(`/v1/kg/validate/hypothesis/${hypothesis_id}/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

export const getPendingValidations = (min_annotations = 3) =>
  http<{ status: string; count: number; hypotheses: Hypothesis[] }>(`/v1/kg/validate/hypotheses/pending-validation?min_annotations=${min_annotations}`);

export const getHypothesisDetail = (hypothesis_id: string) =>
  http<HypothesisDetail>(`/v1/kg/validate/hypotheses/${hypothesis_id}`);

// Learn Endpoints
export const learnCorrelation = (body: CorrelationRequest) =>
  http<{ status: string; message: string; symbols: string[]; window: number; method: string }>(`/v1/kg/learn/correlation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

export const learnCommunity = () =>
  http<{ status: string; message: string }>(`/v1/kg/learn/community`, {
    method: 'POST',
  });

// Ingest Endpoints
export const ingestPrices = (params: { symbols?: string[]; from_date?: string; to_date?: string }) => {
  const q = new URLSearchParams();
  if (params.symbols && params.symbols.length > 0) {
    params.symbols.forEach(s => q.append('symbols', s));
  }
  if (params.from_date) q.set('from_date', params.from_date);
  if (params.to_date) q.set('to_date', params.to_date);
  return http<{ status: string; message: string; symbols: string[]; from: string; to: string }>(`/v1/kg/ingest/prices?${q.toString()}`, {
    method: 'POST',
  });
};

// Admin Endpoints
export const updateNode = (body: NodeUpdateRequest) =>
  http<{ status: string; node_id: string; updated_properties: string[] }>(`/v1/kg/admin/node`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

export const updateEdge = (body: EdgeUpdateRequest) =>
  http<{ status: string; source_id: string; target_id: string; rel_type: string; updated_properties: string[] }>(`/v1/kg/admin/edge`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

export const deleteNode = (node_id: string, force = false) =>
  http<{ status: string; node_id: string; edges_deleted: number }>(`/v1/kg/admin/node/${node_id}?force=${force}`, {
    method: 'DELETE',
  });

export const deleteEdge = (body: EdgeDeleteRequest) =>
  http<{ status: string; source_id: string; target_id: string; rel_type: string; deleted_count: number }>(`/v1/kg/admin/edge`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

export const retractHypothesis = (hypothesis_id: string, reasoning: string) =>
  http<{ status: string; hypothesis_id: string; reasoning: string }>(`/v1/kg/admin/hypothesis/${hypothesis_id}/retract?reasoning=${encodeURIComponent(reasoning)}`, {
    method: 'POST',
  });

export const deletePattern = (pattern_id: string, reasoning: string) =>
  http<{ status: string; pattern_id: string; reasoning: string }>(`/v1/kg/admin/pattern/${pattern_id}?reasoning=${encodeURIComponent(reasoning)}`, {
    method: 'DELETE',
  });

export const cleanupOrphanedNodes = (dry_run = true) =>
  http<{ status: string; orphaned_count: number; deleted: boolean; nodes: any[] }>(`/v1/kg/admin/cleanup/orphaned-nodes?dry_run=${dry_run}`, {
    method: 'POST',
  });

export const resetGraph = () =>
  http<{ status: string; message: string; deleted: { nodes: number; edges: number }; remaining: { nodes: number; edges: number } }>('/v1/kg/admin/reset?confirm=true', {
    method: 'POST',
  });

// Suggestion Endpoints
export const getEventNameSuggestions = () =>
  http<{ status: string; events: Array<{ name: string; type: string }>; count: number }>('/v1/kg/suggestions/event-names');

export const getCompanyNameSuggestions = () =>
  http<{ status: string; companies: Array<{ name: string; ticker: string; sector: string }>; count: number }>('/v1/kg/suggestions/company-names');

export const getPatternCategorySuggestions = () =>
  http<{ status: string; categories: string[]; count: number }>('/v1/kg/suggestions/pattern-categories');

export const getRegimeNameSuggestions = () =>
  http<{ status: string; regimes: string[]; count: number }>('/v1/kg/suggestions/regime-names');

