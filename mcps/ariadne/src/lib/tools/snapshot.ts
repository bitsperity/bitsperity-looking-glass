import { z } from 'zod';
import { callAriadne } from '../api-client.js';
import { SnapshotDegreesRequestSchema } from '../schemas.js';

export const snapshotDegreesTool = {
  name: 'ar-admin-snapshot-degrees',
  config: {
    title: 'Snapshot node degrees',
    description: 'Create temporal snapshots for anomaly detection (updates degree_7d_ago property)',
    inputSchema: SnapshotDegreesRequestSchema.shape
  },
  handler: async (input: z.infer<typeof SnapshotDegreesRequestSchema>) => {
    const params = new URLSearchParams();
    if (input.label) params.set('label', input.label);
    const res = await callAriadne(`/v1/kg/admin/snapshot-degrees?${params.toString()}`, { method: 'POST' }, 15000);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};



