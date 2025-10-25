#!/bin/bash

# 🧪 ORCHESTRATOR 1-HOUR TEST SCRIPT
# Runs all agents frequently and logs everything
# Cost: ~$0.20 with gpt-4o-mini

set -e

cd /home/sascha-laptop/alpaca-bot

echo "🚀 STARTING 1-HOUR ORCHESTRATOR TEST"
echo "=================================="
echo ""
echo "Config: Test mode"
echo "  • Discovery: every 2 minutes (30 runs)"
echo "  • Analysts: every 5 minutes, parallel (12+5 runs)"
echo "  • Validator: every 10 minutes (6 runs)"
echo "  • Trader: every 15 minutes (4 runs)"
echo ""
echo "Expected:"
echo "  • ~57 agent runs"
echo "  • ~250-350 LLM calls"
echo "  • 8-10k tokens"
echo "  • Cost: ~\$0.15-0.30"
echo ""
echo "Logs: orchestrator/logs/runs/$(date +%Y-%m-%d)/"
echo ""
echo "⏱️  Starting now - will run for ~60 minutes..."
echo "=================================="
echo ""

# Start orchestrator
cd /home/sascha-laptop/alpaca-bot/orchestrator
npx tsx src/main.ts

# Note: This will run indefinitely. Press Ctrl+C after 60 minutes
