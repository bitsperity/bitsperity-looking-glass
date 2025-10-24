import { z } from 'zod';
import { callAriadne } from '../api-client.js';
import { UpdateNodeRequestSchema, UpdateEdgeRequestSchema, DeleteEdgeRequestSchema, CleanupOrphansRequestSchema } from '../schemas.js';

export const adminResetTool = {
  name: 'ar-admin-reset',
  config: {
    title: 'Reset graph (DANGER)',
    description: 'Delete ALL graph data (requires confirm=true)',
    inputSchema: z.object({ confirm: z.boolean().default(false) }).shape
  },
  handler: async (input: { confirm?: boolean }) => {
    const params = new URLSearchParams();
    if (input.confirm) params.set('confirm', 'true');
    const res = await callAriadne(`/v1/kg/admin/reset?${params.toString()}`, { method: 'POST' }, 20000);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};

export const adminStatsTool = {
  name: 'ar-admin-stats',
  config: {
    title: 'Admin stats',
    description: 'Get admin stats overview',
    inputSchema: z.object({}).shape
  },
  handler: async () => {
    const res = await callAriadne('/v1/kg/admin/stats');
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};

export const adminStatsDetailedTool = {
  name: 'ar-admin-stats-detailed',
  config: {
    title: 'Admin stats detailed',
    description: 'Get detailed admin stats',
    inputSchema: z.object({}).shape
  },
  handler: async () => {
    const res = await callAriadne('/v1/kg/admin/stats/detailed');
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};

export const adminUpdateNodeTool = {
  name: 'ar-admin-update-node',
  config: {
    title: 'Update node properties',
    description: 'PATCH node properties by elementId',
    inputSchema: UpdateNodeRequestSchema.shape
  },
  handler: async (input: z.infer<typeof UpdateNodeRequestSchema>) => {
    const res = await callAriadne('/v1/kg/admin/node', { method: 'PATCH', body: JSON.stringify(input) }, 15000);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};

export const adminUpdateEdgeTool = {
  name: 'ar-admin-update-edge',
  config: {
    title: 'Update edge properties',
    description: 'PATCH edge properties by endpoints + type',
    inputSchema: UpdateEdgeRequestSchema.shape
  },
  handler: async (input: z.infer<typeof UpdateEdgeRequestSchema>) => {
    const res = await callAriadne('/v1/kg/admin/edge', { method: 'PATCH', body: JSON.stringify(input) }, 15000);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};

export const adminDeleteNodeTool = {
  name: 'ar-admin-delete-node',
  config: {
    title: 'Delete node',
    description: 'DELETE node (optionally force) by elementId',
    inputSchema: z.object({ node_id: z.string(), force: z.boolean().default(false) }).shape
  },
  handler: async (input: { node_id: string; force?: boolean }) => {
    const params = new URLSearchParams();
    if (input.force) params.set('force', 'true');
    const res = await callAriadne(`/v1/kg/admin/node/${encodeURIComponent(input.node_id)}?${params.toString()}`, { method: 'DELETE' }, 15000);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};

export const adminDeleteEdgeTool = {
  name: 'ar-admin-delete-edge',
  config: {
    title: 'Delete edge',
    description: 'DELETE edge by endpoints + type, optional version',
    inputSchema: DeleteEdgeRequestSchema.shape
  },
  handler: async (input: z.infer<typeof DeleteEdgeRequestSchema>) => {
    const res = await callAriadne('/v1/kg/admin/edge', { method: 'DELETE', body: JSON.stringify(input) }, 15000);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};

export const adminRetractHypothesisTool = {
  name: 'ar-admin-retract-hypothesis',
  config: {
    title: 'Retract hypothesis',
    description: 'Retract/withdraw a hypothesis before validation',
    inputSchema: z.object({ hypothesis_id: z.string(), reasoning: z.string() }).shape
  },
  handler: async (input: { hypothesis_id: string; reasoning: string }) => {
    const params = new URLSearchParams();
    params.set('reasoning', input.reasoning);
    const res = await callAriadne(`/v1/kg/admin/hypothesis/${encodeURIComponent(input.hypothesis_id)}/retract?${params.toString()}`, { method: 'POST' }, 15000);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};

export const adminDeletePatternTool = {
  name: 'ar-admin-delete-pattern',
  config: {
    title: 'Delete pattern',
    description: 'Delete a pattern node by id',
    inputSchema: z.object({ pattern_id: z.string(), reasoning: z.string() }).shape
  },
  handler: async (input: { pattern_id: string; reasoning: string }) => {
    const params = new URLSearchParams();
    params.set('reasoning', input.reasoning);
    const res = await callAriadne(`/v1/kg/admin/pattern/${encodeURIComponent(input.pattern_id)}?${params.toString()}`, { method: 'DELETE' }, 15000);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};

export const adminCleanupOrphansTool = {
  name: 'ar-admin-cleanup-orphaned-nodes',
  config: {
    title: 'Cleanup orphaned nodes',
    description: 'Find/delete orphaned nodes (dry_run by default)',
    inputSchema: CleanupOrphansRequestSchema.shape
  },
  handler: async (input: z.infer<typeof CleanupOrphansRequestSchema>) => {
    const res = await callAriadne('/v1/kg/admin/cleanup/orphaned-nodes', { method: 'POST', body: JSON.stringify(input) }, 20000);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};


