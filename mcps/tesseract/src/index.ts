import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { config } from './config.js';
import { logger } from './logger.js';

// Import all tools
import { searchTool } from './lib/tools/search.js';
import { similarTool } from './lib/tools/similar.js';
import { initCollectionTool } from './lib/tools/admin-init.js';
import { startBatchEmbeddingTool, getEmbeddingStatusTool } from './lib/tools/admin-embed.js';
import {
  listCollectionsTool,
  switchCollectionTool,
  deleteCollectionTool,
} from './lib/tools/admin-collections.js';

// Create MCP Server
const server = new McpServer({
  name: config.SERVER_NAME,
  version: '1.0.0',
});

// Register all tools
logger.info('Registering MCP tools...');

server.registerTool(searchTool.name, searchTool.config, searchTool.handler);
server.registerTool(similarTool.name, similarTool.config, similarTool.handler);
server.registerTool(initCollectionTool.name, initCollectionTool.config, initCollectionTool.handler);
server.registerTool(startBatchEmbeddingTool.name, startBatchEmbeddingTool.config, startBatchEmbeddingTool.handler);
server.registerTool(getEmbeddingStatusTool.name, getEmbeddingStatusTool.config, getEmbeddingStatusTool.handler);
server.registerTool(listCollectionsTool.name, listCollectionsTool.config, listCollectionsTool.handler);
server.registerTool(switchCollectionTool.name, switchCollectionTool.config, switchCollectionTool.handler);
server.registerTool(deleteCollectionTool.name, deleteCollectionTool.config, deleteCollectionTool.handler);

logger.info('8 tools registered successfully');

// Express setup
const app = express();
app.use(express.json());

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'tesseract-mcp',
    version: '1.0.0',
    tools: [
      'semantic-search',
      'find-similar-articles',
      'init-collection',
      'start-batch-embedding',
      'get-embedding-status',
      'list-collections',
      'switch-collection',
      'delete-collection',
    ],
  });
});

// MCP endpoint
app.post('/mcp', async (req, res) => {
  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // Stateless mode
      enableJsonResponse: true,
    });

    res.on('close', () => {
      transport.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    logger.error({ error }, 'MCP request handling failed');
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

// Start server
app.listen(config.PORT, () => {
  logger.info(
    {
      port: config.PORT,
      tesseractApiUrl: config.TESSERACT_API_URL,
      logLevel: config.LOG_LEVEL,
    },
    'Tesseract MCP Server running'
  );
  logger.info(`Health check: http://localhost:${config.PORT}/health`);
  logger.info(`MCP endpoint: http://localhost:${config.PORT}/mcp`);
  logger.info('Test with: npx @modelcontextprotocol/inspector');
});

