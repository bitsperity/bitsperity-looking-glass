import { z } from 'zod';
import { callManifold } from '../api-client.js';

export const listWorkspacesTool = {
  name: 'mf-list-workspaces',
  config: {
    title: 'List Workspaces',
    description: 'List all workspaces with counts and type distribution.',
    inputSchema: z.object({ limit: z.number().int().min(1).max(10000).default(100) }).shape
  },
  handler: async (input: { limit?: number }) => {
    const params = new URLSearchParams();
    if (input.limit) params.append('limit', String(input.limit));
    const res = await callManifold(`/v1/memory/workspaces?${params.toString()}`, {}, 10000);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
};

export const getWorkspaceThoughtsTool = {
  name: 'mf-workspace-thoughts',
  config: {
    title: 'Workspace Thoughts',
    description: 'Get all thoughts in a given workspace.',
    inputSchema: z.object({
      workspace_id: z.string(),
      limit: z.number().int().min(1).max(5000).default(1000),
      include_content: z.boolean().optional()
    }).shape
  },
  handler: async (input: { workspace_id: string; limit?: number; include_content?: boolean }) => {
    const params = new URLSearchParams();
    if (input.limit) params.append('limit', String(input.limit));
    if (typeof input.include_content === 'boolean') params.append('include_content', String(input.include_content));
    const res = await callManifold(`/v1/memory/workspace/${encodeURIComponent(input.workspace_id)}/thoughts?${params.toString()}`, {}, 15000);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
};

export const getWorkspaceGraphTool = {
  name: 'mf-workspace-graph',
  config: {
    title: 'Workspace Graph',
    description: 'Get nodes/edges graph for a workspace.',
    inputSchema: z.object({ workspace_id: z.string(), limit: z.number().int().min(10).max(5000).default(500) }).shape
  },
  handler: async (input: { workspace_id: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (input.limit) params.append('limit', String(input.limit));
    const res = await callManifold(`/v1/memory/workspace/${encodeURIComponent(input.workspace_id)}/graph?${params.toString()}`, {}, 20000);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
};

export const getWorkspaceSummaryTool = {
  name: 'mf-workspace-summary',
  config: {
    title: 'Get Workspace Summary',
    description: 'Get the summary thought for a workspace (type="summary").',
    inputSchema: z.object({ workspace_id: z.string() }).shape
  },
  handler: async (input: { workspace_id: string }) => {
    const res = await callManifold(`/v1/memory/workspace/${encodeURIComponent(input.workspace_id)}/summary`, {}, 10000);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
};

export const upsertWorkspaceSummaryTool = {
  name: 'mf-upsert-workspace-summary',
  config: {
    title: 'Upsert Workspace Summary',
    description: 'Create or update the workspace summary thought.',
    inputSchema: z.object({
      workspace_id: z.string(),
      title: z.string().optional(),
      summary: z.string().optional(),
      content: z.string().optional()
    }).shape
  },
  handler: async (input: { workspace_id: string; title?: string; summary?: string; content?: string }) => {
    const body: Record<string, any> = {};
    if (input.title !== undefined) body.title = input.title;
    if (input.summary !== undefined) body.summary = input.summary;
    if (input.content !== undefined) body.content = input.content;
    const res = await callManifold(`/v1/memory/workspace/${encodeURIComponent(input.workspace_id)}/summary`, { method: 'POST', body: JSON.stringify(body) }, 15000);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
};

