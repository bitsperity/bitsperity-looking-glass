#!/bin/bash

# 📊 ORCHESTRATOR TEST VALIDATION SCRIPT
# Run this after the 1-hour test to analyze results

cd /home/sascha-laptop/alpaca-bot

TODAY=$(date +%Y-%m-%d)
LOG_DIR="orchestrator/logs/runs/$TODAY"

echo ""
echo "📊 ORCHESTRATOR TEST VALIDATION REPORT"
echo "======================================"
echo ""
echo "Date: $TODAY"
echo "Log directory: $LOG_DIR"
echo ""

if [ ! -d "$LOG_DIR" ]; then
  echo "❌ No logs found for today!"
  exit 1
fi

# Count runs
TOTAL_RUNS=$(ls "$LOG_DIR"/*.jsonl 2>/dev/null | wc -l)
echo "✅ Total agent runs: $TOTAL_RUNS"
echo ""

# Agent breakdown
echo "📌 RUNS BY AGENT:"
for agent in discovery analyst_tech analyst_biotech analyst_commodities analyst_macro analyst_geopolitics validator trader; do
  COUNT=$(ls "$LOG_DIR"/${agent}*.jsonl 2>/dev/null | wc -l)
  if [ $COUNT -gt 0 ]; then
    echo "   • $agent: $COUNT runs"
  fi
done
echo ""

# Token usage
echo "💰 TOKEN USAGE:"
TOTAL_TOKENS=$(cat "$LOG_DIR"/*.jsonl | jq '.tokens.total' 2>/dev/null | awk '{sum+=$1} END {print sum}')
TOTAL_COST=$(cat "$LOG_DIR"/*.jsonl | jq '.tokens.cost_usd' 2>/dev/null | awk '{sum+=$1} END {printf "%.4f", sum}')
INPUT_TOKENS=$(cat "$LOG_DIR"/*.jsonl | jq '.tokens.input' 2>/dev/null | awk '{sum+=$1} END {print sum}')
OUTPUT_TOKENS=$(cat "$LOG_DIR"/*.jsonl | jq '.tokens.output' 2>/dev/null | awk '{sum+=$1} END {print sum}')

echo "   • Input tokens: $INPUT_TOKENS"
echo "   • Output tokens: $OUTPUT_TOKENS"
echo "   • Total tokens: $TOTAL_TOKENS"
echo "   • Total cost: \$$TOTAL_COST"
echo ""

# Status breakdown
echo "✅ RUN STATUS:"
COMPLETED=$(cat "$LOG_DIR"/*.jsonl | jq '.status' | grep completed | wc -l)
FAILED=$(cat "$LOG_DIR"/*.jsonl | jq '.status' | grep failed | wc -l)
echo "   • Completed: $COMPLETED"
echo "   • Failed: $FAILED"
echo ""

# Turns per run
echo "🔄 MULTI-TURN EXECUTION:"
TOTAL_TURNS=$(cat "$LOG_DIR"/*.jsonl | jq '.chat_history | length' | awk '{sum+=$1} END {print sum}')
AVG_TURNS=$((TOTAL_TURNS / TOTAL_RUNS))
echo "   • Total turns: $TOTAL_TURNS"
echo "   • Average turns per run: $AVG_TURNS"
echo ""

# Show sample runs
echo "📝 SAMPLE RUN (first agent):"
FIRST_LOG=$(ls "$LOG_DIR"/*.jsonl | head -1)
if [ -f "$FIRST_LOG" ]; then
  echo ""
  echo "File: $(basename $FIRST_LOG)"
  jq '{agent, timestamp, status, duration_seconds, tokens}' "$FIRST_LOG"
  echo ""
  echo "Chat history (first turn):"
  jq '.chat_history[0:2]' "$FIRST_LOG" | head -20
fi
echo ""

# Final summary
echo "======================================"
echo "✅ VALIDATION COMPLETE"
echo ""
echo "Summary:"
echo "  • $TOTAL_RUNS agent runs executed"
echo "  • $TOTAL_TOKENS tokens used"
echo "  • Cost: \$$TOTAL_COST"
echo "  • Logs saved: $LOG_DIR/"
echo ""
echo "Next steps:"
echo "  1. Review logs: ls -lh $LOG_DIR/"
echo "  2. Inspect run: jq . $FIRST_LOG"
echo "  3. To reset: rm -rf $LOG_DIR/"
echo ""
