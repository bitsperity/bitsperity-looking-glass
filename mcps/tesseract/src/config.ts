import { z } from 'zod';

const configSchema = z.object({
  PORT: z.coerce.number().default(9001),
  TESSERACT_API_URL: z.string().default('http://localhost:8081'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  SERVER_NAME: z.string().default('tesseract-mcp'),
});

export type Config = z.infer<typeof configSchema>;

export const config: Config = configSchema.parse({
  PORT: process.env.PORT,
  TESSERACT_API_URL: process.env.TESSERACT_API_URL,
  LOG_LEVEL: process.env.LOG_LEVEL,
  SERVER_NAME: process.env.SERVER_NAME,
});

