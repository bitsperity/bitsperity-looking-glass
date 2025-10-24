import { z } from 'zod';
import { callAriadne } from '../api-client.js';
import { FactRequestSchema, ObservationRequestSchema, HypothesisRequestSchema } from '../schemas.js';

export const addFactTool = {
  name: 'ar-add-fact',
  config: {
    title: 'Add fact',
    description: 'Create or update a fact edge with provenance',
    inputSchema: FactRequestSchema.shape
  },
  handler: async (input: z.infer<typeof FactRequestSchema>) => {
    const res = await callAriadne('/v1/kg/fact', { method: 'POST', body: JSON.stringify(input) }, 15000);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};

export const addObservationTool = {
  name: 'ar-add-observation',
  config: {
    title: 'Add observation',
    description: 'Create an observation and link to entities/events',
    inputSchema: ObservationRequestSchema.shape
  },
  handler: async (input: z.infer<typeof ObservationRequestSchema>) => {
    const res = await callAriadne('/v1/kg/observation', { method: 'POST', body: JSON.stringify(input) }, 15000);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};

export const addHypothesisTool = {
  name: 'ar-add-hypothesis',
  config: {
    title: 'Add hypothesis',
    description: 'Record a hypothesis between entities',
    inputSchema: HypothesisRequestSchema.shape
  },
  handler: async (input: z.infer<typeof HypothesisRequestSchema>) => {
    const res = await callAriadne('/v1/kg/hypothesis', { method: 'POST', body: JSON.stringify(input) }, 15000);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};


