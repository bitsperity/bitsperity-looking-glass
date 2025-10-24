# Tesseract MCP - Quick Start Guide

## Development

```bash
cd mcps/tesseract
npm install
npm run dev
```

Server läuft auf: `http://localhost:9001`

## Testing mit MCP Inspector

In einem neuen Terminal:

```bash
npx @modelcontextprotocol/inspector
```

Dann im Inspector:
1. Connect to: `http://localhost:9001/mcp`
2. Tools werden automatisch discovered
3. Teste jedes Tool individual

## Production

```bash
npm run build
npm start
```

## Docker

```bash
# Build
docker build -t tesseract-mcp .

# Run
docker run -p 9001:9001 \
  -e TESSERACT_API_URL=http://host.docker.internal:8081 \
  tesseract-mcp

# Mit docker-compose
docker-compose up tesseract-mcp
```

## Health Check

```bash
curl http://localhost:9001/health
```

## Example Tool Calls

### Semantic Search

```bash
curl -X POST http://localhost:9001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "semantic-search",
      "arguments": {
        "query": "AI chip shortage Taiwan",
        "tickers": ["NVDA", "TSM"],
        "limit": 5
      }
    },
    "id": 1
  }'
```

### Find Similar Articles

```bash
curl -X POST http://localhost:9001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "find-similar-articles",
      "arguments": {
        "news_id": "your-article-uuid",
        "limit": 10
      }
    },
    "id": 1
  }'
```

### List Collections

```bash
curl -X POST http://localhost:9001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "list-collections",
      "arguments": {}
    },
    "id": 1
  }'
```

## Troubleshooting

### Port already in use

```bash
# Find process using port 9001
lsof -i :9001

# Kill process
kill -9 <PID>
```

### Tesseract backend not reachable

Check if Tesseract API is running:

```bash
curl http://localhost:8081/health
```

If not, start it:

```bash
docker-compose up tesseract-api
```

### Build errors

Clean and rebuild:

```bash
rm -rf node_modules package-lock.json dist
npm install
npm run build
```

## Environment Variables

Create `.env` file (optional):

```bash
PORT=9001
TESSERACT_API_URL=http://localhost:8081
LOG_LEVEL=debug
SERVER_NAME=tesseract-mcp
NODE_ENV=development
```

## Success Criteria

✅ Server starts without errors  
✅ Health endpoint returns 200  
✅ MCP Inspector can connect  
✅ All 8 tools are discovered  
✅ semantic-search returns results  
✅ Docker build succeeds  
✅ Docker run works  

## Next Steps

1. Test mit MCP Inspector durchführen
2. Alle 8 Tools einzeln testen
3. Integration mit AI Agent (Claude, GPT)
4. Production Deployment

