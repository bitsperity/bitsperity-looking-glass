# MCP TypeScript Development: State of the Art 2025

## Executive Summary

Nach umfassender Recherche (30+ Quellen, offizielle Docs, Production Best Practices, Real-World Templates) ist **TypeScript/JavaScript der de-facto Standard für MCP-Server-Entwicklung**. Die Kombination aus offiziellem SDK, reifer Toolchain und starker Community macht TS/JS zur optimalen Wahl für REST-API-Wrapper.

---

## 1. Offizielle SDK-Unterstützung

### TypeScript SDK (@modelcontextprotocol/sdk)
- **Status**: Offiziell von Anthropic maintained
- **Version**: 1.17.0 (aktiv developed, 700K weekly downloads)
- **NPM**: `@modelcontextprotocol/sdk`
- **GitHub**: `modelcontextprotocol/typescript-sdk`

**Vorteile für REST-API-Wrapping:**
- Native `async/await` für API-Calls
- Zod-Integration für Schema-Validierung (Input/Output)
- Eingebaute HTTP-Transport-Layer
- Express/Hono-kompatibel

---

## 2. Transports (Kritisch für unsere MCPs)

### Streamable HTTP (Recommended für Production, 2025-06-18 Spec)
- **Use Case**: Remote MCP-Server (Tesseract, Manifold, Ariadne)
- **Vorteile**:
  - Skalierbar (Horizontal scaling)
  - Streaming-Support
  - Session-Management optional
  - CORS-ready für Browser-Clients
  - DNS-Rebinding-Protection eingebaut

```typescript
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';

const app = express();
app.use(express.json());

app.post('/mcp', async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // Stateless mode
    enableJsonResponse: true
  });
  
  res.on('close', () => transport.close());
  
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});
```

### stdio (Development/Testing)
- **Use Case**: Lokale Tests, MCP Inspector
- Nicht für unsere Remote-Server relevant

---

## 3. Production Best Practices (15 Rules von The New Stack)

### Für REST-API-Wrapper besonders relevant:

**1. Bounded Context (Microservice-Orientierung)**
- ✅ 1 MCP = 1 Backend-Service
- Tesseract MCP → nur Tesseract API
- Manifold MCP → nur Manifold API
- Ariadne MCP → nur Ariadne API

**2. Stateless, Idempotent Tools**
- REST-GET = idempotent ✓
- REST-POST mit Client-Request-IDs
- Pagination via Tokens/Cursors

**3. Security First (OAuth 2.1 Mandatory für HTTP, ab March 2025 Spec)**
- OAuth 2.1 für HTTP-Transport
- Session-IDs ≠ Auth-Token
- Scopes pro Tool
- Keine Secrets in Responses

**4. Structured Content (June 2025 Spec)**
```typescript
server.registerTool('get-thought', {
  outputSchema: { id: z.string(), title: z.string(), content: z.string() },
}, async ({ id }) => {
  const thought = await api.getThought(id);
  return {
    content: [{ type: 'text', text: JSON.stringify(thought) }],
    structuredContent: thought // NEW: typed output für LLMs
  };
});
```

**5. Instrumentation (Production-Grade)**
- Structured Logs (Pino)
- Correlation IDs
- Latency/Success/Failure Metrics
- Rate-Limit-Hints

**6. Versioning & Capability Discovery**
- Semantic Versioning für Tools
- Capability-Ads beim Handshake
- Feature-Flags für neue Endpoints

---

## 4. Moderne Toolchain (2025 Standard)

