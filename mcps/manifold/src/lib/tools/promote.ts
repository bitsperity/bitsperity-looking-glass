import { z } from 'zod';
import { callManifold } from '../api-client.js';
import { PromoteRequestSchema, AriadneSyncRequestSchema } from '../schemas.js';

export const promoteThoughtTool = {
  name: 'mf-promote-thought',
  config: {
    title: 'Promote Thought',
    description: 'Prepare a thought for promotion to the Ariadne Knowledge Graph. Marks the thought as ready for promotion and prepares it for integration with Ariadne. Used in workflows where high-quality thoughts are promoted from Manifold to the main knowledge graph. Returns promotion status and any preparation results. Use auto_mark option to automatically mark as promoted after preparation.',
    inputSchema: z.object({ 
      thought_id: z.string().describe('ID of the thought to promote.'),
      body: PromoteRequestSchema.describe('Promotion request. Use auto_mark=true to automatically mark as promoted after preparation.')
    }).shape
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
    description: 'Sync back Ariadne Knowledge Graph status and fact/entity IDs to a Manifold thought. After a thought is promoted to Ariadne, this updates the Manifold thought with the Ariadne fact_id and entity_ids, linking them together. Also updates promotion status. Essential for maintaining bidirectional links between Manifold and Ariadne knowledge graphs.',
    inputSchema: AriadneSyncRequestSchema.shape
  },
  handler: async (input: z.infer<typeof AriadneSyncRequestSchema>) => {
    const res = await callManifold('/v1/memory/sync/ariadne', { method: 'POST', body: JSON.stringify(input) }, 15000);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
};


