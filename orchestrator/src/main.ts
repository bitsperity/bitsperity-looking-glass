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
import type { AgentsConfig } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from project root (not orchestrator directory)
dotenvConfig({ path: path.join(__dirname, '..', '..', '.env') });

async function main() {
  logger.info('Starting Orchestrator...');

  try {
    // Load config
    const configPath = path.join(__dirname, '..', 'config', 'agents.yaml');
    const configYaml = await fs.readFile(configPath, 'utf-8');
    const config: AgentsConfig = yaml.parse(configYaml);

    logger.info(
      { agentCount: Object.keys(config.agents).length, budget: config.budget },
      'Configuration loaded'
    );

    // Initialize MCP Pool
    const mcpPool = new MCPPool(config.mcps);
    await mcpPool.initialize();

    // Initialize budget manager
    const budget = new TokenBudgetManager(config.budget);

    // Reset budget daily at midnight
    cron.schedule('0 0 * * *', () => {
      logger.info('Resetting daily token budget');
      budget.resetDaily();
    });

    logger.info('Scheduling agents...');

    // Track which crons are registered to avoid duplicates
    const registeredCrons = new Set<string>();

    // Schedule each agent individually (for debugging)
    for (const [agentName, agentConfig] of Object.entries(config.agents)) {
      if (!agentConfig.enabled) {
        logger.info({ agent: agentName }, 'Agent disabled, skipping');
        continue;
      }

      logger.info(
        { agent: agentName, schedule: agentConfig.schedule, batch: agentConfig.batch },
        'Scheduling agent'
      );

      cron.schedule(agentConfig.schedule, async () => {
        logger.info({ agent: agentName, batch: agentConfig.batch }, 'Starting agent run');
        try {
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
          logger.error({ agent: agentName, error }, 'Agent run failed');
        }
      });
    }

    // Log active schedules
    const enabledAgents = Object.entries(config.agents).filter(([_, cfg]) => cfg.enabled);
    logger.info(
      {
        totalScheduled: enabledAgents.length,
        schedules: enabledAgents.map(([name, cfg]) => `${name} @ ${cfg.schedule}`)
      },
      'Scheduler initialized'
    );

    logger.info('Orchestrator running. Press Ctrl+C to exit.');
  } catch (error) {
    logger.error(error, 'Orchestrator initialization failed');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  process.exit(0);
});

main().catch(error => {
  logger.error(error, 'Orchestrator fatal error');
  process.exit(1);
});
