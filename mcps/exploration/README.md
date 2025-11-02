# Exploration MCP

Model Context Protocol server for web exploration and company discovery. Provides lightweight, token-efficient tools for discovering companies and web content before onboarding to Satbase.

## Features

- **Company Discovery**: Search for companies/tickers using Yahoo Finance
- **Company Profiles**: Get sector, industry, market cap, website info
- **Price Snapshots**: Quick quote checks and short historical ranges
- **News Discovery**: Search live news via Mediastack API (requires MEDIASTACK_API_KEY)
- **Web Search**: Jina AI proxy for web search (requires JINA_API_KEY)
- **URL Fetching**: Extract readable content from URLs (Jina proxy)

## Tools

### Finance Tools (yfinance)

- `explore-search-company` - Search for companies/tickers
- `explore-get-profile` - Get company profile (sector, industry, market cap)
- `explore-get-quote` - Get current price snapshot
- `explore-get-prices` - Get historical prices (short range, max 90 days recommended)

### News Tools (Mediastack)

- `explore-search-news` - Search live news articles (requires MEDIASTACK_API_KEY)
  - Filter by categories (business, technology, etc.), sources (Reuters, Bloomberg, etc.), countries, languages
  - Sort by popularity for trending topics or published_desc for latest news
  - Returns metadata only (title, description, url, category, source) - token-efficient

### Web Tools (Jina Proxy)

- `explore-search-web` - Search the web (requires JINA_API_KEY)
- `explore-fetch-url` - Fetch and extract URL content (requires JINA_API_KEY)

## Setup

```bash
cd mcps/exploration
npm install
npm run build
```

## Configuration

Environment variables:
- `JINA_API_KEY` - Optional, required for web search/fetch tools
- `JINA_API_URL` - Default: `https://mcp.jina.ai/sse`
- `MEDIASTACK_API_KEY` - Optional, required for news search tool
- `LOG_LEVEL` - Default: `info`

## Usage in Orchestrator

Add to `coalescence/config/mcps-stdio.yaml`:

```yaml
exploration:
  command: node
  args:
    - ../../../mcps/exploration/dist/index-stdio.js
  env:
    JINA_API_KEY: "your-jina-api-key"
    JINA_API_URL: "https://mcp.jina.ai/sse"
    LOG_LEVEL: "info"
  description: Web exploration and company discovery
```

## Token Efficiency

All tools are designed for token efficiency:
- Default limits (e.g., `limit=10` for search)
- Content truncation (snippets max 300 chars, URLs max 2000 chars)
- No full content by default (only metadata)
- Short date ranges for price queries (max 90 days recommended)

## Workflow

1. **Discover**: Use `explore-search-company`, `explore-search-news`, or `explore-search-web` to find candidates
2. **Evaluate**: Use `explore-get-profile` and `explore-get-quote` for quick checks
3. **Research**: Use `explore-search-news` to find recent news about candidates (before onboarding)
4. **Decide**: Score candidates based on relevance
5. **Onboard**: Add to Satbase watchlist via `satbase_add-watchlist` (Scheduler handles backfill asynchronously)
6. **Knowledge**: Create Manifold dossier thoughts with `mf-create-thought`

## Dependencies

- `yahoo-finance2` - Company/ticker search and price data
- `@modelcontextprotocol/sdk` - MCP server framework
- `zod` - Schema validation
- `pino` - Logging