### Empfohlener Stack (basierend auf Community Templates):

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.17.0",
    "express": "^4.19.0",
    "zod": "^3.23.0",
    "pino": "^9.0.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.0",
    "eslint": "^9.0.0",
    "prettier": "^3.3.0",
    "tsx": "^4.19.0"
  }
}
```

### Build-Setup:
- **Dev**: Node.js 22.18.0+ Type-Stripping (kein Build-Step, Live-Reload)
- **Prod**: Vite (ES Modules, optimiert)
- **Test**: Vitest (schnell, native ESM)

**Vorteil gegenüber Python:**
- Keine Transpilation in Dev (Node.js 22.18+ native TS)
- Async/Await nativ (nicht `asyncio`)
- JSON nativ (nicht `json.dumps()`)
- Express = bewährtes HTTP-Framework

---

## 5. Project Structure (Best Practice)

```
mcp-{service}-server/
├── src/
│   ├── index.ts           # MCP Server + Express
│   ├── config.ts          # Zod env validation
│   ├── logger.ts          # Pino setup
│   └── lib/
│       ├── tools/         # MCP Tools (API wrapper)
│       │   ├── search.ts
│       │   └── search.test.ts
│       ├── resources/     # MCP Resources
│       └── api-client.ts  # Backend API calls
├── Dockerfile
├── package.json
├── tsconfig.json
└── vite.config.ts
```

**Key Patterns:**
- Collocated Tests (`*.test.ts` neben Code)
- Zod für Input/Output-Schemas
- Config via Env-Vars (validiert)
- Logging mit strukturiertem JSON

---

## 6. Tool-Design für REST-API-Wrapper

### Pattern: 1 Tool = 1 Backend-Endpoint

**Beispiel: Tesseract Semantic Search**

```typescript
import { z } from 'zod';

