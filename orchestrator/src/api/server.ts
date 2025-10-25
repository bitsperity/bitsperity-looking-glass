import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { OrchestrationDB } from '../db/database.js';
import { logger } from '../logger.js';
import yaml from 'yaml';
import { z } from 'zod';

export interface ApiConfig {
  db: OrchestrationDB;
  configDir: string;
  onAgentReload?: () => Promise<void>;
  onRunAgent?: (agentName: string) => Promise<void>;
}

export function createApiServer(db: OrchestrationDB, port: number, config?: Partial<ApiConfig>): Promise<Express> {
  const app = express();
  const configDir = config?.configDir || path.join(process.cwd(), 'config');

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

  // GET /api/chat/:runId - Get full chat history from database
  app.get('/api/chat/:runId', (req: Request, res: Response) => {
    try {
      const chat = db.getChatForRun(req.params.runId);
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      res.json(chat);
    } catch (error) {
      logger.error({ error }, 'Failed to fetch chat');
      res.status(500).json({ error: 'Failed to fetch chat' });
    }
  });

  // GET /api/logs/agents - Get all agent stats
  app.get('/api/logs/agents', (req: Request, res: Response) => {
    try {
      const stats = db.getAllAgentStats();
      res.json({ agents: stats, timestamp: new Date().toISOString() });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch agent logs');
      res.status(500).json({ error: 'Failed to fetch agent logs' });
    }
  });

  // GET /api/logs/runs/:agent - Get runs for specific agent
  app.get('/api/logs/runs/:agent', (req: Request, res: Response) => {
    try {
      const runs = db.getAgentRuns(req.params.agent, 50);
      res.json({ runs, count: runs.length, timestamp: new Date().toISOString() });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch agent runs');
      res.status(500).json({ error: 'Failed to fetch agent runs' });
    }
  });

  // GET /api/config/agents - Read agents.yaml
  app.get('/api/config/agents', (req: Request, res: Response) => {
    try {
      const agentsPath = path.join(configDir, 'agents.yaml');
      const content = fs.readFileSync(agentsPath, 'utf-8');
      const parsed = yaml.parse(content);
      res.json({ content, parsed, path: agentsPath });
    } catch (error) {
      logger.error({ error, path: path.join(configDir, 'agents.yaml') }, 'Failed to read agents config');
      res.status(500).json({ error: 'Failed to read agents config' });
    }
  });

  // PUT /api/config/agents - Write agents.yaml with validation
  app.put('/api/config/agents', express.text({ type: 'text/yaml' }), (req: Request, res: Response) => {
    try {
      const yamlContent = req.body;
      
      // Validate YAML syntax
      let parsed;
      try {
        parsed = yaml.parse(yamlContent);
      } catch (yamlError: any) {
        return res.status(400).json({ error: 'Invalid YAML syntax', details: yamlError.message });
      }

      // Basic schema validation (agents, orchestrator, budget, mcps exist)
      if (!parsed.agents || !parsed.orchestrator || !parsed.budget || !parsed.mcps) {
        return res.status(400).json({ 
          error: 'Invalid agents config: missing required sections (agents, orchestrator, budget, mcps)' 
        });
      }

      // Validate agent shapes
      for (const [agentName, agentCfg] of Object.entries(parsed.agents)) {
        if (typeof agentCfg !== 'object' || agentCfg === null) {
          return res.status(400).json({ error: `Agent '${agentName}' must be an object` });
        }
        const cfg = agentCfg as any;
        if (!cfg.schedule || !cfg.model || cfg.budget_daily_tokens === undefined) {
          return res.status(400).json({ 
            error: `Agent '${agentName}' missing required: schedule, model, budget_daily_tokens` 
          });
        }
      }

      const agentsPath = path.join(configDir, 'agents.yaml');
      fs.writeFileSync(agentsPath, yamlContent, 'utf-8');

      logger.info({ path: agentsPath }, 'Agents config updated');
      res.json({ success: true, message: 'Agents config saved' });
    } catch (error) {
      logger.error({ error }, 'Failed to write agents config');
      res.status(500).json({ error: 'Failed to write agents config' });
    }
  });

  // GET /api/config/models - Read models.yaml
  app.get('/api/config/models', (req: Request, res: Response) => {
    try {
      const modelsPath = path.join(configDir, 'models.yaml');
      const content = fs.readFileSync(modelsPath, 'utf-8');
      const parsed = yaml.parse(content);
      res.json({ content, parsed, path: modelsPath });
    } catch (error) {
      logger.error({ error, path: path.join(configDir, 'models.yaml') }, 'Failed to read models config');
      res.status(500).json({ error: 'Failed to read models config' });
    }
  });

  // PUT /api/config/models - Write models.yaml with validation
  app.put('/api/config/models', express.text({ type: 'text/yaml' }), (req: Request, res: Response) => {
    try {
      const yamlContent = req.body;
      
      // Validate YAML syntax
      let parsed;
      try {
        parsed = yaml.parse(yamlContent);
      } catch (yamlError: any) {
        return res.status(400).json({ error: 'Invalid YAML syntax', details: yamlError.message });
      }

      // Basic schema validation
      if (!parsed.models || typeof parsed.models !== 'object') {
        return res.status(400).json({ error: 'Invalid models config: must contain "models" object' });
      }

      // Validate model shapes
      for (const [modelName, modelCfg] of Object.entries(parsed.models)) {
        if (typeof modelCfg !== 'object' || modelCfg === null) {
          return res.status(400).json({ error: `Model '${modelName}' must be an object` });
        }
        const cfg = modelCfg as any;
        if (!cfg.id || !cfg.provider || !cfg.pricing) {
          return res.status(400).json({ 
            error: `Model '${modelName}' missing required: id, provider, pricing` 
          });
        }
      }

      const modelsPath = path.join(configDir, 'models.yaml');
      fs.writeFileSync(modelsPath, yamlContent, 'utf-8');

      logger.info({ path: modelsPath }, 'Models config updated');
      res.json({ success: true, message: 'Models config saved' });
    } catch (error) {
      logger.error({ error }, 'Failed to write models config');
      res.status(500).json({ error: 'Failed to write models config' });
    }
  });

  // POST /api/agents/reload - Trigger live reload
  app.post('/api/agents/reload', async (req: Request, res: Response) => {
    try {
      if (config?.onAgentReload) {
        await config.onAgentReload();
        logger.info('Agents reloaded via API');
        res.json({ success: true, message: 'Agents reloaded successfully' });
      } else {
        res.status(501).json({ error: 'Agent reload not configured' });
      }
    } catch (error) {
      logger.error({ error }, 'Failed to reload agents');
      res.status(500).json({ error: 'Failed to reload agents' });
    }
  });

  // POST /api/agents/:agentName/run - Trigger agent run immediately
  app.post('/api/agents/:agentName/run', async (req: Request, res: Response) => {
    try {
      const agentName = req.params.agentName;
      if (config?.onRunAgent) {
        logger.info({ agent: agentName }, 'Manual agent trigger via API');
        await config.onRunAgent(agentName);
        res.json({ success: true, message: `Agent ${agentName} triggered` });
      } else {
        res.status(501).json({ error: 'Agent trigger not configured' });
      }
    } catch (error) {
      logger.error({ error }, 'Failed to trigger agent');
      res.status(500).json({ error: 'Failed to trigger agent' });
    }
  });

  // Start server
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      logger.info({ port }, 'API server started');
      resolve(server);
    });

    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        logger.warn({ port }, 'Port already in use, using different port');
        // Try port + 1
        const altServer = app.listen(port + 1, () => {
          logger.info({ port: port + 1 }, 'API server started on alternate port');
          resolve(altServer);
        });
        altServer.on('error', (altError) => {
          logger.error({ error: altError }, 'Failed to start API server');
          reject(altError);
        });
      } else {
        logger.error({ error }, 'Failed to start API server');
        reject(error);
      }
    });
  });
}
