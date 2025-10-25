export const config = {
  SERVER_NAME: process.env.SERVER_NAME || 'tesseract-mcp',
  TESSERACT_API_URL: process.env.TESSERACT_API_URL || 'http://localhost:8081',
  HTTP_PORT: parseInt(process.env.HTTP_PORT || '3004', 10),
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};
