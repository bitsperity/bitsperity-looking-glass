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

  // GET /api/runs/:id/chat - Complete chat history with prompts, responses, tools
  app.get('/api/runs/:id/chat', (req: Request, res: Response) => {
    try {
      const chat = db.getChatHistoryComplete(req.params.id);
      if (!chat) {
        return res.status(404).json({ error: 'Run not found' });
      }
      res.json(chat);
    } catch (error) {
      logger.error({ error }, 'Failed to fetch complete chat history');
      res.status(500).json({ error: 'Failed to fetch chat history' });
    }
  });

  // GET /api/runs/:id/tools - All tool calls with args and results
  app.get('/api/runs/:id/tools', (req: Request, res: Response) => {
    try {
      const chat = db.getChatHistoryComplete(req.params.id);
      if (!chat) {
        return res.status(404).json({ error: 'Run not found' });
      }

      const toolCalls = chat.turns.flatMap((turn: any, turnIdx: number) =>
        turn.toolCalls.map((tool: any, toolIdx: number) => ({
          turnNumber: turn.turnNumber,
          turnName: turn.turnName,
          toolIndex: toolIdx,
          toolName: tool.tool_name,
          input: tool.tool_input ? JSON.parse(tool.tool_input) : null,
          output: tool.tool_output ? JSON.parse(tool.tool_output) : null,
          durationMs: tool.duration_ms,
          status: tool.status,
          error: tool.error,
          createdAt: tool.created_at
        }))
      );

      res.json({
        runId: chat.runId,
        totalToolCalls: toolCalls.length,
        toolCalls
      });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch tool calls');
      res.status(500).json({ error: 'Failed to fetch tool calls' });
    }
  });

  // GET /api/stats/agent/:name - Agent statistics summary
  app.get('/api/stats/agent/:name', (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const stats = db.getAgentStatsSummary(req.params.name, days);
      res.json(stats);
    } catch (error) {
      logger.error({ error }, 'Failed to fetch agent stats');
      res.status(500).json({ error: 'Failed to fetch agent stats' });
    }
  });

  // GET /api/stats/costs - Cost breakdown by agent and date
  app.get('/api/stats/costs', (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const breakdown = db.getCostBreakdown(days);
      res.json({
        timeframe: `${days} days`,
        breakdown,
        totalCost: breakdown.reduce((sum: number, item: any) => sum + item.totalCost, 0),
        totalTokens: breakdown.reduce((sum: number, item: any) => sum + item.totalTokens, 0)
      });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch cost breakdown');
      res.status(500).json({ error: 'Failed to fetch cost breakdown' });
    }
  });

  // GET /api/stats/tokens - Token usage analytics
  app.get('/api/stats/tokens', (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const breakdown = db.getCostBreakdown(days);
      
      const tokenStats = {
        timeframe: `${days} days`,
        totalTokens: breakdown.reduce((sum: number, item: any) => sum + item.totalTokens, 0),
        byAgent: breakdown.reduce((acc: any, item: any) => {
          if (!acc[item.agent]) {
            acc[item.agent] = { tokens: 0, runs: 0, cost: 0 };
          }
          acc[item.agent].tokens += item.totalTokens;
          acc[item.agent].runs += item.numRuns;
          acc[item.agent].cost += item.totalCost;
          return acc;
        }, {}),
        byDate: breakdown
      };

      res.json(tokenStats);
    } catch (error) {
      logger.error({ error }, 'Failed to fetch token stats');
      res.status(500).json({ error: 'Failed to fetch token stats' });
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
