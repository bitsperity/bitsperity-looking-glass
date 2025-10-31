import { z } from 'zod';
import { callAriadne } from '../api-client.js';
import {
  RiskRequestSchema,
  LineageRequestSchema,
  ImpactSimulationRequestSchema,
  OpportunitiesRequestSchema
} from '../schemas.js';

export const riskTool = {
  name: 'ar-decision-risk',
  config: {
    title: 'Risk score calculation',
    description: 'Calculate risk score for a company based on negative events, dependencies, and low-confidence relations',
    inputSchema: RiskRequestSchema.shape
  },
  handler: async (input: z.infer<typeof RiskRequestSchema>) => {
    const params = new URLSearchParams();
    params.set('ticker', input.ticker);
    if (input.include_centrality) params.set('include_centrality', 'true');
    const res = await callAriadne(`/v1/kg/decision/risk?${params.toString()}`);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};

export const lineageTool = {
  name: 'ar-decision-lineage',
  config: {
    title: 'Evidence lineage tracing',
    description: 'Trace evidence lineage: Company <- Hypothesis <- Observation <- News/Event',
    inputSchema: LineageRequestSchema.shape
  },
  handler: async (input: z.infer<typeof LineageRequestSchema>) => {
    const params = new URLSearchParams();
    params.set('ticker', input.ticker);
    if (input.max_depth) params.set('max_depth', String(input.max_depth));
    if (input.limit) params.set('limit', String(input.limit));
    const res = await callAriadne(`/v1/kg/decision/lineage?${params.toString()}`);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};

export const impactSimulationTool = {
  name: 'ar-decision-impact',
  config: {
    title: 'Impact simulation',
    description: 'Simulate impact of a node/event on other nodes through the graph with decay models',
    inputSchema: ImpactSimulationRequestSchema.shape
  },
  handler: async (input: z.infer<typeof ImpactSimulationRequestSchema>) => {
    const params = new URLSearchParams();
    if (input.ticker) params.set('ticker', input.ticker);
    if (input.node_id) params.set('node_id', input.node_id);
    if (input.max_depth) params.set('max_depth', String(input.max_depth));
    if (input.rel_filter) params.set('rel_filter', input.rel_filter);
    if (input.decay) params.set('decay', input.decay);
    if (input.min_confidence !== undefined) params.set('min_confidence', String(input.min_confidence));
    if (input.limit) params.set('limit', String(input.limit));
    const res = await callAriadne(`/v1/kg/decision/impact?${params.toString()}`);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};

export const opportunitiesTool = {
  name: 'ar-decision-opportunities',
  config: {
    title: 'Opportunity scoring',
    description: 'Score nodes by opportunity: combining gaps, centrality, and anomalies',
    inputSchema: OpportunitiesRequestSchema.shape
  },
  handler: async (input: z.infer<typeof OpportunitiesRequestSchema>) => {
    const params = new URLSearchParams();
    if (input.label) params.set('label', input.label);
    if (input.w_gap !== undefined) params.set('w_gap', String(input.w_gap));
    if (input.w_centrality !== undefined) params.set('w_centrality', String(input.w_centrality));
    if (input.w_anomaly !== undefined) params.set('w_anomaly', String(input.w_anomaly));
    if (input.limit) params.set('limit', String(input.limit));
    const res = await callAriadne(`/v1/kg/decision/opportunities?${params.toString()}`);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};



