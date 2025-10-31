import { z } from 'zod';
import { callAriadne } from '../api-client.js';
import {
  CorrelationRequestSchema,
  CommunityRequestSchema
} from '../schemas.js';

export const correlationTool = {
  name: 'ar-learn-correlation',
  config: {
    title: 'Compute price correlations',
    description: 'Compute price correlations between symbols and store in graph (background task)',
    inputSchema: CorrelationRequestSchema.shape
  },
  handler: async (input: z.infer<typeof CorrelationRequestSchema>) => {
    const res = await callAriadne('/v1/kg/learn/correlation', {
      method: 'POST',
      body: JSON.stringify(input)
    }, 10000);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};

export const communityTool = {
  name: 'ar-learn-community',
  config: {
    title: 'Detect communities',
    description: 'Run Louvain community detection on company graph (background task)',
    inputSchema: CommunityRequestSchema.shape
  },
  handler: async () => {
    const res = await callAriadne('/v1/kg/learn/community', {
      method: 'POST'
    }, 10000);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};

