import { z } from 'zod';
import { callManifold } from '../api-client.js';
import { ThoughtEnvelopeSchema, PatchThoughtSchema } from '../schemas.js';
import { logger } from '../../logger.js';

export const createThoughtTool = {
  name: 'mf-create-thought',
  config: {
    title: 'Create Thought',
    description: 'Create a new thought (embeddings computed on server).',
    inputSchema: ThoughtEnvelopeSchema.shape
  },
  handler: async (input: z.infer<typeof ThoughtEnvelopeSchema>) => {
    logger.info({ tool: 'mf-create-thought', input: { type: input.type, title: input.title } }, 'Tool invoked');
    try {
      const res = await callManifold('/v1/memory/thought', { method: 'POST', body: JSON.stringify(input) }, 30000);
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
    }
  }
};

export const getThoughtTool = {
  name: 'mf-get-thought',
  config: {
    title: 'Get Thought',
    description: 'Load a thought by ID.',
    inputSchema: z.object({ id: z.string() }).shape
  },
  handler: async (input: { id: string }) => {
    try {
      const res = await callManifold(`/v1/memory/thought/${input.id}`, {}, 10000);
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
    }
  }
};

export const patchThoughtTool = {
  name: 'mf-patch-thought',
  config: {
    title: 'Patch Thought',
    description: 'Partial update of a thought (re-embed if title/content changed).',
    inputSchema: z.object({ id: z.string(), patch: PatchThoughtSchema }).shape
  },
  handler: async (input: { id: string; patch: any }) => {
    try {
      const res = await callManifold(`/v1/memory/thought/${input.id}`, { method: 'PATCH', body: JSON.stringify(input.patch) }, 20000);
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
    }
  }
};

export const deleteThoughtTool = {
  name: 'mf-delete-thought',
  config: {
    title: 'Delete Thought',
    description: 'Delete a thought (soft by default).',
    inputSchema: z.object({ id: z.string(), soft: z.boolean().default(true) }).shape
  },
  handler: async (input: { id: string; soft?: boolean }) => {
    try {
      const soft = input.soft === undefined ? true : input.soft;
      const res = await callManifold(`/v1/memory/thought/${input.id}?soft=${soft ? 'true' : 'false'}`, { method: 'DELETE' }, 10000);
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
    }
  }
};

export const getThoughtChildrenTool = {
  name: 'mf-get-thought-children',
  config: {
    title: 'Get Thought Children',
    description: 'Get all child thoughts (parent_id == thought_id), sorted by ordinal.',
    inputSchema: z.object({ id: z.string() }).shape
  },
  handler: async (input: { id: string }) => {
    try {
      const res = await callManifold(`/v1/memory/thought/${input.id}/children`, {}, 10000);
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
    }
  }
};


