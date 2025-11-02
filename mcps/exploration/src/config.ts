import { z } from 'zod';

const configSchema = z.object({
  JINA_API_KEY: z.string().optional(),
  JINA_API_URL: z.string().default('https://mcp.jina.ai/sse'),
  MEDIASTACK_API_KEY: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  SERVER_NAME: z.string().default('exploration-mcp'),
});

export const config = configSchema.parse(process.env);

