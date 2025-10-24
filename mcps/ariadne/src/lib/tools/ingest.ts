import { z } from 'zod';
import { callAriadne } from '../api-client.js';

export const ingestPricesTool = {
  name: 'ar-ingest-prices',
  config: {
    title: 'Ingest prices (background)',
    description: 'Trigger price ingestion and event detection',
    inputSchema: z.object({
      symbols: z.array(z.string()).default([]),
      from_date: z.string().optional(),
      to_date: z.string().optional()
    }).shape
  },
  handler: async (input: { symbols?: string[]; from_date?: string; to_date?: string }) => {
    const params = new URLSearchParams();
    (input.symbols || []).forEach((s) => params.append('symbols', s));
    if (input.from_date) params.set('from_date', input.from_date);
    if (input.to_date) params.set('to_date', input.to_date);
    const res = await callAriadne(`/v1/kg/ingest/prices?${params.toString()}`, { method: 'POST' }, 10000);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};


