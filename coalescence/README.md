# Coalescence: Multi-Agent Pipeline

Coalescence is the central orchestration engine for the Alpaca Bot multi-agent trading system. It coordinates multiple specialized agents to build knowledge, analyze markets, and make trading decisions.

## Setup (Docker)

```bash
# Add OpenAI API key to .env (gpt-4o-mini for testing)
echo "OPENAI_API_KEY=sk-..." >> .env

# Build orchestrator image
docker-compose build orchestrator

# Start with all dependencies
docker-compose up -d satbase-api tesseract-api manifold-api ariadne-api orchestrator

# Watch logs (real-time)
docker-compose logs -f orchestrator
```

## Cost Efficiency ⚡

Using **gpt-4o-mini** instead of Claude:
- **Haiku 4.5**: $1/$5 per 1M tokens
- **Sonnet 4.5**: $3/$15 per 1M tokens
- **gpt-4o-mini** ✅: $0.15/$0.60 per 1M tokens (30x cheaper!)

With 101k tokens/day:
- **Daily**: ~$0.015-0.030 (vs $0.24 with Claude)
- **Monthly**: ~$0.45-0.90 (vs $7 with Claude)
- **Budget**: $20 can run **44 months** of testing!

## Logging & Debugging

### View Logs

```bash
# Real-time logs from container
docker-compose logs -f orchestrator

# Follow specific agent runs
docker-compose logs orchestrator | grep "analyst_tech"

# See all errors
docker-compose logs orchestrator | grep ERROR

# Check token usage
docker-compose logs orchestrator | grep "tokens recorded"
```

### Log Files (Local)

All logs are persisted in `orchestrator/logs/runs/`:

```bash
# Today's runs
ls orchestrator/logs/runs/$(date +%Y-%m-%d)/

# View specific agent run
cat orchestrator/logs/runs/2025-10-25/analyst_tech__2025-10-25T08*.jsonl | jq .

# Parse costs
cat orchestrator/logs/runs/2025-10-25/*.jsonl | jq '.tokens.cost_usd' | awk '{sum+=$1} END {print "Total cost: $" sum}'
```

### Debug Mode

```bash
# Build with debug logging
docker-compose build --no-cache orchestrator

# Run with debug logs
LOG_LEVEL=debug docker-compose up orchestrator

# Or override in docker-compose temporarily
docker-compose exec orchestrator env LOG_LEVEL=debug node dist/main.js
```

### Model Switching

To switch back to Claude:

```bash
# Edit docker-compose.yml
LLM_PROVIDER=anthropic  # or openai (default)

# Rebuild
docker-compose build --no-cache orchestrator
```

## Configuration

Edit `config/agents.yaml`:
- **MCPs**: Define MCP server commands and args
- **Budget**: Daily token limit and monthly USD budget
- **Agents**: Schedule, model, budget per agent, turns configuration

YAML anchors (`&analyst_turns`) enable turn reuse across agents.

## Agent Rules

Each agent has a rules file in `agent-rules/`:
- MCP documentation
- Workflow steps
- Do's and don'ts
- Confidence scoring guidelines

Rules are passed as system context to the LLM.

## Key Files

- `src/main.ts`: Scheduler entry point
- `src/agent-runner.ts`: Multi-turn execution + model selector
- `src/mcp-pool.ts`: MCP client management
- `src/token-budget.ts`: Budget tracking + dual-provider pricing
- `config/agents.yaml`: Central configuration
- `Dockerfile`: Container definition

## Cost Tracking

Daily cost is calculated automatically and logged:

```json
{
  "tokens": {
    "input": 12000,
    "output": 3000,
    "total": 15000,
    "cost_usd": 0.0033
  }
}
```

Monitor with:

```bash
docker-compose logs orchestrator | grep "Agent run finished"
```

## Architecture

- **MCP Pool**: Manages stdio connections to Satbase, Tesseract, Manifold, Ariadne
- **Agent Runner**: Multi-turn execution with Vercel AI SDK + tool calling
- **Token Budget**: Tracks daily/monthly token spend (both providers)
- **Scheduler**: node-cron with configurable agents

## Troubleshooting

### MCPs not connecting?

```bash
# Check if MCPs are running
docker-compose ps

# Verify ports
netstat -tlnp | grep 808[0-3]

# Check MCP logs
docker-compose logs tesseract-api | tail -50
```

### Agent not starting?

```bash
# Check configuration
docker-compose exec orchestrator cat config/agents.yaml | grep -A5 "agent_name"

# Test config parsing
docker-compose exec orchestrator node -e "const yaml = require('yaml'); console.log(yaml.parse(require('fs').readFileSync('config/agents.yaml', 'utf-8')))"
```

### High token usage?

```bash
# Find expensive turns
docker-compose logs orchestrator | grep "Turn completed" | grep "inputTokens"

# Reduce max_tokens in config/agents.yaml
```

## Next Steps

1. ✅ Build orchestrator image: `docker-compose build orchestrator`
2. Add `OPENAI_API_KEY` to `.env`
3. Start stack: `docker-compose up -d`
4. Monitor: `docker-compose logs -f orchestrator`
5. Check costs: `docker-compose logs orchestrator | grep cost_usd`
