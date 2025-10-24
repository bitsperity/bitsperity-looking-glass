import { z } from 'zod';
import { callManifold } from '../api-client.js';
import { logger } from '../../logger.js';

export const getHealthTool = {
  name: 'mf-get-health',
  config: {
    title: 'Manifold Health',
    description: 'Check Manifold API health and Qdrant connection.',
    inputSchema: z.object({}).shape
  },
  handler: async () => {
    logger.info({ tool: 'mf-get-health' }, 'Tool invoked');
    const start = performance.now();
    try {
      const res = await callManifold('/v1/memory/health', {}, 8000);
      logger.info({ tool: 'mf-get-health', duration: performance.now() - start }, 'Tool completed');
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
    }
  }
};

export const getConfigTool = {
  name: 'mf-get-config',
  config: {
    title: 'Manifold Config',
    description: 'Get Manifold configuration and vector dims.',
    inputSchema: z.object({}).shape
  },
  handler: async () => {
    try {
      const res = await callManifold('/v1/memory/config', {}, 8000);
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
    }
  }
};

export const getDeviceTool = {
  name: 'mf-get-device',
  config: {
    title: 'Manifold Device',
    description: 'Get device/GPU info for embedding model.',
    inputSchema: z.object({}).shape
  },
  handler: async () => {
    try {
      const res = await callManifold('/v1/memory/device', {}, 8000);
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
    }
  }
};


