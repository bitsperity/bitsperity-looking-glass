# Satbase MCP - Development Plan

## Overview
Model Context Protocol server wrapping all Satbase backend endpoints for AI agent access to news, macro data, prices, and ingestion management.

**Port**: 9004  
**Transport**: Stdio (for Cursor IDE integration) + HTTP (optional, for testing)  
**Backend**: http://localhost:8080

## Architecture Principles

### SOLID-Based Design
- **Single Responsibility**: Each tool wraps exactly one backend endpoint
- **Open/Closed**: Extensible via new tools without modifying existing ones
- **Liskov Substitution**: All tools follow the same interface contract
- **Interface Segregation**: Tools expose only what agents need
- **Dependency Inversion**: Tools depend on abstractions (api-client), not concrete implementations

### Best Practices (from State-of-Art Analysis)
1. **1 Tool = 1 Endpoint**: Direct mapping for clarity
2. **Zod Schemas**: Runtime validation for all inputs/outputs
3. **Structured Logging**: Pino with structured JSON logs
4. **Error Handling**: Graceful failures with descriptive messages
5. **Timeouts**: Configurable per endpoint (default 30s, longer for jobs)
6. **Structured Content**: Return both text and structuredContent
7. **Modern Toolchain**: Vite + Vitest + TypeScript
8. **Environment Config**: Centralized with Zod validation

## Project Structure

```
mcps/satbase/
├── package.json              # Dependencies & scripts
├── tsconfig.json             # TypeScript config
├── vite.config.ts            # Build config
├── README.md                 # Documentation
├── PLAN.md                   # This file
├── .gitignore                # Git ignore rules
├── src/
│   ├── index-stdio.ts        # Stdio entry point (primary)
│   ├── index.ts              # HTTP entry point (optional)
│   ├── config.ts             # Environment validation
│   ├── logger.ts             # Pino logger setup
│   └── lib/
│       ├── api-client.ts     # Generic HTTP wrapper
│       ├── schemas.ts        # All Zod schemas
│       └── tools/
│           ├── news.ts       # list-news, delete-news
│           ├── macro.ts      # fred-search, fred-observations
│           ├── prices.ts     # list-prices
│           ├── btc.ts        # btc-oracle, usd-to-btc, btc-to-usd
│           ├── ingest.ts     # enqueue-news, enqueue-news-bodies, enqueue-prices, enqueue-macro
│           ├── jobs.ts       # list-jobs, get-job
│           ├── watchlist.ts  # get-watchlist, add-watchlist, remove-watchlist
│           ├── topics.ts     # get-topics, add-topics
│           └── health.ts     # health-check, list-sources
```

## Tool Catalog (31 Tools)

### 1. Health Router (2 tools)
- **health-check**: Check Satbase API status
- **list-sources**: List all available data sources

### 2. News Router (2 tools)
- **list-news**: Fetch news with filters (date, tickers, query, **optional `include_body`**)
- **delete-news**: Delete a news article by ID

### 3. Macro Router (2 tools)
- **fred-search**: Search FRED economic series by keyword
- **fred-observations**: Fetch FRED data observations for a series

### 4. Prices Router (1 tool)
- **list-prices**: Fetch historical OHLCV price data for a ticker

### 5. BTC Router (3 tools)
- **btc-oracle**: Fetch Bitcoin oracle price data
- **usd-to-btc**: Convert USD to BTC at historical rate
- **btc-to-usd**: Convert BTC to USD at historical rate

### 6. Ingest Router (4 tools)
- **enqueue-news**: Trigger background news ingestion for a search query
- **enqueue-news-bodies**: Trigger full HTML/text body fetching for news articles
- **enqueue-prices**: Trigger price data ingestion for tickers
- **enqueue-macro**: Trigger FRED economic data ingestion for a series

### 7. Jobs Router (2 tools)
- **list-jobs**: List background ingestion jobs with status/progress
- **get-job**: Get detailed information about a specific job

### 8. Watchlist Router (3 tools)
- **get-watchlist**: Get current watchlist of ticker symbols
- **add-watchlist**: Add ticker symbols to watchlist (optionally trigger ingestion)
- **remove-watchlist**: Remove a ticker symbol from watchlist

### 9. Topics Router (2 tools)
- **get-topics**: Get current list of news search topics
- **add-topics**: Add news search topics to monitor (optionally trigger ingestion)

**Total: 21 tools** (not 31, corrected count)

## Key Design Decisions

### 1. `include_body` and `content_format` Parameters
The `list-news` tool will expose **granular control** over content retrieval:

**Parameters**:
- `include_body` (bool, default: `false`): Whether to include article bodies
- `content_format` (str, optional): `"text"`, `"html"`, or `"both"` (default)

**Agent Workflow**:
1. **Discovery Phase**: `include_body=false` → Metadata only (id, title, text snippet, url, tickers) - **Fast**
2. **Selective Text Reading**: `include_body=true&content_format=text` → Only `content_text` - **Token-efficient**
3. **HTML Parsing**: `include_body=true&content_format=html` → Only `content_html` - **For specialized parsing**
4. **Full Content**: `include_body=true` (no format) → Both text and HTML - **Maximum flexibility**

