import { z } from 'zod';
import { callManifold } from '../api-client.js';

export const listSessionsTool = {
  name: 'mf-list-sessions',
  config: {
    title: 'List Sessions',
    description: 'List all sessions in the knowledge graph with counts and type distribution. Sessions are logical groupings of thoughts (e.g., analysis sessions, research periods). Returns session IDs, thought counts per session, type distributions, and metadata. Useful for understanding how thoughts are organized, finding specific sessions, or getting an overview of session-based structure. Use limit to control result size (default 100, max 10000).',
    inputSchema: z.object({ 
      limit: z.number().int().min(1).max(10000).default(100).describe('Maximum number of sessions to return. Default 100, max 10000.')
    }).shape
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
    description: 'Get all thoughts belonging to a specific session. **KRITISCH - TOKEN-KOSTEN**: Default limit=20, include_content=false (saves massive tokens!). Max limit=100. Each full thought object costs ~500-2000 tokens. Returns array of thought objects with metadata. Useful for analyzing session content, understanding what was discussed in a session. Use lower limits (10-20) to save tokens.',
    inputSchema: z.object({
      session_id: z.string().describe('Session ID to retrieve thoughts for.'),
      limit: z.number().int().min(1).max(100).default(20).describe('KRITISCH: Maximum thoughts to return. Default 20 (token-efficient), max 100. Each thought object costs ~500-2000 tokens! Use lower limits (10-20) to save tokens.'),
      include_content: z.boolean().default(false).describe('KRITISCH: If false (default): returns only metadata (title, summary, tags, tickers) without full content - MUCH more token-efficient! Set to true ONLY when you need full content. Default false saves massive tokens.')
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
    description: 'Get graph structure (nodes and edges) for all thoughts in a session. Returns arrays of nodes (thoughts) and edges (relations) with their types and weights. Useful for visualizing session knowledge structure, understanding relationships within a session, or exporting session graphs for analysis. More efficient than session-thoughts when you only need graph structure, not full content. Default limit 500 nodes, max 5000.',
    inputSchema: z.object({ 
      session_id: z.string().describe('Session ID to get graph for.'),
      limit: z.number().int().min(10).max(100).default(50).describe('KRITISCH: Maximum nodes to include. Default 50 (token-efficient), max 100. Each node costs tokens. Use lower limits (20-30) to save tokens.')
    }).shape
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
    description: 'Get the summary thought for a session (if exists). Summary thoughts have type="summary" and provide a high-level overview of the session\'s content, key findings, or conclusions. Returns the summary thought object with full metadata. Returns 404 if no summary exists for the session. Use upsert-session-summary to create or update a session summary.',
    inputSchema: z.object({ 
      session_id: z.string().describe('Session ID to get summary for.')
    }).shape
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
    description: 'Create or update the summary thought for a session. If a summary already exists, it will be updated. If not, a new summary thought (type="summary") will be created. Use this to maintain high-level summaries of sessions, capturing key findings, conclusions, or overviews. Title should be descriptive, summary should be 1-2 sentences, content can be more detailed. All fields are optional - only provided fields will be set/updated.',
    inputSchema: z.object({
      session_id: z.string().describe('Session ID to create/update summary for.'),
      title: z.string().optional().describe('Summary title (e.g., "Q3 2025 Market Analysis Summary").'),
      summary: z.string().optional().describe('1-2 sentence summary of session key findings.'),
      content: z.string().optional().describe('Detailed summary content with full context and conclusions.')
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


