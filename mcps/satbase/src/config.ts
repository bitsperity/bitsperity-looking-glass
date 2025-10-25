import { z } from 'zod';

const configSchema = z.object({
  PORT: z.coerce.number().default(9004),
  HTTP_PORT: z.coerce.number().default(3001),
  SATBASE_API_URL: z.string().default('http://localhost:8080'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  SERVER_NAME: z.string().default('satbase-mcp'),
});

export const config = configSchema.parse(process.env);