**Rationale**: Token efficiency is critical for LLM costs. Agents can now:
- Read 2x more articles with text-only mode
- Choose HTML only for DOM parsing tasks
- Get both when needed for comparison or fallback

### 2. No Docker for Cursor Integration
The MCP will run directly via Node.js stdio transport for Cursor IDE. Docker is optional for HTTP testing but not required.

### 3. Timeout Strategy
- **Standard endpoints** (news, macro, prices): 30 seconds
- **Job triggers** (enqueue-*): 60 seconds (may involve validation)
- **Job status** (list-jobs, get-job): 10 seconds (fast queries)

### 4. Error Handling
All tools will:
- Catch and log errors with structured context
- Return `isError: true` with descriptive messages
- Never throw unhandled exceptions to the MCP client

## Environment Variables

```bash
PORT=9004                          # HTTP port (optional)
SATBASE_API_URL=http://localhost:8080
LOG_LEVEL=info                     # debug | info | warn | error
SERVER_NAME=satbase-mcp
NODE_ENV=production                # development | production
```

## Development Workflow

1. **Setup**:
   ```bash
   cd mcps/satbase
   npm install
   ```

2. **Development (Stdio)**:
   ```bash
   npm run dev:stdio
   ```

3. **Build**:
   ```bash
   npm run build
   ```

4. **Production (Stdio)**:
   ```bash
   npm run start:stdio
   ```

5. **Testing (HTTP, optional)**:
   ```bash
   npm run dev        # Start HTTP server on port 9004
   npx @modelcontextprotocol/inspector
   ```

## Cursor Integration

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "satbase-mcp": {
      "command": "node",
      "args": [
        "/home/sascha-laptop/alpaca-bot/mcps/satbase/dist/index-stdio.js"
      ],
      "env": {
        "SATBASE_API_URL": "http://localhost:8080",
        "LOG_LEVEL": "info",
        "SERVER_NAME": "satbase-mcp"
      }
    }
  }
}
```

**Note**: Ensure Satbase backend is running on `localhost:8080` before using the MCP.

## Implementation Checklist

- [ ] Project scaffolding (package.json, tsconfig.json, vite.config.ts)
- [ ] Core infrastructure (config.ts, logger.ts, api-client.ts)
- [ ] Zod schemas for all endpoints (schemas.ts)
- [ ] Implement 21 tools across 9 routers
- [ ] Stdio entry point (index-stdio.ts)
- [ ] HTTP entry point (index.ts, optional)
- [ ] README.md with usage examples
- [ ] Update ~/.cursor/mcp.json
- [ ] Test all tools via MCP
- [ ] Documentation for each tool

## Success Criteria

1. All 21 tools successfully registered and callable via MCP
2. Cursor IDE shows "21 tools enabled" for satbase-mcp
3. `list-news` with `include_body: true` returns full content
4. `list-news` with `include_body: false` (default) returns metadata only
5. Job management tools allow agents to trigger and monitor ingestion
6. Watchlist and topics tools enable dynamic data collection
7. No Docker required for Cursor integration
8. Comprehensive error handling and logging
9. Type-safe schemas for all inputs/outputs

## Agent Use Cases

### Use Case 1: Token-Efficient News Reading
```typescript
// Phase 1: Discover relevant news (fast, no content)
const news = await agent.callTool('list-news', {
  from: '2025-01-01',
  to: '2025-01-24',
  tickers: ['AAPL', 'MSFT'],
  limit: 50,
  include_body: false  // Metadata only: id, title, url, tickers
});

// Phase 2: Read text-only for selected articles (2x token-efficient)
const textNews = await agent.callTool('list-news', {
  from: '2025-01-20',
  to: '2025-01-20',
  tickers: ['AAPL'],
  limit: 10,
  include_body: true,
  content_format: 'text'  // Only content_text, no HTML
});

// Phase 3: Deep dive with HTML for specific article (if needed)
const htmlNews = await agent.callTool('list-news', {
  from: '2025-01-20',
  to: '2025-01-20',
  tickers: ['AAPL'],
  limit: 1,
  include_body: true,
  content_format: 'html'  // Only content_html for DOM parsing
});
```

### Use Case 2: Data Pipeline Management
```typescript
// Add ticker to watchlist and trigger price ingestion
await agent.callTool('add-watchlist', {
  symbols: ['NVDA'],
  ingest: true,
  ttl_days: 30
});

// Monitor ingestion progress
const jobs = await agent.callTool('list-jobs', { status: 'running' });
```

### Use Case 3: Macro Analysis
```typescript
// Search for relevant FRED series
const series = await agent.callTool('fred-search', {
  q: 'unemployment rate',
  limit: 10
});

// Fetch historical data
const data = await agent.callTool('fred-observations', {
  series_id: 'UNRATE',
  from: '2020-01-01',
  to: '2025-01-24'
});
```

## Next Steps

1. Implement the plan as specified
2. Test integration with Tesseract MCP (semantic search → Satbase full content)
3. Update main documentation to reflect all 3 MCPs (Tesseract, Satbase, Manifold)
4. Plan Manifold MCP (port 9002)
5. Plan Ariadne MCP (port 9003)

