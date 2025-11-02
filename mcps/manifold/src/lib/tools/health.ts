import { z } from 'zod';
import { callManifold } from '../api-client.js';
import { logger } from '../../logger.js';

export const getHealthTool = {
  name: 'mf-get-health',
  config: {
    title: 'Manifold Health',
    description: 'Check Manifold API health status and Qdrant vector database connection. Returns health status, database connectivity, and system availability. Use this to verify the Manifold service is operational before performing operations. Returns detailed status including API health, Qdrant connection status, and any warnings or errors.',
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
    description: 'Get Manifold API configuration including embedding model details, vector dimensions, and system settings. Returns vector dimensions for title, summary, and content embeddings, model information, and configuration parameters. Useful for understanding system capabilities, vector dimensions for custom queries, or verifying configuration.',
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
    description: 'Get device and GPU information for the embedding model. Returns device type (CPU/GPU), GPU model if available, memory information, and compute capabilities. Useful for monitoring system resources, understanding performance characteristics, or troubleshooting embedding issues.',
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


