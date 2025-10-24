# Satbase MCP

Model Context Protocol server for Satbase data access - news, macro data, prices, and ingestion management.

## Features

- **21 Tools** covering all Satbase backend endpoints
- **Token-Efficient News Reading**: Granular control via `content_format` parameter
- **Stdio Transport**: Direct integration with Cursor IDE
- **Type-Safe**: Zod schemas for all inputs/outputs
- **Production-Ready**: Comprehensive error handling, logging, and timeouts

## Quick Start

### Installation

```bash
cd mcps/satbase
npm install
npm run build
```

### Development

#### Stdio Transport (for Cursor)
```bash
npm run dev:stdio
```

#### HTTP Server (for testing, optional)
Not implemented - use stdio transport only.

### Production

```bash
npm run build
npm run start:stdio
```

## Integration with Cursor IDE

This MCP is already configured in `~/.cursor/mcp.json`:

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

**Requirements**:
- Satbase backend running on `localhost:8080`
- Restart Cursor after building the MCP

## Tool Catalog (21 Tools)

### News (2 tools)

#### `list-news`
Fetch news articles with filters and token-efficient content retrieval.

**Parameters**:
- `from` (string): Start date (YYYY-MM-DD)
- `to` (string): End date (YYYY-MM-DD)
- `q` (string, optional): Search query
- `tickers` (string, optional): Comma-separated ticker symbols
- `limit` (number, default: 100): Maximum results
- `offset` (number, default: 0): Pagination offset
- `include_body` (boolean, default: false): Include article content
- `has_body` (boolean, default: false): Filter to articles with bodies
- `content_format` (enum: 'text' | 'html' | 'both', optional): Content format

**Example**:
```typescript
// Token-efficient: text only
{
  "from": "2025-01-01",
  "to": "2025-01-24",
  "tickers": "NVDA,AMD",
  "limit": 10,
  "include_body": true,
  "content_format": "text"
}
```

#### `delete-news`
Delete a news article by ID.

**Parameters**:
- `news_id` (string): ID of the article to delete

### Macro (2 tools)

#### `fred-search`
Search Federal Reserve Economic Data (FRED) series.

**Parameters**:
- `q` (string): Search query
- `limit` (number, default: 20): Maximum results

**Example**:
```typescript
{
  "q": "unemployment rate",
  "limit": 10
}
```

#### `fred-observations`
Fetch FRED economic data observations.

**Parameters**:
- `series_id` (string): FRED series ID
- `from` (string, optional): Start date (YYYY-MM-DD)
- `to` (string, optional): End date (YYYY-MM-DD)

**Example**:
```typescript
{
  "series_id": "UNRATE",
  "from": "2020-01-01",
  "to": "2025-01-24"
}
```

### Prices (1 tool)

#### `list-prices`
Fetch historical OHLCV price data.

**Parameters**:
- `ticker` (string): Ticker symbol
- `from` (string): Start date (YYYY-MM-DD)
- `to` (string): End date (YYYY-MM-DD)

**Example**:
```typescript
{
  "ticker": "AAPL",
  "from": "2025-01-01",
  "to": "2025-01-24"
}
```

### BTC (3 tools)

#### `btc-oracle`
Fetch Bitcoin oracle price data.

**Parameters**:
- `from` (string): Start date (YYYY-MM-DD)
- `to` (string): End date (YYYY-MM-DD)

#### `usd-to-btc`
Convert USD to BTC at historical rate.

**Parameters**:
- `value` (number): USD value
- `on` (string): Date for conversion (YYYY-MM-DD)

#### `btc-to-usd`
Convert BTC to USD at historical rate.

**Parameters**:
- `value` (number): BTC value
- `on` (string): Date for conversion (YYYY-MM-DD)

### Ingest (4 tools)

#### `enqueue-news`
Trigger background news ingestion.

**Parameters**:
- `q` (string): Search query
- `hours` (number, default: 24): Hours to look back

