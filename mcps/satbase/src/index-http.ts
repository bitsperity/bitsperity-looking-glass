import express from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer } from './lib/server-setup.js';
import { logger } from './logger.js';
import { config } from './config.js';

const app = express();
app.use(express.json());

app.post('/mcp', async (req, res) => {
  try {
    // Stateless mode: new transport per request to prevent ID collisions
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on('close', () => {
      transport.close();
    });

    const server = createMcpServer();
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    logger.error({ error }, 'Error handling MCP request');
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      });
    }
  }
});

const port = config.HTTP_PORT;
app.listen(port, () => {
  logger.info(`${config.SERVER_NAME} HTTP running on http://localhost:${port}/mcp`);
});
