import { z } from 'zod';
import { callAriadne } from '../api-client.js';
import { EvidenceRequestSchema, ValidationRequestSchema } from '../schemas.js';

export const addEvidenceTool = {
  name: 'ar-add-evidence',
  config: {
    title: 'Add evidence to hypothesis',
    description: 'Annotate supporting or contradicting evidence',
    inputSchema: z.object({ hypothesis_id: z.string(), body: EvidenceRequestSchema }).shape
  },
  handler: async (input: { hypothesis_id: string; body: z.infer<typeof EvidenceRequestSchema> }) => {
    const res = await callAriadne(`/v1/kg/validate/hypothesis/${encodeURIComponent(input.hypothesis_id)}/evidence`, { method: 'POST', body: JSON.stringify(input.body) }, 15000);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};

export const validateHypothesisTool = {
  name: 'ar-validate-hypothesis',
  config: {
    title: 'Validate hypothesis',
    description: 'Final validation decision and optional pattern extraction',
    inputSchema: z.object({ hypothesis_id: z.string(), body: ValidationRequestSchema }).shape
  },
  handler: async (input: { hypothesis_id: string; body: z.infer<typeof ValidationRequestSchema> }) => {
    const res = await callAriadne(`/v1/kg/validate/hypothesis/${encodeURIComponent(input.hypothesis_id)}/validate`, { method: 'POST', body: JSON.stringify(input.body) }, 15000);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};

export const pendingValidationsTool = {
  name: 'ar-pending-validations',
  config: {
    title: 'Pending validations',
    description: 'List hypotheses that reached validation threshold',
    inputSchema: z.object({ min_annotations: z.number().int().min(1).default(3) }).shape
  },
  handler: async (input: { min_annotations?: number }) => {
    const params = new URLSearchParams();
    if (input.min_annotations) params.set('min_annotations', String(input.min_annotations));
    const res = await callAriadne(`/v1/kg/validate/hypotheses/pending-validation?${params.toString()}`);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};

export const getHypothesisTool = {
  name: 'ar-get-hypothesis',
  config: {
    title: 'Get hypothesis details',
    description: 'Get hypothesis with supporting and contradicting evidence',
    inputSchema: z.object({ hypothesis_id: z.string() }).shape
  },
  handler: async (input: { hypothesis_id: string }) => {
    const res = await callAriadne(`/v1/kg/validate/hypotheses/${encodeURIComponent(input.hypothesis_id)}`);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};


