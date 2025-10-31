import { z } from 'zod';
import { callManifold } from '../api-client.js';

export const listSessionsTool = {
  name: 'mf-list-sessions',
  config: {
    title: 'List Sessions',
    description: 'List all sessions with counts and type distribution.',
    inputSchema: z.object({ limit: z.number().int().min(1).max(10000).default(100) }).shape
  },
  handler: async (input: { limit?: number }) => {
    const params = new URLSearchParams();
    if (input.limit) params.append('limit', String(input.limit));
    const res = await callManifold(`/v1/memory/sessions?${params.toString()}`, {}, 10000);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
};

export const getSessionThoughtsTool = {
  name: 'mf-session-thoughts',
  config: {
    title: 'Session Thoughts',
    description: 'Get all thoughts in a given session.',
    inputSchema: z.object({
      session_id: z.string(),
      limit: z.number().int().min(1).max(5000).default(1000),
      include_content: z.boolean().optional()
    }).shape
  },
  handler: async (input: { session_id: string; limit?: number; include_content?: boolean }) => {
    const params = new URLSearchParams();
    if (input.limit) params.append('limit', String(input.limit));
    if (typeof input.include_content === 'boolean') params.append('include_content', String(input.include_content));
    const res = await callManifold(`/v1/memory/session/${encodeURIComponent(input.session_id)}/thoughts?${params.toString()}`, {}, 15000);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
};

export const getSessionGraphTool = {
  name: 'mf-session-graph',
  config: {
    title: 'Session Graph',
    description: 'Get nodes/edges graph for a session.',
    inputSchema: z.object({ session_id: z.string(), limit: z.number().int().min(10).max(5000).default(500) }).shape
  },
  handler: async (input: { session_id: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (input.limit) params.append('limit', String(input.limit));
    const res = await callManifold(`/v1/memory/session/${encodeURIComponent(input.session_id)}/graph?${params.toString()}`, {}, 20000);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
};

export const getSessionSummaryTool = {
  name: 'mf-session-summary',
  config: {
    title: 'Get Session Summary',
    description: 'Get the summary thought for a session (type="summary").',
    inputSchema: z.object({ session_id: z.string() }).shape
  },
  handler: async (input: { session_id: string }) => {
    const res = await callManifold(`/v1/memory/session/${encodeURIComponent(input.session_id)}/summary`, {}, 10000);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
};

export const upsertSessionSummaryTool = {
  name: 'mf-upsert-session-summary',
  config: {
    title: 'Upsert Session Summary',
    description: 'Create or update the session summary thought.',
    inputSchema: z.object({
      session_id: z.string(),
      title: z.string().optional(),
      summary: z.string().optional(),
      content: z.string().optional()
    }).shape
  },
  handler: async (input: { session_id: string; title?: string; summary?: string; content?: string }) => {
    const body: Record<string, any> = {};
    if (input.title !== undefined) body.title = input.title;
    if (input.summary !== undefined) body.summary = input.summary;
    if (input.content !== undefined) body.content = input.content;
    const res = await callManifold(`/v1/memory/session/${encodeURIComponent(input.session_id)}/summary`, { method: 'POST', body: JSON.stringify(body) }, 15000);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
};


