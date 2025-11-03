import { z } from 'zod';
import { callManifold } from '../api-client.js';

export const listWorkspacesTool = {
  name: 'mf-list-workspaces',
  config: {
    title: 'List Workspaces',
    description: 'List all workspaces in the knowledge graph with counts and type distribution. Workspaces are persistent organizational units (like projects or research areas) that contain thoughts. Returns workspace IDs, thought counts per workspace, type distributions, and metadata. Useful for understanding workspace structure, finding specific workspaces, or getting overview of workspace organization. Use limit to control result size (default 100, max 10000).',
    inputSchema: z.object({ 
      limit: z.number().int().min(1).max(10000).default(100).describe('Maximum number of workspaces to return. Default 100, max 10000.')
    }).shape
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
    description: 'Get all thoughts belonging to a specific workspace. **KRITISCH - TOKEN-KOSTEN**: Default limit=20, include_content=false (saves massive tokens!). Max limit=100. Each full thought object costs ~500-2000 tokens. Workspaces are persistent organizational units, different from sessions which are temporary. Useful for analyzing workspace content, understanding what knowledge is in a workspace. Use lower limits (10-20) to save tokens.',
    inputSchema: z.object({
      workspace_id: z.string().describe('Workspace ID to retrieve thoughts for.'),
      limit: z.number().int().min(1).max(100).default(20).describe('KRITISCH: Maximum thoughts to return. Default 20 (token-efficient), max 100. Each thought object costs ~500-2000 tokens! Use lower limits (10-20) to save tokens.'),
      include_content: z.boolean().default(false).describe('KRITISCH: If false (default): returns only metadata (title, summary, tags, tickers) without full content - MUCH more token-efficient! Set to true ONLY when you need full content. Default false saves massive tokens.')
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

export const getWorkspaceSessionsTool = {
  name: 'mf-workspace-sessions',
  config: {
    title: 'Workspace Sessions',
    description: 'List all sessions within a workspace. **IMPORTANT**: Sessions live WITHIN workspaces. This tool returns only sessions that belong to the specified workspace. Sessions are temporary work units within workspaces (e.g., "week-1-analysis", "initial-research"). Returns session IDs, thought counts per session, type distributions, and metadata. Useful for understanding how thoughts are organized chronologically or by work phase within a workspace. Use limit to control result size (default 100, max 10000).',
    inputSchema: z.object({ 
      workspace_id: z.string().describe('Workspace ID to get sessions for. Returns only sessions within this workspace.'),
      limit: z.number().int().min(1).max(10000).default(100).describe('Maximum number of sessions to return. Default 100, max 10000.')
    }).shape
  },
  handler: async (input: { workspace_id: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (input.limit) params.append('limit', String(input.limit));
    const res = await callManifold(`/v1/memory/workspace/${encodeURIComponent(input.workspace_id)}/sessions?${params.toString()}`, {}, 10000);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
};

export const getWorkspaceGraphTool = {
  name: 'mf-workspace-graph',
  config: {
    title: 'Workspace Graph',
    description: 'Get graph structure (nodes and edges) for all thoughts in a workspace. Returns arrays of nodes (thoughts) and edges (relations) with their types and weights. Useful for visualizing workspace knowledge structure, understanding relationships within a workspace, or exporting workspace graphs for analysis. More efficient than workspace-thoughts when you only need graph structure, not full content. Default limit 500 nodes, max 5000.',
    inputSchema: z.object({ 
      workspace_id: z.string().describe('Workspace ID to get graph for.'),
      limit: z.number().int().min(10).max(100).default(50).describe('KRITISCH: Maximum nodes to include. Default 50 (token-efficient), max 100. Each node costs tokens. Use lower limits (20-30) to save tokens.')
    }).shape
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
    description: 'Get the summary thought for a workspace (if exists). Summary thoughts have type="summary" and provide a high-level overview of the workspace\'s content, key findings, or current state. Returns the summary thought object with full metadata. Returns 404 if no summary exists for the workspace. Use upsert-workspace-summary to create or update a workspace summary.',
    inputSchema: z.object({ 
      workspace_id: z.string().describe('Workspace ID to get summary for.')
    }).shape
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
    description: 'Create or update the summary thought for a workspace. If a summary already exists, it will be updated. If not, a new summary thought (type="summary") will be created. Use this to maintain high-level summaries of workspaces, capturing key findings, current state, or progress. Title should be descriptive, summary should be 1-2 sentences, content can be more detailed. All fields are optional - only provided fields will be set/updated.',
    inputSchema: z.object({
      workspace_id: z.string().describe('Workspace ID to create/update summary for.'),
      title: z.string().optional().describe('Summary title (e.g., "Energy Sector Research - Q4 2025 Status").'),
      summary: z.string().optional().describe('1-2 sentence summary of workspace key findings or current state.'),
      content: z.string().optional().describe('Detailed summary content with full context and current status.')
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




