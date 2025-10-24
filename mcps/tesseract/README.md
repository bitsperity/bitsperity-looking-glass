# Tesseract MCP Server

Model Context Protocol (MCP) server for Tesseract semantic search. Wraps all Tesseract backend endpoints as MCP tools for AI agents.

## Overview

Tesseract MCP provides semantic search capabilities over the Satbase news corpus using multilingual embeddings (`intfloat/multilingual-e5-large`). It exposes 8 MCP tools for both user-facing search operations and administrative collection management.

**Port**: 9001 (MCP port scheme: 9xxx)

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

The server will start on port 9001 with hot-reloading via `tsx --watch`.

## Production

```bash
npm run build
npm start
```

## Testing

Use the official MCP Inspector to test all tools:

```bash
npm run dev

# In another terminal
npx @modelcontextprotocol/inspector
```

Then connect to: `http://localhost:9001/mcp`

## Docker

Build and run:

```bash
docker build -t tesseract-mcp .
docker run -p 9001:9001 -e TESSERACT_API_URL=http://tesseract-api:8081 tesseract-mcp
```

Or use docker-compose:

```bash
docker-compose up tesseract-mcp
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `9001` | Server port |
| `TESSERACT_API_URL` | `http://localhost:8081` | Tesseract backend URL |
| `LOG_LEVEL` | `info` | Logging level (debug, info, warn, error) |
| `SERVER_NAME` | `tesseract-mcp` | MCP server name |
| `NODE_ENV` | `development` | Environment (development, production) |

## Tools Catalog

### User Tools

#### 1. semantic-search

Search Satbase news corpus semantically using multilingual embeddings.

**Input:**
```json
{
  "query": "semiconductor supply chain Taiwan",
  "tickers": ["NVDA", "TSM"],
  "from_date": "2025-10-01",
  "to_date": "2025-10-21",
  "limit": 20
}
```

**Output:**
```json
{
  "query": "semiconductor supply chain Taiwan",
  "count": 18,
  "results": [
    {
      "id": "abc123",
      "score": 0.87,
      "title": "TSMC reports 5nm capacity at 95%",
      "text": "Taiwan Semiconductor Manufacturing...",
      "source": "gdelt",
      "url": "https://...",
      "published_at": "2025-10-15T14:30:00Z",
      "tickers": ["TSM", "NVDA"]
    }
  ]
}
```

#### 2. find-similar-articles

Find similar news articles to a given article using vector similarity.

**Input:**
```json
{
  "news_id": "abc123",
  "limit": 10
}
```

**Output:**
```json
{
  "source_article": {
    "id": "abc123",
    "title": "TSMC capacity constraints",
    "..."
  },
  "similar_articles": [
    {
      "id": "def456",
      "score": 0.91,
      "title": "Chip shortage affects auto",
      "..."
    }
  ]
}
```

### Admin Tools

#### 3. init-collection

Create a new versioned Qdrant collection and set up alias for zero-downtime updates.

**Input:** (none)

**Output:**
```json
{
  "status": "created",
  "collection": "news_embeddings_v1761065572",
  "alias": "news_embeddings"
}
```

#### 4. start-batch-embedding

Start background batch embedding of news articles from Satbase into Qdrant.

**Input:**
```json
{
  "from_date": "2025-10-01",
  "to_date": "2025-10-21"
}
```

**Output:**
```json
{
  "status": "started",
  "message": "Batch embedding from 2025-10-01 to 2025-10-21 started in background",
  "check_progress": "/v1/admin/embed-status"
}
```

**Note:** This can take several minutes. Use `get-embedding-status` to monitor progress.

#### 5. get-embedding-status

Get current batch embedding status, progress, and collection metadata.

**Input:** (none)

**Output:**
```json
{
  "collection_exists": true,
  "vector_count": 2408,
  "vector_size": 1024,
  "status": "running",
  "processed": 1800,
  "total": 2408,
  "percent": 74.8,
  "device": "cuda",
  "started_at": 1761065629,
  "updated_at": 1761065720,
  "error": null
}
```

#### 6. list-collections

List all Qdrant collections with metadata.

**Input:** (none)

**Output:**
```json
{
  "collections": [
    {
      "name": "news_embeddings_v1761065572",
      "points_count": 2408,
      "vector_size": 1024,
      "distance": "COSINE"
    }
  ],
  "active_alias": "news_embeddings",
  "active_target": "news_embeddings_v1761065572"
}
```

#### 7. switch-collection

Switch the active collection alias to a different collection (zero-downtime).

**Input:**
```json
{
  "name": "news_embeddings_v1761065999"
}
```

**Output:**
```json
{
  "status": "ok",
  "alias": "news_embeddings",
  "target": "news_embeddings_v1761065999"
}
```

#### 8. delete-collection

Delete a Qdrant collection (with safety checks - cannot delete active collection).

**Input:**
```json
{
  "collection_name": "news_embeddings_v1761065572"
}
```

**Output:**
```json
{
  "status": "deleted",
  "collection": "news_embeddings_v1761065572"
}
```

## Architecture

```
┌─────────────────────────────────┐
│   AI Agent (Claude/GPT/etc)     │
└──────────────┬──────────────────┘
               │ MCP Protocol
               │
┌──────────────▼──────────────────┐
│   Tesseract MCP Server          │
│   (Express + Streamable HTTP)   │
│   Port: 9001                    │
└──────────────┬──────────────────┘
               │ REST API
               │
┌──────────────▼──────────────────┐
│   Tesseract Backend (FastAPI)   │
│   Port: 8081                    │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│   Qdrant Vector DB              │
│   Port: 6333                    │
└─────────────────────────────────┘
```

## Health Check

```bash
curl http://localhost:9001/health
```

**Response:**
```json
{
  "status": "ok",
  "service": "tesseract-mcp",
  "version": "1.0.0",
  "tools": [
    "semantic-search",
    "find-similar-articles",
    "init-collection",
    "start-batch-embedding",
    "get-embedding-status",
    "list-collections",
    "switch-collection",
    "delete-collection"
  ]
}
```

## Logging

Structured JSON logs via Pino:
- **Development**: Pretty-printed with colors
- **Production**: JSON output for log aggregation

All tool invocations are logged with:
- Tool name
- Input parameters
- Duration (ms)
- Success/failure status
- Error details (if failed)

## Error Handling

All tools handle errors gracefully:
- HTTP errors from Tesseract backend (404, 500, etc.)
- Timeout errors (30s default, 5min for batch operations)
- JSON parsing errors
- Network errors

Errors are returned in MCP format with `isError: true` flag.

## License

MIT

