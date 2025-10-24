import { z } from 'zod';
import { callSatbase } from '../api-client.js';
import {
  ListJobsRequestSchema,
  ListJobsResponseSchema,
  GetJobResponseSchema
} from '../schemas.js';
import logger from '../../logger.js';

export const listJobsTool = {
  name: 'list-jobs',
  config: {
    title: 'List Background Jobs',
    description: 'List background ingestion jobs with status and progress.',
    inputSchema: ListJobsRequestSchema.shape,
  },
  handler: async (input: z.infer<typeof ListJobsRequestSchema>) => {
    logger.info({ tool: 'list-jobs', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const params = new URLSearchParams({
        limit: input.limit.toString()
      });

      if (input.status) params.append('status', input.status);

      const result = await callSatbase<z.infer<typeof ListJobsResponseSchema>>(
        `/v1/jobs?${params.toString()}`,
        {},
        10000 // Fast query, 10 seconds timeout
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'list-jobs', duration, count: result.count }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'list-jobs', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const getJobTool = {
  name: 'get-job',
  config: {
    title: 'Get Job Details',
    description: 'Get detailed information about a specific ingestion job.',
    inputSchema: z.object({
      job_id: z.string().describe('Job ID to retrieve')
    }).shape,
  },
  handler: async (input: { job_id: string }) => {
    logger.info({ tool: 'get-job', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const result = await callSatbase<z.infer<typeof GetJobResponseSchema>>(
        `/v1/jobs/${input.job_id}`,
        {},
        10000
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'get-job', duration, status: result.status }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'get-job', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

