import { z } from 'zod';
import { callAriadne } from '../api-client.js';
import {
  LearningFeedbackRequestSchema,
  LearningHistoryRequestSchema
} from '../schemas.js';

export const learningApplyFeedbackTool = {
  name: 'ar-learning-apply-feedback',
  config: {
    title: 'Apply learning feedback',
    description: 'Automatically adjust relationship confidences based on observation counts and temporal patterns',
    inputSchema: LearningFeedbackRequestSchema.shape
  },
  handler: async (input: z.infer<typeof LearningFeedbackRequestSchema>) => {
    const res = await callAriadne('/v1/kg/admin/learning/apply-feedback', { 
      method: 'POST', 
      body: JSON.stringify(input) 
    }, 30000);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};

export const learningHistoryTool = {
  name: 'ar-learning-history',
  config: {
    title: 'Get learning history',
    description: 'Retrieve confidence adjustment history for a specific relation (auditability)',
    inputSchema: LearningHistoryRequestSchema.shape
  },
  handler: async (input: z.infer<typeof LearningHistoryRequestSchema>) => {
    const params = new URLSearchParams();
    params.set('relation_id', input.relation_id);
    if (input.limit) params.set('limit', String(input.limit));
    const res = await callAriadne(`/v1/kg/admin/learning/history?${params.toString()}`);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};



