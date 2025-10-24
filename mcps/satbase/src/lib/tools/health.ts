import { z } from 'zod';
import { callSatbase } from '../api-client.js';
import { HealthResponseSchema } from '../schemas.js';
import logger from '../../logger.js';

export const healthCheckTool = {
  name: 'health-check',
  config: {
    title: 'Health Check',
    description: 'Check Satbase API health and status.',
    inputSchema: z.object({}).shape
  },
  handler: async () => {
    logger.info({ tool: 'health-check' }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<z.infer<typeof HealthResponseSchema>>(
        '/health',
        {},
        5000 // Fast health check, 5 seconds
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'health-check', duration, status: result.status }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      logger.error({ tool: 'health-check', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};
