export const config = {
  ARIADNE_API_URL: process.env.ARIADNE_API_URL || 'http://127.0.0.1:8082',
  LOG_LEVEL: (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error'
,
  HTTP_PORT: parseInt(process.env.HTTP_PORT || '3003', 10)
,
  HTTP_PORT: parseInt(process.env.HTTP_PORT || '3003', 10)
};


