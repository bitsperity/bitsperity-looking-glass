import { z } from 'zod';
import { callAriadne } from '../api-client.js';
import {
  CentralityRequestSchema,
  CommunitiesRequestSchema,
  SimilarityRequestSchema,
  LinkPredictionRequestSchema,
  ConfidencePropagateRequestSchema
} from '../schemas.js';

export const centralityTool = {
  name: 'ar-analytics-centrality',
  config: {
    title: 'Graph centrality analysis',
    description: 'Calculate centrality scores (PageRank, Betweenness, Closeness) for nodes',
    inputSchema: CentralityRequestSchema.shape
  },
  handler: async (input: z.infer<typeof CentralityRequestSchema>) => {
    const params = new URLSearchParams();
    if (input.algo) params.set('algo', input.algo);
    if (input.label) params.set('label', input.label);
    if (input.topk) params.set('topk', String(input.topk));
    const res = await callAriadne(`/v1/kg/analytics/centrality?${params.toString()}`);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};

export const communitiesTool = {
  name: 'ar-analytics-communities',
  config: {
    title: 'Community detection',
    description: 'Detect communities using Louvain or Leiden algorithms',
    inputSchema: CommunitiesRequestSchema.shape
  },
  handler: async (input: z.infer<typeof CommunitiesRequestSchema>) => {
    const params = new URLSearchParams();
    if (input.algo) params.set('algo', input.algo);
    if (input.label) params.set('label', input.label);
    const res = await callAriadne(`/v1/kg/analytics/communities?${params.toString()}`);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};

export const similarityTool = {
  name: 'ar-analytics-similarity',
  config: {
    title: 'Node similarity',
    description: 'Find similar nodes using GDS Node Similarity',
    inputSchema: SimilarityRequestSchema.shape
  },
  handler: async (input: z.infer<typeof SimilarityRequestSchema>) => {
    const params = new URLSearchParams();
    params.set('node_id', input.node_id);
    if (input.method) params.set('method', input.method);
    if (input.topk) params.set('topk', String(input.topk));
    const res = await callAriadne(`/v1/kg/analytics/similarity?${params.toString()}`);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};

export const linkPredictionTool = {
  name: 'ar-analytics-link-prediction',
  config: {
    title: 'Link prediction',
    description: 'Predict missing links using graph algorithms',
    inputSchema: LinkPredictionRequestSchema.shape
  },
  handler: async (input: z.infer<typeof LinkPredictionRequestSchema>) => {
    const params = new URLSearchParams();
    params.set('node_id', input.node_id);
    if (input.topk) params.set('topk', String(input.topk));
    const res = await callAriadne(`/v1/kg/analytics/link-prediction?${params.toString()}`);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};

export const confidencePropagateTool = {
  name: 'ar-analytics-confidence-propagate',
  config: {
    title: 'Confidence propagation',
    description: 'Calculate transitive confidence from source to target nodes',
    inputSchema: ConfidencePropagateRequestSchema.shape
  },
  handler: async (input: z.infer<typeof ConfidencePropagateRequestSchema>) => {
    const params = new URLSearchParams();
    if (input.from_ticker) params.set('from_ticker', input.from_ticker);
    if (input.from_id) params.set('from_id', input.from_id);
    if (input.to_label) params.set('to_label', input.to_label);
    if (input.max_depth) params.set('max_depth', String(input.max_depth));
    if (input.mode) params.set('mode', input.mode);
    if (input.min_confidence !== undefined) params.set('min_confidence', String(input.min_confidence));
    if (input.limit) params.set('limit', String(input.limit));
    const res = await callAriadne(`/v1/kg/analytics/confidence/propagate?${params.toString()}`);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};



