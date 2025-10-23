import * as api from '$lib/api/ariadne';
import type { Node } from '$lib/types/ariadne';

export async function fetchDashboard() {
  const [health, stats, pending] = await Promise.all([
    api.getHealth(),
    api.getAdminStats(),
    api.getPendingValidations(3),
  ]);
  return { health, stats, pending };
}

export async function searchEntities(params: {
  topic?: string;
  tickers?: string[];
  depth?: number;
  limit?: number;
}) {
  return api.getContext(params);
}

export async function fetchContext(params: {
  topic?: string;
  tickers?: string[];
  as_of?: string;
  depth?: number;
  limit?: number;
}) {
  return api.getContext(params);
}

export async function fetchTimeline(params: {
  entity_id?: string;
  ticker?: string;
  from_date?: string;
  to_date?: string;
}) {
  return api.getTimeline(params);
}

export async function fetchImpact(params: {
  event_id?: string;
  event_query?: string;
  k?: number;
  as_of?: string;
}) {
  return api.getImpact(params);
}

export async function fetchSimilar(params: {
  ticker: string;
  method?: string;
  limit?: number;
}) {
  return api.getSimilarEntities(params);
}

export async function fetchPatterns(params?: {
  category?: string;
  min_confidence?: number;
  min_occurrences?: number;
}) {
  return api.getPatterns(params);
}

export async function fetchPatternDetail(pattern_id: string, params?: {
  from_date?: string;
  to_date?: string;
}) {
  return api.getPatternOccurrences(pattern_id, params);
}

export async function fetchCurrentRegimes() {
  return api.getCurrentRegimes();
}

export async function fetchSimilarRegimes(params: {
  characteristics: string[];
  limit?: number;
}) {
  return api.getSimilarRegimes(params);
}

export async function fetchPendingHypotheses(min_annotations = 3) {
  return api.getPendingValidations(min_annotations);
}

export async function fetchHypothesisDetail(hypothesis_id: string) {
  return api.getHypothesisDetail(hypothesis_id);
}

export async function saveFact(body: {
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
}) {
  return api.postFact(body);
}

export async function saveObservation(body: {
  date: string;
  content: string;
  tags: string[];
  related_tickers?: string[];
  related_events?: string[];
  confidence: number;
}) {
  return api.postObservation(body);
}

export async function saveHypothesis(body: {
  source_id: string;
  source_label: string;
  target_id: string;
  target_label: string;
  hypothesis: string;
  confidence: number;
  properties?: Record<string, any>;
}) {
  return api.postHypothesis(body);
}

export async function addHypothesisEvidence(hypothesis_id: string, body: {
  hypothesis_id: string;
  evidence_type: 'supporting' | 'contradicting';
  evidence_source_id: string;
  evidence_source_type: string;
  confidence: number;
  notes?: string;
  annotated_by: string;
}) {
  return api.addEvidence(hypothesis_id, body);
}

export async function validateHypothesis(hypothesis_id: string, body: {
  hypothesis_id: string;
  decision: 'validate' | 'invalidate' | 'defer';
  reasoning: string;
  validated_by: string;
  create_pattern?: boolean;
}) {
  return api.validateHypothesis(hypothesis_id, body);
}

export async function startCorrelation(body: {
  symbols: string[];
  window: number;
  from_date?: string;
  to_date?: string;
  method: 'spearman' | 'pearson';
}) {
  return api.learnCorrelation(body);
}

export async function startCommunityDetection() {
  return api.learnCommunity();
}

export async function startPriceIngestion(params: {
  symbols?: string[];
  from_date?: string;
  to_date?: string;
}) {
  return api.ingestPrices(params);
}

export async function fetchDetailedStats() {
  return api.getDetailedStats();
}

export async function updateNode(body: { node_id: string; properties: Record<string, any> }) {
  return api.updateNode(body);
}

export async function updateEdge(body: {
  source_id: string;
  target_id: string;
  rel_type: string;
  properties: Record<string, any>;
}) {
  return api.updateEdge(body);
}

export async function deleteNode(node_id: string, force = false) {
  return api.deleteNode(node_id, force);
}

export async function deleteEdge(body: {
  source_id: string;
  target_id: string;
  rel_type: string;
  version?: number | null;
}) {
  return api.deleteEdge(body);
}

export async function retractHypothesis(hypothesis_id: string, reasoning: string) {
  return api.retractHypothesis(hypothesis_id, reasoning);
}

export async function deletePattern(pattern_id: string, reasoning: string) {
  return api.deletePattern(pattern_id, reasoning);
}

export async function cleanupOrphans(dry_run = true) {
  return api.cleanupOrphanedNodes(dry_run);
}

export async function resetGraph() {
  return api.resetGraph();
}

// Utility: Resolve ticker to elementId via context
export async function resolveTickerToId(ticker: string): Promise<string | null> {
  try {
    const result = await api.getContext({ tickers: [ticker], depth: 0, limit: 1 });
    const node = result.subgraph.nodes.find(
      (n: Node) => n.label === 'Company' && n.properties.ticker === ticker
    );
    return node ? node.id : null;
  } catch {
    return null;
  }
}

