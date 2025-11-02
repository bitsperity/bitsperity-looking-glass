import { z } from 'zod';
import { callSatbase } from '../api-client.js';
import { HealthResponseSchema } from '../schemas.js';
import logger from '../../logger.js';

export const healthCheckTool = {
  name: 'health-check',
  config: {
    title: 'Health Check',
    description: 'Check Satbase API health status and system availability. Returns API status, database connectivity, external service connections (Mediastack, Alpaca, FRED), and overall system health. Use this to verify the Satbase service is operational before performing operations, diagnose connectivity issues, or monitor system health. Returns detailed status including component health (API, database, adapters).',
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
