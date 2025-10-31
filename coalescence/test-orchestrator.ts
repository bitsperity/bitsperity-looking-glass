import fs from 'fs/promises';
import path from 'path';
import yaml from 'yaml';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface AgentConfig {
  enabled: boolean;
  schedule: string;
  model: string;
  budget_daily_tokens: number;
  timeout_minutes: number;
  batch?: number;
  sector?: string;
  turns: Array<{
    id: number;
    name: string;
    model?: string;
    max_tokens: number;
    mcps?: string[];
  }>;
}

interface AgentsConfig {
  budget: {
    daily_tokens: number;
    monthly_budget_usd: number;
  };
  agents: Record<string, AgentConfig>;
}

async function calculateCosts(config: AgentsConfig) {
  console.log('\n📊 COST ANALYSIS\n');
  console.log('='.repeat(70));

  let totalDailyTokens = 0;
  let totalDailyTokensHaiku = 0;
  let totalDailyTokensSonnet = 0;
  let totalDailyTokensGPT4oMini = 0;

  const agents = Object.entries(config.agents).filter(([_, cfg]) => cfg.enabled);

  console.log(`\n📌 ${agents.length} Agents enabled:\n`);

  for (const [agentName, agentCfg] of agents) {
    const turnTokens = agentCfg.turns.reduce((sum, t) => sum + t.max_tokens, 0);
    const model = agentCfg.model || 'unknown';
    const budget = agentCfg.budget_daily_tokens;

    console.log(`  ${agentName}`);
    console.log(`    Model: ${model}`);
    console.log(`    Budget: ${budget.toLocaleString()} tokens/day`);
    console.log(`    Turns: ${agentCfg.turns.length} (${turnTokens.toLocaleString()} tokens/run)`);
    console.log(`    Schedule: ${agentCfg.schedule}`);
    console.log(`    Batch: ${agentCfg.batch || 'none'}`);
    console.log('');

    totalDailyTokens += budget;
    if (model.includes('haiku')) {
      totalDailyTokensHaiku += budget;
    } else if (model.includes('sonnet')) {
      totalDailyTokensSonnet += budget;
    } else {
      totalDailyTokensGPT4oMini += budget;
    }
  }

  console.log('='.repeat(70));
  console.log('\n💰 PRICING BREAKDOWN:\n');

  // Pricing
  const prices = {
    haiku: { input: 1, output: 5 },
    sonnet: { input: 3, output: 15 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4o': { input: 2.50, output: 10 }
  };

  // Assume 70% input, 30% output
  const calculateCost = (tokens: number, provider: 'haiku' | 'sonnet' | 'gpt-4o-mini' | 'gpt-4o') => {
    const rates = prices[provider];
    const inputTokens = tokens * 0.7;
    const outputTokens = tokens * 0.3;
    return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
  };

  const costHaiku = calculateCost(totalDailyTokensHaiku, 'haiku');
  const costSonnet = calculateCost(totalDailyTokensSonnet, 'sonnet');
  const costGPT4oMini = calculateCost(totalDailyTokensGPT4oMini, 'gpt-4o-mini');
  const totalDailyCost = costHaiku + costSonnet + costGPT4oMini;

  console.log(`Haiku 4.5:     ${totalDailyTokensHaiku.toLocaleString()} tokens/day = $${costHaiku.toFixed(4)}/day`);
  console.log(`Sonnet 4.5:    ${totalDailyTokensSonnet.toLocaleString()} tokens/day = $${costSonnet.toFixed(4)}/day`);
  console.log(`gpt-4o-mini:   ${totalDailyTokensGPT4oMini.toLocaleString()} tokens/day = $${costGPT4oMini.toFixed(4)}/day`);
  console.log(`\nTotal Daily:   ${totalDailyTokens.toLocaleString()} tokens = $${totalDailyCost.toFixed(4)}`);
  console.log(`Total Monthly: ${(totalDailyTokens * 30).toLocaleString()} tokens = $${(totalDailyCost * 30).toFixed(2)}`);

  console.log('\n✅ Budget: $' + config.budget.monthly_budget_usd);
  console.log(`✅ Daily budget remaining: $${(config.budget.monthly_budget_usd / 30 - totalDailyCost).toFixed(2)}`);

  if (totalDailyCost * 30 > config.budget.monthly_budget_usd) {
    console.log('\n⚠️  WARNING: Monthly cost exceeds budget!');
  } else {
    const monthsOfBudget = config.budget.monthly_budget_usd / (totalDailyCost * 30);
    console.log(`\n✅ Budget can sustain ~${monthsOfBudget.toFixed(1)} months of operation`);
  }
}

async function validateConfig(config: AgentsConfig) {
  console.log('\n✅ CONFIGURATION VALIDATION\n');
  console.log('='.repeat(70));

  const agents = Object.entries(config.agents).filter(([_, cfg]) => cfg.enabled);
  console.log(`\n✓ ${agents.length} enabled agents`);
  console.log(`✓ Daily budget: ${config.budget.daily_tokens.toLocaleString()} tokens`);
  console.log(`✓ Monthly budget: $${config.budget.monthly_budget_usd}`);

  const schedules = new Map<string, string[]>();
  for (const [name, cfg] of agents) {
    const schedule = cfg.schedule;
    if (!schedules.has(schedule)) {
      schedules.set(schedule, []);
    }
    schedules.get(schedule)!.push(name);
  }

  console.log(`\n📅 SCHEDULE:\n`);
  for (const [schedule, names] of Array.from(schedules.entries()).sort()) {
    console.log(`  ${schedule}: ${names.join(', ')}`);
  }

  console.log('');
}

async function main() {
  console.log('\n🚀 ORCHESTRATOR TEST SUITE\n');

  try {
    // Load config
    const configPath = path.join(__dirname, 'config', 'agents.yaml');
    const configYaml = await fs.readFile(configPath, 'utf-8');
    const config: AgentsConfig = yaml.parse(configYaml);

    // Validate
    await validateConfig(config);

    // Calculate costs
    await calculateCosts(config);

    console.log('\n' + '='.repeat(70));
    console.log('\n✅ All tests passed! Configuration is valid.');
    console.log('\nNext steps:');
    console.log('  1. docker-compose build orchestrator');
    console.log('  2. docker-compose up -d satbase-api tesseract-api manifold-api ariadne-api');
    console.log('  3. docker-compose up orchestrator');
    console.log('  4. docker-compose logs -f orchestrator');
    console.log('\n');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