#### `enqueue-news-bodies`
Trigger full HTML/text body fetching.

**Parameters**:
- `from` (string): Start date (YYYY-MM-DD)
- `to` (string): End date (YYYY-MM-DD)

#### `enqueue-prices`
Trigger price data ingestion.

**Parameters**:
- `tickers` (array of strings): Ticker symbols

#### `enqueue-macro`
Trigger FRED data ingestion.

**Parameters**:
- `series_id` (string): FRED series ID
- `from` (string): Start date (YYYY-MM-DD)
- `to` (string): End date (YYYY-MM-DD)

### Jobs (2 tools)

#### `list-jobs`
List background ingestion jobs.

**Parameters**:
- `limit` (number, default: 100): Maximum results
- `status` (enum: 'idle' | 'running' | 'done' | 'error', optional): Filter by status

#### `get-job`
Get detailed job information.

**Parameters**:
- `job_id` (string): Job ID

### Watchlist (3 tools)

#### `get-watchlist`
Get current watchlist.

**No parameters**

#### `add-watchlist`
Add symbols to watchlist.

**Parameters**:
- `symbols` (array of strings): Ticker symbols
- `ingest` (boolean, default: false): Trigger price ingestion
- `ttl_days` (number, optional): Days until expiration

#### `remove-watchlist`
Remove symbol from watchlist.

**Parameters**:
- `symbol` (string): Ticker symbol

### Topics (2 tools)

#### `get-topics`
Get current news topics.

**No parameters**

#### `add-topics`
Add news search topics.

**Parameters**:
- `queries` (array of strings): Search queries
- `ingest` (boolean, default: false): Trigger news ingestion
- `hours` (number, optional): Hours to look back
- `ttl_days` (number, optional): Days until expiration

### Health (2 tools)

#### `health-check`
Check Satbase API health.

**No parameters**

#### `list-sources`
List all data sources.

**No parameters**

## Environment Variables

```bash
SATBASE_API_URL=http://localhost:8080  # Satbase backend URL
LOG_LEVEL=info                          # debug | info | warn | error
SERVER_NAME=satbase-mcp                 # MCP server name
```

## Agent Use Cases

### Use Case 1: Token-Efficient News Reading

```typescript
// Phase 1: Discover (metadata only)
const news = await agent.callTool('list-news', {
  from: '2025-01-20',
  to: '2025-01-24',
  tickers: 'NVDA',
  limit: 50,
  include_body: false  // Fast, no content
});

// Phase 2: Read text-only (2x token-efficient)
const textNews = await agent.callTool('list-news', {
  from: '2025-01-23',
  to: '2025-01-24',
  tickers: 'NVDA',
  limit: 10,
  include_body: true,
  content_format: 'text'  // Only content_text
});
```

### Use Case 2: Data Pipeline Management

```typescript
// Add ticker and trigger ingestion
await agent.callTool('add-watchlist', {
  symbols: ['NVDA'],
  ingest: true,
  ttl_days: 30
});

// Monitor progress
const jobs = await agent.callTool('list-jobs', { 
  status: 'running' 
});
```

### Use Case 3: Macro Analysis

```typescript
// Search for series
const series = await agent.callTool('fred-search', {
  q: 'unemployment rate',
  limit: 5
});

// Fetch data
const data = await agent.callTool('fred-observations', {
  series_id: 'UNRATE',
  from: '2020-01-01',
  to: '2025-01-24'
});
```

## Architecture

### SOLID Principles
- **Single Responsibility**: One tool = one endpoint
- **Open/Closed**: Extensible via new tools
- **Liskov Substitution**: All tools follow same contract
- **Interface Segregation**: Tools expose only what's needed
- **Dependency Inversion**: Tools depend on api-client abstraction

### Timeout Strategy
- **Health/Jobs**: 5-10 seconds (fast queries)
- **Data Retrieval**: 30 seconds (news, macro, prices)
- **Ingestion Triggers**: 60 seconds (validation overhead)

## License

MIT
