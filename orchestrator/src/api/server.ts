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

  // ============= HELPER FUNCTIONS FOR RULES PERSISTENCE =============

  async function loadRulesFromDisk(): Promise<void> {
    try {
      const rulesPath = path.join(configDir, 'rules.yaml');
      if (fs.existsSync(rulesPath)) {
        const rulesYaml = await fs.readFile(rulesPath, 'utf-8');
        const rulesData = yaml.parse(rulesYaml);
        if (rulesData?.rules && Array.isArray(rulesData.rules)) {
          for (const rule of rulesData.rules) {
            try {
              db.getRule(rule.id) || db.createRule(rule.id, rule.name, rule.content, rule.description);
            } catch (e) {
              // Rule might already exist
            }
          }
          logger.info({ count: rulesData.rules.length }, 'Rules loaded from disk');
        }
      }
    } catch (error) {
      logger.warn({ error }, 'Failed to load rules from disk');
    }
  }

  async function saveRulesToDisk(): Promise<void> {
    try {
      const rules = db.getAllRules();
      const rulesYaml = yaml.stringify({
        rules: rules.map(r => ({
          id: r.id,
          name: r.name,
          content: r.content,
          description: r.description,
          created_at: r.created_at,
          updated_at: r.updated_at
        }))
      });
      const rulesPath = path.join(configDir, 'rules.yaml');
      await fs.writeFile(rulesPath, rulesYaml, { encoding: 'utf-8' });
      logger.info({ path: rulesPath, count: rules.length }, 'Rules saved to disk');
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      logger.error({ error: errorMsg, stack: error?.stack }, 'Failed to save rules to disk');
    }
  }

  // Load rules from disk on startup
  loadRulesFromDisk().catch(e => logger.error({ error: e }, 'Failed to initialize rules'));

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
  app.put('/api/config/agents', express.text({ type: ['text/yaml', 'application/json'] }), (req: Request, res: Response) => {
    try {
      let yamlContent = req.body;
      
      // Check if input is JSON and convert to YAML
      if (req.get('content-type')?.includes('application/json') || yamlContent.startsWith('{')) {
        try {
          const jsonData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
          yamlContent = yaml.stringify(jsonData);
          logger.info('Converted JSON config to YAML');
        } catch (jsonError: any) {
          return res.status(400).json({ error: 'Invalid JSON syntax', details: jsonError.message });
        }
      }
      
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

  // GET /api/runs/:id - Detailed run with all data (unified endpoint)
  app.get('/api/runs/:id', (req: Request, res: Response) => {
    try {
      const runId = req.params.id;
      const chat = db.getChatHistoryComplete(runId);
      if (!chat) {
        return res.status(404).json({ error: 'Run not found' });
      }

      // Build complete run summary with all relevant data
      const runSummary = {
        meta: {
          runId: chat.runId,
          agent: chat.agent,
          model: chat.model,
          status: chat.status,
          createdAt: chat.createdAt,
          finishedAt: chat.finishedAt,
          durationSeconds: chat.durationSeconds || (chat.finishedAt ? 
            Math.round((new Date(chat.finishedAt).getTime() - new Date(chat.createdAt).getTime()) / 1000) 
            : undefined)
        },
        tokens: {
          input: chat.inputTokens,
          output: chat.outputTokens,
          total: chat.totalTokens
        },
        cost: {
          usd: parseFloat(chat.costUsd || '0'),
          currency: 'USD'
        },
        execution: {
          turnsCompleted: chat.turnsCompleted,
          turnsTotal: chat.turnsTotal,
          totalToolCalls: chat.turns.reduce((sum: number, t: any) => sum + (t.toolCalls?.length || 0), 0)
        },
        turns: chat.turns.map((turn: any) => ({
          number: turn.number,
          name: turn.name,
          model: turn.model,
          status: turn.status,
          duration: turn.duration,
          tokens: turn.tokens,
          cost: turn.cost,
          toolCalls: turn.toolCalls.map((tool: any, idx: number) => ({
            index: idx,
            name: tool.name,
            status: tool.status,
            error: tool.error,
            duration: { ms: tool.duration },
            args: tool.args ? (typeof tool.args === 'string' ? JSON.parse(tool.args) : tool.args) : null,
            result: tool.result ? (typeof tool.result === 'string' ? JSON.parse(tool.result) : tool.result) : null,
            timestamp: tool.timestamp
          })),
          messages: turn.messages.map((msg: any) => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp
          }))
        }))
      };

      res.json(runSummary);
    } catch (error) {
      logger.error({ error, runId: req.params.id }, 'Failed to fetch run details');
      res.status(500).json({ error: 'Failed to fetch run details' });
    }
  });

  // GET /api/runs/:id/tools/detailed - Detailed tool execution breakdown
  app.get('/api/runs/:id/tools/detailed', (req: Request, res: Response) => {
    try {
      const chat = db.getChatHistoryComplete(req.params.id);
      if (!chat) {
        return res.status(404).json({ error: 'Run not found' });
      }

      const toolBreakdown = {
        runId: chat.runId,
        totalTools: chat.turns.reduce((sum: number, t: any) => sum + (t.toolCalls?.length || 0), 0),
        byStatus: {
          success: 0,
          error: 0,
          pending: 0
        },
        byMcp: {} as Record<string, any>,
        timeline: [] as any[]
      };

      for (const turn of chat.turns) {
        for (const tool of turn.toolCalls || []) {
          // Count by status
          if (tool.status === 'success') toolBreakdown.byStatus.success++;
          else if (tool.status === 'error') toolBreakdown.byStatus.error++;
          else if (tool.status === 'pending') toolBreakdown.byStatus.pending++;

          // Extract MCP name (format: "mcp_tool-name")
          const [mcp, ...toolNameParts] = tool.tool_name.split('_');
          if (!toolBreakdown.byMcp[mcp]) {
            toolBreakdown.byMcp[mcp] = { count: 0, success: 0, error: 0, avgDuration: 0, totalDuration: 0 };
          }
          toolBreakdown.byMcp[mcp].count++;
          if (tool.status === 'success') toolBreakdown.byMcp[mcp].success++;
          else if (tool.status === 'error') toolBreakdown.byMcp[mcp].error++;
          toolBreakdown.byMcp[mcp].totalDuration += tool.duration_ms || 0;
          toolBreakdown.byMcp[mcp].avgDuration = Math.round(toolBreakdown.byMcp[mcp].totalDuration / toolBreakdown.byMcp[mcp].count);

          // Add to timeline
          toolBreakdown.timeline.push({
            turnNumber: turn.turnNumber,
            toolName: tool.tool_name,
            status: tool.status,
            duration: tool.duration_ms,
            timestamp: tool.created_at,
            error: tool.error || null,
            args: tool.tool_input ? JSON.parse(tool.tool_input) : null,
            resultSize: tool.tool_output ? Buffer.byteLength(tool.tool_output) : 0
          });
        }
      }

      res.json(toolBreakdown);
    } catch (error) {
      logger.error({ error }, 'Failed to fetch tool details');
      res.status(500).json({ error: 'Failed to fetch tool details' });
    }
  });

  // GET /api/stats/dashboard - Complete dashboard data
  app.get('/api/stats/dashboard', (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      
      const allStats = db.getAllAgentStats();
      const costBreakdown = db.getCostBreakdown(days);
      
      const totalStats = {
        agents: allStats.filter((a: any) => a.total_runs > 0).length,
        runs: costBreakdown.reduce((sum: number, item: any) => sum + (item.numRuns || 0), 0),
        tokens: costBreakdown.reduce((sum: number, item: any) => sum + (item.totalTokens || 0), 0),
        cost: parseFloat(costBreakdown.reduce((sum: number, item: any) => sum + (item.totalCost || 0), 0).toFixed(4))
      };

      const byAgent = {} as Record<string, any>;
      for (const agent of allStats) {
        if (agent.total_runs > 0) {
          byAgent[agent.name] = {
            runs: agent.total_runs,
            tokens: agent.total_tokens,
            cost: parseFloat(agent.total_cost_usd.toFixed(4)),
            lastRun: agent.last_run_at
          };
        }
      }

      res.json({
        timeframe: `${days} days`,
        total: totalStats,
        byAgent,
        byDate: costBreakdown.map((item: any) => ({
          date: item.date,
          runs: item.numRuns,
          tokens: item.totalTokens,
          cost: parseFloat(item.totalCost.toFixed(4)),
          byAgent: item
        }))
      });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch dashboard stats');
      res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
  });

  // ============= RULES API ENDPOINTS =============

  // GET /api/rules - List all rules
  app.get('/api/rules', (req: Request, res: Response) => {
    try {
      const rules = db.getAllRules();
      res.json({ rules, count: rules.length, timestamp: new Date().toISOString() });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch rules');
      res.status(500).json({ error: 'Failed to fetch rules' });
    }
  });

  // GET /api/rules/:id - Get single rule
  app.get('/api/rules/:id', (req: Request, res: Response) => {
    try {
      const rule = db.getRule(req.params.id);
      if (!rule) {
        return res.status(404).json({ error: 'Rule not found' });
      }
      res.json({ rule, timestamp: new Date().toISOString() });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch rule');
      res.status(500).json({ error: 'Failed to fetch rule' });
    }
  });

  // POST /api/rules - Create new rule
  app.post('/api/rules', async (req: Request, res: Response) => {
    try {
      const { name, content, description } = req.body;

      if (!name || !content) {
        return res.status(400).json({ error: 'name and content are required' });
      }

      // Check if rule already exists
      const existing = db.getRuleByName(name);
      if (existing) {
        return res.status(409).json({ error: 'Rule with this name already exists' });
      }

      const id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      db.createRule(id, name, content, description);
      await saveRulesToDisk();

      const rule = db.getRule(id);
      res.status(201).json({ rule, timestamp: new Date().toISOString() });
    } catch (error) {
      logger.error({ error }, 'Failed to create rule');
      res.status(500).json({ error: 'Failed to create rule' });
    }
  });

  // PUT /api/rules/:id - Update rule
  app.put('/api/rules/:id', async (req: Request, res: Response) => {
    try {
      const { name, content, description } = req.body;

      const rule = db.getRule(req.params.id);
      if (!rule) {
        return res.status(404).json({ error: 'Rule not found' });
      }

      db.updateRule(req.params.id, name, content, description);
      await saveRulesToDisk();

      const updated = db.getRule(req.params.id);
      res.json({ rule: updated, timestamp: new Date().toISOString() });
    } catch (error) {
      logger.error({ error }, 'Failed to update rule');
      res.status(500).json({ error: 'Failed to update rule' });
    }
  });

  // DELETE /api/rules/:id - Delete rule
  app.delete('/api/rules/:id', async (req: Request, res: Response) => {
    try {
      const rule = db.getRule(req.params.id);
      if (!rule) {
        return res.status(404).json({ error: 'Rule not found' });
      }

      db.deleteRule(req.params.id);
      await saveRulesToDisk();
      res.json({ message: 'Rule deleted', timestamp: new Date().toISOString() });
    } catch (error) {
      logger.error({ error }, 'Failed to delete rule');
      res.status(500).json({ error: 'Failed to delete rule' });
    }
  });

  // POST /api/turns/:turnId/rules - Set rules for a turn
  app.post('/api/turns/:turnId/rules', (req: Request, res: Response) => {
    try {
      const { ruleIds } = req.body;

      if (!Array.isArray(ruleIds)) {
        return res.status(400).json({ error: 'ruleIds must be an array' });
      }

      const turnId = parseInt(req.params.turnId);
      if (isNaN(turnId)) {
        return res.status(400).json({ error: 'Invalid turn ID' });
      }

      db.setTurnRules(turnId, ruleIds);
      const rules = db.getTurnRules(turnId);
      res.json({ rules, timestamp: new Date().toISOString() });
    } catch (error) {
      logger.error({ error }, 'Failed to set turn rules');
      res.status(500).json({ error: 'Failed to set turn rules' });
    }
  });

  // GET /api/turns/:turnId/rules - Get rules for a turn
  app.get('/api/turns/:turnId/rules', (req: Request, res: Response) => {
    try {
      const turnId = parseInt(req.params.turnId);
      if (isNaN(turnId)) {
        return res.status(400).json({ error: 'Invalid turn ID' });
      }

      const rules = db.getTurnRules(turnId);
      res.json({ rules, count: rules.length, timestamp: new Date().toISOString() });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch turn rules');
      res.status(500).json({ error: 'Failed to fetch turn rules' });
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
