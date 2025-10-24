import { z } from 'zod';
import { callManifold } from '../api-client.js';
import { PromoteRequestSchema, AriadneSyncRequestSchema } from '../schemas.js';

export const promoteThoughtTool = {
  name: 'mf-promote-thought',
  config: {
    title: 'Promote Thought',
    description: 'Prepare thought for promotion to Ariadne KG.',
    inputSchema: z.object({ thought_id: z.string(), body: PromoteRequestSchema }).shape
  },
  handler: async (input: { thought_id: string; body: any }) => {
    const res = await callManifold(`/v1/memory/thought/${input.thought_id}/promote`, { method: 'POST', body: JSON.stringify(input.body) }, 15000);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
};

export const syncAriadneTool = {
  name: 'mf-sync-ariadne',
  config: {
    title: 'Sync Ariadne',
    description: 'Sync back Ariadne status and fact/entity IDs.',
    inputSchema: AriadneSyncRequestSchema.shape
  },
  handler: async (input: z.infer<typeof AriadneSyncRequestSchema>) => {
    const res = await callManifold('/v1/memory/sync/ariadne', { method: 'POST', body: JSON.stringify(input) }, 15000);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
};


