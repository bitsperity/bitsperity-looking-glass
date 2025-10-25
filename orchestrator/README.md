# Orchestrator: Multi-Agent Pipeline

Central orchestration engine for the Alpaca Bot multi-agent trading system.

## Architecture

- **MCP Pool**: Manages stdio connections to Satbase, Tesseract, Manifold, Ariadne
- **Agent Runner**: Multi-turn execution with Vercel AI SDK + tool calling
- **Token Budget**: Tracks daily/monthly token spend
- **Scheduler**: node-cron with configurable agents

## Setup

```bash
cd orchestrator
npm install
npm run build
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

## Running

```bash
# Development (watch + logs)
npm run dev

# Production
npm start
```

Logs are sent to stdout (Pino) and written as JSONL in `logs/runs/YYYY-MM-DD/`.

## Key Files

- `src/main.ts`: Scheduler entry point
- `src/agent-runner.ts`: Multi-turn execution
- `src/mcp-pool.ts`: MCP client management
- `src/token-budget.ts`: Budget tracking
- `config/agents.yaml`: Central configuration

## Cost Tracking

Daily cost is calculated based on:
- Haiku 4.5: $1/1M input, $5/1M output tokens
- Sonnet 4.5: $3/1M input, $15/1M output tokens

Target: ~$7/month (well under $50 budget).

## Debugging

Set `LOG_LEVEL=debug` for verbose logging:

```bash
LOG_LEVEL=debug npm run dev
```

Check run logs:

```bash
tail -f logs/runs/$(date +%Y-%m-%d)/*.jsonl
```

## Next Steps

1. Build MCPs (Satbase, Tesseract, Manifold, Ariadne) to dist/
2. Verify ANTHROPIC_API_KEY in `.env`
3. Start orchestrator: `npm start`
4. Monitor logs and Manifold/Ariadne for outputs
