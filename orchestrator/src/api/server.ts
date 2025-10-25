import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { OrchestrationDB } from '../db/database.js';
import { logger } from '../logger.js';

export function createApiServer(db: OrchestrationDB, port: number): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // GET /api/agents - List all agents with stats
  app.get('/api/agents', (req: Request, res: Response) => {
    try {
      const stats = db.getAgentStats();
      res.json({ agents: stats, timestamp: new Date().toISOString() });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch agent stats');
      res.status(500).json({ error: 'Failed to fetch agent stats' });
    }
  });

  // GET /api/runs - List runs with filters
  app.get('/api/runs', (req: Request, res: Response) => {
    try {
      const filters = {
        agent: req.query.agent as string,
        days: parseInt(req.query.days as string) || 7,
        status: req.query.status as string
      };
      const runs = db.getRuns(filters);
      res.json({ runs, count: runs.length, timestamp: new Date().toISOString() });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch runs');
      res.status(500).json({ error: 'Failed to fetch runs' });
    }
  });

  // GET /api/costs - Daily cost breakdown
  app.get('/api/costs', (req: Request, res: Response) => {
    try {
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const costs = db.getDailyCosts(date);
      res.json(costs);
    } catch (error) {
      logger.error({ error }, 'Failed to fetch costs');
      res.status(500).json({ error: 'Failed to fetch costs' });
    }
  });

  // GET /api/chat/:runId - Stream chat JSONL
  app.get('/api/chat/:runId', (req: Request, res: Response) => {
    try {
      const chatFile = db.getChatFile(req.params.runId);
      if (!chatFile || !fs.existsSync(chatFile)) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      res.setHeader('Content-Type', 'application/x-ndjson');
      res.setHeader('Transfer-Encoding', 'chunked');

      const stream = fs.createReadStream(chatFile, { encoding: 'utf-8' });
      stream.on('error', (err) => {
        logger.error({ error: err, runId: req.params.runId }, 'Error streaming chat');
        res.status(500).json({ error: 'Error streaming chat' });
      });

      stream.pipe(res);
    } catch (error) {
      logger.error({ error }, 'Failed to fetch chat');
      res.status(500).json({ error: 'Failed to fetch chat' });
    }
  });

  // Start server
  return app.listen(port, () => {
    logger.info({ port }, 'API server started');
  });
}
