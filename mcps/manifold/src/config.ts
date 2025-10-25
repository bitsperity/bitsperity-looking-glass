export const config = {
  SERVER_NAME: 'manifold-mcp',
  MANIFOLD_API_URL: process.env.MANIFOLD_API_URL || 'http://localhost:8083',
  HTTP_PORT: parseInt(process.env.HTTP_PORT || '3002', 10)
};


