export const config = {
  SERVER_NAME: process.env.SERVER_NAME || 'ariadne-mcp',
  ARIADNE_API_URL: process.env.ARIADNE_API_URL || 'http://127.0.0.1:8082',
  LOG_LEVEL: (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
  HTTP_PORT: parseInt(process.env.HTTP_PORT || '3003', 10)
};


