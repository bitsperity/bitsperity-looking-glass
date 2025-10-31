import { z } from 'zod';

const configSchema = z.object({
  COALESCENCE_API_URL: z.string().default('http://localhost:8084'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  SERVER_NAME: z.string().default('coalescence-mcp'),
});

export const config = configSchema.parse(process.env);

