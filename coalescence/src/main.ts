import cron from 'node-cron';
import { config as dotenvConfig } from 'dotenv';
import yaml from 'yaml';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { TokenBudgetManager } from './token-budget.js';
import { runAgent } from './agent-runner.js';
import { logger } from './logger.js';
import { createApiServer } from './api/server.js';
import { OrchestrationDB } from './db/database.js';
import { ToolExecutor, type MCPConfig } from './tool-executor.js';
import type { AgentConfig } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from project root (not orchestrator directory)
dotenvConfig({ path: path.join(__dirname, '..', '..', '.env') });

// Global state for live reload
let currentCrons: Map<string, cron.ScheduledTask> = new Map();
let toolExecutor: ToolExecutor | null = null;
let budget: TokenBudgetManager | null = null;
let db: OrchestrationDB | null = null;
let agents: Map<string, AgentConfig> = new Map();  // Global agents map

const COALESCENCE_API_URL = process.env.COALESCENCE_API_URL || 'http://localhost:8084';

async function loadAgentsFromBackend(): Promise<Map<string, AgentConfig>> {
  logger.info({ apiUrl: COALESCENCE_API_URL }, 'Loading agents from backend API');
  
  try {
    const response = await fetch(`${COALESCENCE_API_URL}/v1/agents`);
    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status} - ${await response.text()}`);
    }
    
    const data = await response.json() as { agents: any[] };
    const agentsMap = new Map<string, AgentConfig>();
    
    for (const agentSummary of data.agents) {
      // Load full agent config
      const agentResponse = await fetch(`${COALESCENCE_API_URL}/v1/agents/${agentSummary.name}`);
      if (!agentResponse.ok) {
        logger.warn({ agent: agentSummary.name }, 'Failed to load agent config');
        continue;
      }
      
      const agentConfig = await agentResponse.json() as AgentConfig;
      agentsMap.set(agentSummary.name, agentConfig);
    }
    
    logger.info({ count: agentsMap.size }, 'Agents loaded from backend');
    return agentsMap;
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to load agents from backend');
    throw error;
  }
}

async function scheduleAgents(agents: Map<string, AgentConfig>, budgetConfig: { daily_tokens: number; monthly_budget_usd: number }): Promise<void> {
  logger.info('Scheduling agents...');

  // Stop and remove existing crons
  for (const [agentName, task] of currentCrons.entries()) {
    logger.info({ agent: agentName }, 'Stopping existing cron');
    task.stop();
  }
  currentCrons.clear();

  // Schedule each agent
  for (const [agentName, agentConfig] of agents.entries()) {
    if (!agentConfig.enabled) {
      logger.info({ agent: agentName }, 'Agent disabled, skipping');
      continue;
    }

    // Skip scheduling if manual schedule
    if (agentConfig.schedule === 'manual') {
      logger.info({ agent: agentName, schedule: 'manual' }, 'Agent on manual schedule, skipping automatic scheduling');
      continue;
    }

    logger.info(
      { agent: agentName, schedule: agentConfig.schedule },
      'Scheduling agent'
    );

    const task = cron.schedule(agentConfig.schedule, async () => {
      logger.info({ agent: agentName }, 'Starting agent run');
      try {
        if (!toolExecutor || !db) throw new Error('ToolExecutor or Database not initialized');
        
        // Set agent name in config for logging
        const configWithAgent = { ...agentConfig, agent: agentName };
        
        const result = await runAgent(configWithAgent, toolExecutor, db, budget);
        logger.info(
          {
            agent: agentName,
            runId: result.runId,
            tokens: result.totalTokens,
            cost: result.cost,
            status: result.status
          },
          'Agent run completed'
        );
      } catch (error) {
        logger.error({ agent: agentName, error }, 'Agent run failed');
      }
    });

    currentCrons.set(agentName, task);
  }

  const enabledAgents = Array.from(agents.entries()).filter(([_, cfg]) => cfg.enabled);
  logger.info(
    {
      totalScheduled: enabledAgents.length,
      schedules: enabledAgents.map(([name, cfg]) => `${name} @ ${cfg.schedule}`)
    },
    'Scheduler initialized'
  );
}

async function reloadAgentsCallback(budgetConfig: { daily_tokens: number; monthly_budget_usd: number }): Promise<void> {
  logger.info('Live reload triggered for agents configuration');

  try {
    const newAgents = await loadAgentsFromBackend();
    // Update global agents map so onRunAgent can access it
    agents = newAgents;
    await scheduleAgents(newAgents, budgetConfig);
    logger.info('Agents successfully reloaded');
  } catch (error) {
    logger.error({ error }, 'Failed to reload agents');
    throw error;
  }
}

async function main() {
  logger.info('Starting Orchestrator (Coalescence)...');

  try {
    // Load agents from backend API (no YAML anymore)
    agents = await loadAgentsFromBackend();

    // Load stdio MCP configuration for ToolExecutor
    const mcpConfigPath = path.join(__dirname, '..', 'config', 'mcps-stdio.yaml');
    const mcpConfigYaml = await fs.readFile(mcpConfigPath, 'utf-8');
    const mcpConfigData = yaml.parse(mcpConfigYaml);
    const mcpConfig: MCPConfig = mcpConfigData.mcps;

    logger.info(
      { agentCount: agents.size, mcpCount: Object.keys(mcpConfig).length },
      'Configuration loaded'
    );

    // Initialize database
    const dbPath = path.join(__dirname, '..', 'logs', 'orchestration.db');
    await fs.mkdir(path.dirname(dbPath), { recursive: true });
    db = new OrchestrationDB(dbPath);

    // Initialize ToolExecutor
    logger.info('Initializing ToolExecutor...');
    toolExecutor = new ToolExecutor(mcpConfig);
    await toolExecutor.loadTools();
    logger.info(
      { toolCount: toolExecutor.getToolCount() },
      'ToolExecutor initialized with tools loaded'
    );

    // Initialize budget manager (use defaults if not provided)
    const budgetConfig = {
      daily_tokens: parseInt(process.env.DAILY_TOKEN_BUDGET || '100000'),
      monthly_budget_usd: parseFloat(process.env.MONTHLY_BUDGET_USD || '100')
    };
    budget = new TokenBudgetManager(budgetConfig);

    // Start API server
    const apiPort = parseInt(process.env.API_PORT || '3100');
    const configDir = path.join(__dirname, '..', 'config');
    
    // Callback for manual agent triggering
    const onRunAgent = async (agentName: string) => {
      if (!toolExecutor || !db) throw new Error('ToolExecutor or Database not initialized');
      const agentConfig = agents.get(agentName);
      if (!agentConfig) throw new Error(`Agent ${agentName} not found`);
      
      logger.info({ agent: agentName }, 'Manual agent trigger started');
      try {
        const configWithAgent = { ...agentConfig, agent: agentName };
        const result = await runAgent(configWithAgent, toolExecutor, db, budget);
        logger.info({ agent: agentName, status: result.status, tokens: result.totalTokens, cost: result.cost }, 'Manual trigger completed');
      } catch (error) {
        logger.error({ agent: agentName, error }, 'Manual trigger failed');
        throw error;
      }
    };
    
    await createApiServer(db, apiPort, {
      configDir,
      toolExecutor,
      onAgentReload: () => reloadAgentsCallback(budgetConfig),
      onRunAgent
    });

    // Reset budget daily at midnight
    cron.schedule('0 0 * * *', () => {
      logger.info('Resetting daily token budget');
      budget?.resetDaily();
    });

    // Schedule initial agents
    await scheduleAgents(agents, budgetConfig);

    logger.info('Orchestrator (Coalescence) running. Press Ctrl+C to exit.');
  } catch (error) {
    logger.error(error, 'Orchestrator initialization failed');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  for (const task of currentCrons.values()) {
    task.stop();
  }
  db?.close();
  process.exit(0);
});

main().catch(error => {
  logger.error(error, 'Orchestrator fatal error');
  process.exit(1);
});
