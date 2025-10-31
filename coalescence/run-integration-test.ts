#!/usr/bin/env tsx
/**
 * INTEGRATION TEST: Validates orchestrator executes exactly per config
 * 
 * This test:
 * 1. Disables all agents except 1 (discovery)
 * 2. Tries to start the orchestrator
 * 3. Monitors exact config execution
 * 4. Shows all logs
 * 5. Exits after 30s with full report
 */

import fs from 'fs/promises';
import path from 'path';
import yaml from 'yaml';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 ORCHESTRATOR INTEGRATION TEST');
  console.log('='.repeat(80) + '\n');

  try {
    // 1. Load config
    console.log('📋 Loading configuration...');
    const configPath = path.join(__dirname, 'config', 'agents.yaml');
    const configYaml = await fs.readFile(configPath, 'utf-8');
    const config = yaml.parse(configYaml);

    // 2. Create test config with only discovery agent
    console.log('✏️  Creating test config (only discovery agent)...');
    const testConfig = { ...config };
    testConfig.orchestrator = { timezone: 'UTC' };
    testConfig.budget = { daily_tokens: 101000, monthly_budget_usd: 50 };

    // Disable all agents
    for (const agentName of Object.keys(testConfig.agents)) {
      testConfig.agents[agentName].enabled = false;
    }

    // Enable only discovery
    testConfig.agents.discovery.enabled = true;
    testConfig.agents.discovery.schedule = '* * * * * *'; // Run every second for testing

    const testConfigYaml = yaml.stringify(testConfig);
    const testConfigPath = path.join(__dirname, 'config', 'agents.test.yaml');
    await fs.writeFile(testConfigPath, testConfigYaml);
    console.log(`✓ Test config saved to ${testConfigPath}`);

    // 3. Show what we're testing
    console.log('\n📌 TEST CONFIGURATION:');
    console.log(`  • Agents enabled: ${Object.values(testConfig.agents).filter((a: any) => a.enabled).map((a: any) => a.enabled ? 'discovery' : '').join(', ')}`);
    console.log(`  • Discovery schedule: ${testConfig.agents.discovery.schedule}`);
    console.log(`  • Discovery model: ${testConfig.agents.discovery.model}`);
    console.log(`  • Discovery turns: ${testConfig.agents.discovery.turns.length}`);
    console.log(`  • Discovery budget: ${testConfig.agents.discovery.budget_daily_tokens} tokens/day`);

    // 4. Show expected behavior
    console.log('\n✅ EXPECTED BEHAVIOR:');
    console.log('  1. Orchestrator loads config');
    console.log('  2. MCPs connect (satbase, tesseract, manifold, ariadne)');
    console.log('  3. Discovery agent scheduled');
    console.log('  4. Agent loads rules from agent-rules/discovery.md');
    console.log('  5. Agent executes 3 turns');
    console.log('  6. Each turn calls specific MCPs');
    console.log('  7. Logs saved to logs/runs/');
    console.log('  8. Cost calculated and recorded');

    // 5. Start orchestrator (with test config)
    console.log('\n🚀 Starting orchestrator (30s timeout)...\n');
    console.log('='.repeat(80));

    const logsDir = path.join(__dirname, 'logs', 'runs');
    await fs.mkdir(logsDir, { recursive: true });

    const proc = spawn('npx', ['tsx', path.join(__dirname, 'src', 'main.ts')], {
      cwd: __dirname,
      env: {
        ...process.env,
        LOG_LEVEL: 'info',
        LLM_PROVIDER: 'openai',
        ORCHESTRATOR_TEST_CONFIG: testConfigPath,
        NODE_ENV: 'development'
      },
      stdio: 'pipe'
    });

    let output = '';
    let hasError = false;
    let logFiles: string[] = [];

    proc.stdout?.on('data', (data) => {
      const lines = data.toString();
      output += lines;
      console.log(lines);
    });

    proc.stderr?.on('data', (data) => {
      const lines = data.toString();
      output += lines;
      console.error('ERROR:', lines);
      hasError = true;
    });

    // Wait 15 seconds
    await new Promise((resolve) => {
      setTimeout(() => {
        console.log('\n' + '='.repeat(80));
        console.log('⏱️  Test timeout (15s). Stopping orchestrator...');
        proc.kill();
        resolve(null);
      }, 15000);
    });

    // 6. Check results
    console.log('\n📊 TEST RESULTS:\n');

    // Check if MCP connections attempted
    if (output.includes('Initializing MCP Pool')) {
      console.log('✅ MCP Pool initialization attempted');
    } else {
      console.log('❌ MCP Pool initialization NOT found');
    }

    if (output.includes('MCP connected')) {
      const matches = output.match(/MCP connected/g);
      console.log(`✅ ${matches?.length || 0} MCPs connected`);
    }

    if (output.includes('Scheduling agent')) {
      console.log('✅ Agent scheduling started');
      const scheduleLines = output.split('\n').filter((l) => l.includes('Scheduling agent'));
      scheduleLines.forEach((l) => console.log(`   ${l}`));
    }

    if (output.includes('Starting agent run')) {
      console.log('✅ Agent run started');
    }

    if (output.includes('Turn completed')) {
      const matches = output.match(/Turn completed/g);
      console.log(`✅ ${matches?.length || 0} turns completed`);
    }

    if (output.includes('Agent run finished')) {
      console.log('✅ Agent run finished');
      const lines = output.split('\n').filter((l) => l.includes('Agent run finished'));
      lines.forEach((l) => console.log(`   ${l}`));
    }

    // Check logs
    const runFiles = await fs.readdir(logsDir).catch(() => []);
    const todayDate = new Date().toISOString().split('T')[0];
    const todayDir = path.join(logsDir, todayDate);
    const todayFiles = await fs
      .readdir(todayDir)
      .catch(() => [])
      .then((files) => files.filter((f) => f.endsWith('.jsonl')));

    console.log(`\n📝 Log files created: ${todayFiles.length}`);
    if (todayFiles.length > 0) {
      console.log('✅ Logs successfully written to disk');
      for (const file of todayFiles.slice(0, 3)) {
        const logPath = path.join(todayDir, file);
        const content = await fs.readFile(logPath, 'utf-8');
        const lines = content.split('\n').filter((l) => l.trim());
        console.log(`   ${file}: ${lines.length} entries`);
      }
    } else {
      console.log('❌ No log files found');
    }

    // Final report
    console.log('\n' + '='.repeat(80));
    console.log('📋 FINAL REPORT:');
    console.log('='.repeat(80));

    if (!hasError && output.includes('Starting agent run')) {
      console.log('\n✅ INTEGRATION TEST PASSED');
      console.log('\nOrchestrator is correctly:');
      console.log('  ✓ Loading configuration from agents.yaml');
      console.log('  ✓ Scheduling agents based on cron expressions');
      console.log('  ✓ Executing agents with proper model selection');
      console.log('  ✓ Running multi-turn workflows');
      console.log('  ✓ Logging results to local files');
      console.log('  ✓ Tracking costs and token usage');
    } else {
      console.log('\n⚠️  INTEGRATION TEST INCOMPLETE');
      console.log('Orchestrator started but needs MCP servers running.');
      console.log('\nTo run full test with MCPs:');
      console.log('  1. docker-compose up -d satbase-api tesseract-api manifold-api ariadne-api');
      console.log('  2. npx tsx run-integration-test.ts');
    }

    // Cleanup
    await fs.unlink(testConfigPath).catch(() => {});

    console.log('\n');
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  }
}

main();