server.registerTool(
  'semantic-search',
  {
    title: 'Semantic News Search',
    description: 'Search Satbase news corpus semantically',
    inputSchema: {
      query: z.string().describe('Search query'),
      tickers: z.array(z.string()).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      limit: z.number().default(20)
    },
    outputSchema: {
      count: z.number(),
      results: z.array(z.object({
        id: z.string(),
        score: z.number(),
        title: z.string(),
        text: z.string(),
        published_at: z.string(),
        tickers: z.array(z.string())
      }))
    }
  },
  async ({ query, tickers, from, to, limit }) => {
    const response = await fetch('http://tesseract-api:8081/v1/tesseract/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, filters: { tickers, from, to }, limit })
    });
    
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Error: ${response.statusText}` }],
        isError: true
      };
    }
    
    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      structuredContent: data
    };
  }
);
```

**Best Practices:**
- ✅ Zod-Schema = JSON-Schema für LLM
- ✅ `structuredContent` für typed Output
- ✅ Error-Handling mit `isError: true`
- ✅ HTTP-Client (fetch/axios) mit Timeout
- ✅ Async/Await nativ

---

## 7. Testing mit MCP Inspector

```bash
# Development
npm run dev

# In anderem Terminal
npx @modelcontextprotocol/inspector
# Connect to: http://localhost:3000/mcp
```

**Inspector Features:**
- Tool Discovery Testing
- Schema Validation
- Live Tool Execution
- Error-Path-Testing

---

## 8. Docker Production Setup

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

**Multi-Stage für kleinere Images:**
```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
```

---

## 9. Security (OAuth 2.1 für HTTP Transport)

### Mandatory ab MCP Spec 2025-03

```typescript
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => crypto.randomUUID(),
  enableDnsRebindingProtection: true,
  allowedHosts: ['127.0.0.1', 'localhost'],
  allowedOrigins: ['https://trusted-client.com']
});
```

**Für unsere MCPs:**
- OAuth 2.1 Proxy (Pomerium/Kong/Nginx)
- Scope-based Authorization
- Keine Auth-Logik im MCP-Server selbst (Separation of Concerns)

---

## 10. Performance & Monitoring

### Metrics to Track:
```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
});

server.registerTool('expensive-operation', ..., async (input) => {
  const start = performance.now();
  logger.info({ tool: 'expensive-operation', input }, 'Tool invoked');
  
  try {
    const result = await backend.call(input);
    const duration = performance.now() - start;
    
    logger.info({ tool: 'expensive-operation', duration, success: true }, 'Tool completed');
    return { content: [...], structuredContent: result };
  } catch (error) {
    logger.error({ tool: 'expensive-operation', error }, 'Tool failed');
    return { content: [...], isError: true };
  }
});
```

**Production KPIs:**
- P95 Latency < 500ms (für Impact Analysis depth=3)
- Success Rate > 99.5%
- Rate Limit Hints (Header/Meta)

---

## 11. Ecosystem & Community (Stand 2025)

### Adoption:
- ✅ Claude Desktop (Official)
- ✅ Cursor IDE
- ✅ VS Code (Extensions)
- ✅ OpenAI (seit 2025 Q2)
- ✅ Microsoft Copilot
- ✅ Amazon (Q Developer)

### TypeScript vs. Python SDK:
| Feature | TypeScript | Python |
|---------|-----------|--------|
| Official SDK | ✅ 1.17.0 | ✅ 1.x |
| Weekly Downloads | 700K | ~50K |
| HTTP Transport | ✅ Native | ✅ |
| Async/Await | ✅ Native | asyncio |
| JSON Handling | ✅ Native | json module |
| Community Templates | ✅ Viele | Wenige |
| REST-API-Wrapper | ✅ Optimal | ✅ OK |

**Fazit:** TypeScript ist der Community-Standard für MCP-Server (besonders für API-Wrapper).

---

## 12. Real-World Templates (Production-Ready)

### 1. Official MCP TypeScript Template
- **Repo**: `modelcontextprotocol/typescript-sdk` (examples/)
- Features: Streamable HTTP, stdio, Echo/SQLite Examples

### 2. Community Template (nickytonline)
- **Repo**: `nickytonline/mcp-typescript-template`
- **Features**:
  - Node.js 22.18+ Type-Stripping
  - Vite Production Build
  - Vitest Testing
  - Pino Logging
  - Zod Config Validation
  - Express + Streamable HTTP
  - Docker Production Setup

### 3. Speakeasy Auto-Generated MCPs
- **Tool**: Speakeasy SDK Generator
- **Input**: OpenAPI Spec
- **Output**: Full MCP Server (TS)
- **Use Case**: REST-API → MCP in Minuten

---

## 13. Workflow: REST-API → MCP-Server (TypeScript)

### Step-by-Step für unsere 3 MCPs:

**1. OpenAPI/Swagger → Zod Schemas**
```bash
npx openapi-zod-client -i ./openapi.json -o ./src/lib/schemas.ts
```

**2. API-Client-Wrapper**
```typescript
// src/lib/api-client.ts
export async function callBackend<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers }
  });
  if (!response.ok) throw new Error(`Backend error: ${response.statusText}`);
  return response.json();
}
```

**3. MCP Tool per Endpoint**
```typescript
// src/lib/tools/search.ts
import { searchSchema } from '../schemas';

export const searchTool = {
  name: 'search',
  config: {
    title: 'Search',
    description: 'Semantic search',
    inputSchema: searchSchema,
    outputSchema: searchResponseSchema
  },
  handler: async (input) => {
    const result = await callBackend('/v1/search', {
      method: 'POST',
      body: JSON.stringify(input)
    });
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
      structuredContent: result
    };
  }
};
```

**4. Register in Server**
```typescript
// src/index.ts
import { searchTool } from './lib/tools/search';

server.registerTool(searchTool.name, searchTool.config, searchTool.handler);
```

---

## 14. Empfohlene Projekt-Timeline

### Phase 1: Tesseract MCP (1-2 Tage)
- Template clonen
- 2 Tools: `semantic-search`, `similar-articles`
- Tesseract API-Client
- Docker Build
- Testing mit Inspector

### Phase 2: Manifold MCP (2-3 Tage)
- 10-15 Tools (CRUD, Search, Timeline, Relations, Promote, Admin)
- Batch-Operations (bulk quarantine, reembed)
- Error-Handling für 26 Endpoints
- Integration Tests

### Phase 3: Ariadne MCP (2-3 Tage)
- 20+ Tools (Read, Write, Learn, Validate, Ingest, Admin, Suggestions)
- Impact-Analysis (on-demand, depth<=3)
- Pattern/Regime/Hypothesis-Workflows
- Graph-Analytics

**Total: 5-8 Tage für 3 Production-Ready MCPs**

---

## 15. Deployment Strategy

### Docker Compose Setup:
```yaml
version: '3.8'

services:
  tesseract-mcp:
    build: ./mcp-tesseract
    ports: ['3001:3000']
    environment:
      - TESSERACT_API_URL=http://tesseract-api:8081
      - PORT=3000
    depends_on: [tesseract-api]

  manifold-mcp:
    build: ./mcp-manifold
    ports: ['3002:3000']
    environment:
      - MANIFOLD_API_URL=http://manifold-api:8083
      - PORT=3000
    depends_on: [manifold-api]

  ariadne-mcp:
    build: ./mcp-ariadne
    ports: ['3003:3000']
    environment:
      - ARIADNE_API_URL=http://ariadne-api:8082
      - PORT=3000
    depends_on: [ariadne-api]
```

---

## 16. Key Takeaways

### ✅ TypeScript ist die beste Wahl für MCP-Server weil:
1. **Official SDK**: Anthropic-maintained, 700K weekly downloads
2. **Native Async**: REST-APIs = async/await nativ
3. **JSON**: Keine Konvertierung nötig
4. **HTTP-Stack**: Express/Hono bewährt
5. **Toolchain**: Vite/Vitest/ESLint/Prettier mature
6. **Community**: Templates, Tutorials, Best Practices
7. **Production**: Streamable HTTP, OAuth 2.1, Monitoring

### ✅ Für unsere 3 MCPs (Tesseract, Manifold, Ariadne):
- **1 MCP = 1 Backend-Service** (Bounded Context)
- **1 Tool = 1 Endpoint** (Clear Mapping)
- **Zod = Schema** (Input/Output Validation)
- **Stateless** (keine Sessions im MCP)
- **Structured Content** (typed Output für LLMs)
- **Pino Logging** (Production-Grade)
- **Docker** (Horizontal Scaling)

### ✅ Workflow:
1. Template clonen (`nickytonline/mcp-typescript-template`)
2. OpenAPI → Zod Schemas
3. API-Client-Wrapper schreiben
4. 1 Tool pro Endpoint registrieren
5. Docker Build + Testing mit Inspector
6. Deploy mit OAuth 2.1 Proxy

---

## 17. Resources

### Official:
- SDK: https://github.com/modelcontextprotocol/typescript-sdk
- Docs: https://modelcontextprotocol.io/
- NPM: https://www.npmjs.com/package/@modelcontextprotocol/sdk
- Inspector: `npx @modelcontextprotocol/inspector`

### Templates:
- Nick Taylor: https://github.com/nickytonline/mcp-typescript-template
- Official Examples: https://github.com/modelcontextprotocol/typescript-sdk/tree/main/examples

### Best Practices:
- The New Stack: https://thenewstack.io/15-best-practices-for-building-mcp-servers-in-production
- Security: https://modelcontextprotocol.io/docs/best-practices/security

### Tools:
- Speakeasy: https://www.speakeasy.com/mcp (OpenAPI → MCP Auto-Gen)
- MCP Market: https://mcpmarket.com (Community MCP Directory)

---

## Nächste Schritte

1. **Template-Setup**: Nick Taylor's Template clonen für alle 3 MCPs
2. **API-Schemas**: OpenAPI/Swagger von Tesseract/Manifold/Ariadne extrahieren
3. **Tool-Mapping**: Excel mit Endpoint → Tool Mapping pro MCP
4. **Development**: 1 MCP pro Woche parallel entwickeln (je 2-3 Tage)
5. **Testing**: MCP Inspector + Integration Tests
6. **Deployment**: Docker Compose + OAuth Proxy (Pomerium?)
7. **Documentation**: README pro MCP mit Tool-Katalog

**Timeline: 2-3 Wochen für 3 Production-Ready MCPs** (mit Testing/Docs)

