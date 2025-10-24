import { z } from 'zod';
import { callAriadne } from '../api-client.js';

export const healthTool = {
  name: 'ar-health',
  config: {
    title: 'Ariadne Health',
    description: 'Health check for Ariadne API',
    inputSchema: z.object({}).shape
  },
  handler: async () => {
    const res = await callAriadne('/health', {}, 8000);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};

export const statsTool = {
  name: 'ar-stats',
  config: {
    title: 'Ariadne Stats',
    description: 'Get DB stats',
    inputSchema: z.object({ detailed: z.boolean().default(false) }).shape
  },
  handler: async (input: { detailed?: boolean }) => {
    const path = input?.detailed ? '/v1/kg/admin/stats/detailed' : '/v1/kg/stats';
    const res = await callAriadne(path, {}, 10000);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};


