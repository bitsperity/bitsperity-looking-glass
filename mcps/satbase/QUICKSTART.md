# Satbase MCP - Quick Start

5-minute setup guide.

## 1. Install & Build

```bash
cd mcps/satbase
npm install
npm run build
```

## 2. Configure Cursor

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
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

Replace `/home/sascha-laptop/alpaca-bot` with your path.

## 3. Restart Cursor

Restart Cursor IDE to load the MCP server.

## 4. Verify

Check that "satbase-mcp" appears in Cursor's MCP list with 21 tools enabled.

## Common Workflows

### Get News Content

1. Use Tesseract MCP: `semantic-search` to find relevant news
2. Note the `news_id` from results
3. Use Satbase MCP: `get-news-by-id` with that ID to get full content

### Add Ticker to Watchlist

```json
{
  "tool": "add-watchlist",
  "args": {
    "symbols": ["NVDA"],
    "ttl_days": 30,
    "ingest": true
  }
}
```

This adds NVDA to watchlist AND triggers price ingestion.

### Get FRED Macro Data

```json
{
  "tool": "fred-search",
  "args": {
    "q": "unemployment",
    "limit": 10
  }
}
```

Then use `fred-observations` with a `series_id` to get data.

### Monitor Jobs

```json
{
  "tool": "list-jobs",
  "args": {
    "limit": 20,
    "status": "running"
  }
}
```

## Troubleshooting

### MCP Server Not Appearing

- Check that Satbase backend is running on `localhost:8080`
- Verify the path in `mcp.json` is correct
- Check Cursor logs for errors

### Tools Timing Out

- Increase timeout in tool calls (default 30s)
- Check Satbase backend logs
- Verify database connections (Postgres)

## Next Steps

- Read full [README.md](./README.md) for all 21 tools
- Explore [tool examples](./README.md#tool-catalog)
- Integrate with Tesseract MCP for semantic search + content retrieval workflow

