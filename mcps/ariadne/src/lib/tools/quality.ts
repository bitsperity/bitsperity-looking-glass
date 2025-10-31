import { z } from 'zod';
import { callAriadne } from '../api-client.js';
import {
  GapsRequestSchema,
  AnomaliesRequestSchema,
  DuplicatesRequestSchema
} from '../schemas.js';

export const contradictionsTool = {
  name: 'ar-quality-contradictions',
  config: {
    title: 'Detect contradictions',
    description: 'Find contradictory statements in the knowledge graph (opposite effects, conflicting relations)',
    inputSchema: z.object({}).shape
  },
  handler: async () => {
    const res = await callAriadne('/v1/kg/quality/contradictions');
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};

export const gapsTool = {
  name: 'ar-quality-gaps',
  config: {
    title: 'Detect knowledge gaps',
    description: 'Find nodes with high connectivity but low-confidence relations (weak evidence)',
    inputSchema: GapsRequestSchema.shape
  },
  handler: async (input: z.infer<typeof GapsRequestSchema>) => {
    const params = new URLSearchParams();
    if (input.label) params.set('label', input.label);
    if (input.min_relations) params.set('min_relations', String(input.min_relations));
    if (input.low_confidence_threshold !== undefined) params.set('low_confidence_threshold', String(input.low_confidence_threshold));
    if (input.gap_threshold !== undefined) params.set('gap_threshold', String(input.gap_threshold));
    const res = await callAriadne(`/v1/kg/quality/gaps?${params.toString()}`);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};

export const anomaliesTool = {
  name: 'ar-quality-anomalies',
  config: {
    title: 'Detect anomalies',
    description: 'Find structural and temporal anomalies (statistical outliers, sudden degree changes)',
    inputSchema: AnomaliesRequestSchema.shape
  },
  handler: async (input: z.infer<typeof AnomaliesRequestSchema>) => {
    const params = new URLSearchParams();
    if (input.label) params.set('label', input.label);
    if (input.z_threshold !== undefined) params.set('z_threshold', String(input.z_threshold));
    if (input.growth_threshold !== undefined) params.set('growth_threshold', String(input.growth_threshold));
    const res = await callAriadne(`/v1/kg/quality/anomalies?${params.toString()}`);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};

export const duplicatesTool = {
  name: 'ar-quality-duplicates',
  config: {
    title: 'Detect duplicates',
    description: 'Find potential duplicate nodes using GDS similarity (detection only, manual review required)',
    inputSchema: DuplicatesRequestSchema.shape
  },
  handler: async (input: z.infer<typeof DuplicatesRequestSchema>) => {
    const params = new URLSearchParams();
    if (input.label) params.set('label', input.label);
    if (input.similarity_threshold !== undefined) params.set('similarity_threshold', String(input.similarity_threshold));
    if (input.limit) params.set('limit', String(input.limit));
    const res = await callAriadne(`/v1/kg/quality/duplicates?${params.toString()}`);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};



