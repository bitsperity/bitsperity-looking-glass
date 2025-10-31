import { z } from 'zod';
import { callAriadne } from '../api-client.js';
import {
  DedupPlanRequestSchema,
  DedupExecuteRequestSchema
} from '../schemas.js';

export const dedupPlanTool = {
  name: 'ar-dedup-plan',
  config: {
    title: 'Generate deduplication plan',
    description: 'Find potential duplicates and show merge preview with property differences',
    inputSchema: DedupPlanRequestSchema.shape
  },
  handler: async (input: z.infer<typeof DedupPlanRequestSchema>) => {
    const params = new URLSearchParams();
    if (input.label) params.set('label', input.label);
    if (input.threshold !== undefined) params.set('threshold', String(input.threshold));
    if (input.limit) params.set('limit', String(input.limit));
    const res = await callAriadne(`/v1/kg/admin/deduplicate/plan?${params.toString()}`);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};

export const dedupExecuteTool = {
  name: 'ar-dedup-execute',
  config: {
    title: 'Execute deduplication merge',
    description: 'Safely merge two nodes with strategy selection (prefer_target, prefer_source, merge_all_properties)',
    inputSchema: DedupExecuteRequestSchema.shape
  },
  handler: async (input: z.infer<typeof DedupExecuteRequestSchema>) => {
    const res = await callAriadne('/v1/kg/admin/deduplicate/execute', { 
      method: 'POST', 
      body: JSON.stringify(input) 
    }, 20000);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};



