# MCP Integration Solution - Vercel AI SDK + Anthropic (October 2025)

## Problem
Vercel AI SDK's tool schema validation was failing with:
```
tools.0.custom.input_schema.type: Field required
```

Even though all MCP tools had valid schemas with `type: 'object'`.

## Root Cause
We were manually mapping MCP schemas using `experimental_createMCPClient` from the **Schema Discovery** approach, which has known compatibility issues with Anthropic.

## Solution: Three Approaches (in order of recommendation)

### ✅ APPROACH 1: Use `mcp-to-ai-sdk` CLI (RECOMMENDED - Production)

Vercel's official solution (September 2025):
- Generates **static tool definitions** from MCP servers
- Tools are vendored in your codebase (security, version control)
- No dynamic schema conversion issues
- Checked into git for code review

**Steps:**
```bash
npx mcp-to-ai-sdk https://localhost:3000/mcp
```

This creates: `src/tools/mcp-tools.ts` with AI SDK tool definitions

**Benefits:**
- ✅ Stable, no schema conversion errors
- ✅ Type-safe (TypeScript definitions generated)
- ✅ Version controlled (only changes on explicit updates)
- ✅ Selective loading (only include tools you need)
- ✅ Production-ready (Vercel official pattern)

---

### 🔧 APPROACH 2: Use Schema Definition Mode (Development)

Using **Schema Definition** mode with explicit tool definitions:

```typescript
const tools = await mcpClient.tools({
  schemas: {
    'list-news': {
      inputSchema: z.object({
        from: z.string(),
        to: z.string(),
        q: z.string().optional(),
      })
    }
  }
});

const result = await generateText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  tools: tools,  // ← Key: directly pass tools object
  prompt: 'Load news',
  maxSteps: 5
});
```

**Benefits:**
- ✅ Type-safe with explicit schemas
- ✅ Only loads tools you use
- ✅ Works with local stdio transport

---

### 🚀 APPROACH 3: HTTP/SSE Transport (Remote MCPs)

For remote MCP services:

```typescript
const mcpClient = await createMCPClient({
  transport: new StreamableHTTPClientTransport(
    new URL('http://localhost:3000/mcp'),
    { sessionId: 'session_123' }
  )
});

const tools = await mcpClient.tools();
```

---

## Our Implementation: Use Approach 2 Now

We can fix this RIGHT NOW with Schema Definition mode:

```typescript
// In orchestrator/src/agent-runner.ts

const mcpClients = new Map();

async function getTools(mcpNames: string[]) {
  const allTools = {};
  
  for (const mcpName of mcpNames) {
    let client = mcpClients.get(mcpName);
    if (!client) {
      const transport = new StdioClientTransport({
        command: 'node',
        args: [`../mcps/${mcpName}/dist/index-stdio.js`]
      });
      client = new Client({ name: mcpName, version: '1.0.0' });
      await client.connect(transport);
      mcpClients.set(mcpName, client);
    }
    
    // Use Schema Definition - only define the tools we need
    const tools = await client.tools({
      schemas: {
        // Explicitly define schemas for tools we want
      }
    });
    
    Object.assign(allTools, tools);
  }
  
  return allTools;
}
```

The KEY insight: Use `tools({ schemas: {...} })` not `tools()`.
