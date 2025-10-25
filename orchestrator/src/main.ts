import cron from 'node-cron';
import { config as dotenvConfig } from 'dotenv';
import yaml from 'yaml';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { MCPPool } from './mcp-pool.js';
import { TokenBudgetManager } from './token-budget.js';
import { runAgent } from './agent-runner.js';
import { logger } from './logger.js';
import { createApiServer } from './api/server.js';
import { OrchestrationDB } from './db/database.js';
import { ConfigWatcher } from './config-watcher.js';
import type { AgentsConfig } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from project root (not orchestrator directory)
dotenvConfig({ path: path.join(__dirname, '..', '..', '.env') });

// Global state for live reload
let currentCrons: Map<string, cron.ScheduledTask> = new Map();
let mcpPool: MCPPool | null = null;
let budget: TokenBudgetManager | null = null;
let db: OrchestrationDB | null = null;

async function scheduleAgents(config: AgentsConfig): Promise<void> {
  logger.info('Scheduling agents...');

  // Stop and remove existing crons
  for (const [agentName, task] of currentCrons.entries()) {
    logger.info({ agent: agentName }, 'Stopping existing cron');
    task.stop();
  }
  currentCrons.clear();

  // Schedule each agent
  for (const [agentName, agentConfig] of Object.entries(config.agents)) {
    if (!agentConfig.enabled) {
      logger.info({ agent: agentName }, 'Agent disabled, skipping');
      continue;
    }

    logger.info(
      { agent: agentName, schedule: agentConfig.schedule, batch: agentConfig.batch },
      'Scheduling agent'
    );

    const task = cron.schedule(agentConfig.schedule, async () => {
      logger.info({ agent: agentName, batch: agentConfig.batch }, 'Starting agent run');
      try {
        if (!mcpPool || !budget) throw new Error('MCP Pool or Budget not initialized');
        const result = await runAgent(agentName, agentConfig, mcpPool, budget);
        logger.info(
          {
            agent: agentName,
            tokens: result.tokens,
            duration: result.duration_seconds,
            status: result.status
          },
          'Agent run completed'
        );
      } catch (error) {
        logger.error(error, 'Agent run failed');
      }
    });

    currentCrons.set(agentName, task);
  }

  const enabledAgents = Object.entries(config.agents).filter(([_, cfg]) => cfg.enabled);
  logger.info(
    {
      totalScheduled: enabledAgents.length,
      schedules: enabledAgents.map(([name, cfg]) => `${name} @ ${cfg.schedule}`)
    },
    'Scheduler initialized'
  );
}

async function reloadAgentsCallback(): Promise<void> {
  logger.info('Live reload triggered for agents configuration');

  try {
    const configPath = process.env.ORCHESTRATOR_TEST_CONFIG || path.join(__dirname, '..', 'config', 'agents.yaml');
    const configYaml = await fs.readFile(configPath, 'utf-8');
    const config: AgentsConfig = yaml.parse(configYaml);

    await scheduleAgents(config);
    logger.info('Agents successfully reloaded');
  } catch (error) {
    logger.error({ error }, 'Failed to reload agents');
    throw error;
  }
}

async function main() {
  logger.info('Starting Orchestrator (Coalescence)...');

  try {
    // Load config
    const configPath = process.env.ORCHESTRATOR_TEST_CONFIG || path.join(__dirname, '..', 'config', 'agents.yaml');
    const configYaml = await fs.readFile(configPath, 'utf-8');
    const config: AgentsConfig = yaml.parse(configYaml);

    logger.info(
      { agentCount: Object.keys(config.agents).length, budget: config.budget },
      'Configuration loaded'
    );

    // Initialize MCP Pool
    mcpPool = new MCPPool(config.mcps);
    await mcpPool.initialize();

    // Initialize database
    const dbPath = path.join(__dirname, '..', 'logs', 'orchestration.db');
    await fs.mkdir(path.dirname(dbPath), { recursive: true });
    db = new OrchestrationDB(dbPath);

    // Initialize budget manager
    budget = new TokenBudgetManager(config.budget);

    // Start API server with config
    const apiPort = parseInt(process.env.API_PORT || '3100');
    const configDir = path.join(__dirname, '..', 'config');
    
    // Callback for manual agent triggering
    const onRunAgent = async (agentName: string) => {
      if (!mcpPool || !budget) throw new Error('MCP Pool or Budget not initialized');
      const agentConfig = config.agents[agentName];
      if (!agentConfig) throw new Error(`Agent ${agentName} not found`);
      
      logger.info({ agent: agentName }, 'Manual agent trigger started');
      try {
        const result = await runAgent(agentName, agentConfig, mcpPool, budget);
        logger.info({ agent: agentName, status: result.status, tokens: result.tokens }, 'Manual trigger completed');
      } catch (error) {
        logger.error({ agent: agentName, error }, 'Manual trigger failed');
        throw error;
      }
    };
    
    await createApiServer(db, apiPort, {
      configDir,
      onAgentReload: reloadAgentsCallback,
      onRunAgent
    });

    // Start config watcher
    const configWatcher = new ConfigWatcher({
      configDir,
      debounceMs: 1000,
      onAgentsChange: reloadAgentsCallback
    });
    configWatcher.start();

    // Reset budget daily at midnight
    cron.schedule('0 0 * * *', () => {
      logger.info('Resetting daily token budget');
      budget?.resetDaily();
    });

    // Schedule initial agents
    await scheduleAgents(config);

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
