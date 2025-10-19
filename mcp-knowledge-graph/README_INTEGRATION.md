# Knowledge Graph MCP — Integration ins Alpaca-Bot Repo

## Setup (bereits erledigt ✅)

### 1. MCP ist im Repo integriert
```bash
alpaca-bot/
├── mcp-knowledge-graph/        # Knowledge Graph MCP (lokal, kein Fork)
│   ├── dist/                   # Build-Output (executable)
│   ├── storage/                # Storage-Backends (SQLite, PostgreSQL)
│   ├── search/                 # Fuzzy Search Engine
│   └── package.json
│
├── knowledge_graph/            # Daten-Speicher (lokal, persistent)
│   └── knowledgegraph.db       # SQLite DB (auto-created)
│
└── .vscode/settings.json       # Cursor MCP-Konfiguration
```

### 2. Cursor ist konfiguriert
- `.vscode/settings.json` enthält MCP-Server-Config
- SQLite DB wird in `knowledge_graph/` gespeichert
- Project-ID: `alpaca-trading-bot`

### 3. Dependencies installiert
- `npm install` ✅
- `npm run build` ✅
- `dist/index.js` ist executable ✅

---

## Wie starten?

### Start MCP Server (für Cursor)
```bash
# Cursor startet automatisch beim Reload
# Oder manuell:
cd mcp-knowledge-graph
node dist/index.js
```

### Test ob MCP verfügbar ist (in Cursor)
1. Cursor neu laden (Cmd/Ctrl + Shift + P → "Developer: Reload Window")
2. In Chat: "List available MCP tools"
3. Sollte zeigen: `knowledge-graph` Server mit Tools

---

## Available Tools (Knowledge Graph MCP)

### Data Creation
- `create_entities`: CREATE new entities (companies, technologies, themes)
- `create_relations`: CONNECT entities (supplier, competitor, tailwind)
- `add_observations`: ADD facts to existing entities
- `add_tags`: ADD status/category tags (urgent, completed, etc.)

### Data Retrieval
- `read_graph`: RETRIEVE complete knowledge graph
- `search_knowledge`: SEARCH entities (text or tags, fuzzy/exact)
- `open_nodes`: RETRIEVE specific entities by name

### Data Management
- `delete_entities`: DELETE entities + relationships
- `delete_observations`: REMOVE specific facts
- `delete_relations`: UPDATE relationship structure
- `remove_tags`: UPDATE entity status

---

## Wie nutzen wir das?

### Workflow: Research → Graph-Update

#### 1. Macro Analyst schreibt Memo
```markdown
# research/macro/20241001-macro-memo.md

Fed announced QT taper, reducing balance sheet runoff from $95B/month to $60B/month.
ECB holds rates at 4.5%, signals potential cuts in Q1 2025.
Global liquidity expanding (+$200B in September).
```

#### 2. Graph-Extraction (via MCP)
```javascript
// In Cursor Chat (nach Memo):
"Extract entities and relationships from the macro memo and update knowledge graph"

→ Cursor nutzt MCP:
create_entities([
  {name: "Fed", entityType: "central_bank", observations: ["QT taper to $60B/month"], tags: ["US", "monetary_policy"]},
  {name: "ECB", entityType: "central_bank", observations: ["Rates at 4.5%", "Potential cuts Q1 2025"], tags: ["EU", "monetary_policy"]},
  {name: "Global_Liquidity", entityType: "theme", observations: ["+$200B in September"], tags: ["macro", "liquidity"]}
])

create_relations([
  {from: "Fed", to: "Global_Liquidity", relationType: "impacts"},
  {from: "ECB", to: "Global_Liquidity", relationType: "impacts"}
])
```

#### 3. Query Graph (später, im Synthesizer)
```javascript
// In Cursor Chat:
"Search knowledge graph for themes with positive liquidity impact"

→ Cursor nutzt MCP:
search_knowledge({
  query: "liquidity",
  exactTags: ["macro"],
  searchMode: "fuzzy"
})

→ Output:
{
  entities: [
    {name: "Global_Liquidity", observations: ["+$200B in September"], relations: [{from: "Fed", type: "impacts"}]}
  ]
}
```

---

## Schema für unser Use Case

### Node-Types (Entity Types)
- `company` (ticker, sector, market_cap)
- `technology` (name, maturity, adoption_rate)
- `theme` (name, growth_rate, TAM)
- `central_bank` (name, policy_stance)
- `event` (date, type, impact)
- `thesis` (company, conviction, rationale, date)

### Edge-Types (Relation Types)
- `supplier` (criticality: 0.0-1.0)
- `customer` (revenue_share: 0.0-1.0)
- `competitor` (overlap: 0.0-1.0)
- `tailwind` (strength: 0.0-1.0)
- `owns` (ownership)
- `exposure` (strength: 0.0-1.0)
- `impacts` (direction: positive/negative)
- `updates` (reason: string)

### Tag-Categories
- **Status**: `urgent`, `in-progress`, `completed`, `archived`
- **Geography**: `US`, `EU`, `China`, `global`
- **Sector**: `semiconductors`, `AI`, `biotech`, `fintech`
- **Conviction**: `high`, `medium`, `low`
- **Type**: `macro`, `micro`, `technical`, `fundamental`

---

## Integration in Agents

### Macro Analyst (updated mit MCP)
```markdown
# .cursor/rules/roles/MACRO_ANALYST.mdc

## Workflow (with Knowledge Graph MCP)
1. Websearch: "Global liquidity Q4 2024"
2. Write Memo: research/macro/YYYYMMDD-macro-memo.md
3. **Extract & Store (NEW)**:
   - Use MCP `create_entities` for central banks, themes, events
   - Use MCP `create_relations` for impacts, correlations
   - Use MCP `add_tags` for categorization (macro, liquidity, policy)
4. Output: Memo + Graph-Update-Confirmation
```

### Synthesizer (updated mit MCP)
```markdown
# .cursor/rules/roles/SYNTHESIZER.mdc

## Workflow (with Knowledge Graph MCP)
1. Read Memos: research/{macro,tech,markets}/*.md
2. **Query Graph (NEW)**:
   - MCP `search_knowledge`: "themes with positive tailwind to portfolio"
   - MCP `search_knowledge`: "suppliers with criticality > 0.8"
   - MCP `open_nodes`: Get full details on key entities
3. Combine: Memos + Graph-Insights → Executive Summary
4. Output: Tilts + Weights (informed by accumulated knowledge)
```

---

## Cursor Prompts (für Graph-Nutzung)

### Prompt: Extract Entities from Memo
```markdown
Task: Extract entities and relationships from the following memo and update knowledge graph.

Memo: {MEMO_CONTENT}

Instructions:
1. Identify entities (companies, technologies, themes, events)
2. Extract key observations (facts, data points)
3. Determine relationships (supplier, competitor, tailwind, impacts)
4. Assign tags (sector, geography, status, type)
5. Use MCP tools:
   - create_entities for new entities
   - create_relations for connections
   - add_observations if entity exists
   - add_tags for categorization

Output: Confirmation of graph updates with entity/relation counts.
```

### Prompt: Query Graph for Tilts
```markdown
Task: Query knowledge graph to inform portfolio tilts.

Context: We need to identify themes/companies with strong tailwinds based on accumulated knowledge.

Instructions:
1. Use MCP `search_knowledge` to find:
   - Themes with tags ["macro", "positive"]
   - Companies with exposure to these themes (via relations)
   - Suppliers with criticality > 0.8 (via observations)
2. Use MCP `open_nodes` to get full details on top candidates
3. Synthesize: Graph-Insights → Recommended Tilts

Output: Ranked list of tilts with rationale from knowledge graph.
```

---

## Next Steps

### Phase 1: Test MCP in Cursor ✅
1. ✅ Cursor neu laden
2. ✅ "List MCP tools" → sollte `knowledge-graph` zeigen
3. ✅ Test: `create_entities([{name: "Test", entityType: "test", observations: ["test"]}])`

### Phase 2: Erste Graph-Updates (heute)
1. Nimm 1 bestehendes Macro-Memo (falls vorhanden)
2. Extrahiere Entities/Relations manuell
3. Update Graph via Cursor Chat
4. Query Graph → verifiziere

### Phase 3: Prompts schreiben (morgen)
1. `prompts/graph_extract.md` (Memo → Entities/Relations)
2. `prompts/graph_query.md` (Query → Tilts)
3. Update Agent-Rules (MACRO_ANALYST.mdc, SYNTHESIZER.mdc)

### Phase 4: Automatisierung (nächste Woche)
1. Jeder Agent ruft automatisch Graph-Extraction auf
2. Synthesizer nutzt Graph für Queries
3. Conviction-Tracking über Zeit

---

## Troubleshooting

### MCP Server startet nicht
```bash
# Check ob dist/index.js existiert
ls -la mcp-knowledge-graph/dist/index.js

# Check ob executable
chmod +x mcp-knowledge-graph/dist/index.js

# Manual test
cd mcp-knowledge-graph
node dist/index.js
```

### Cursor zeigt MCP nicht
1. Reload Window (Cmd/Ctrl + Shift + P)
2. Check `.vscode/settings.json` (richtig formatiert?)
3. Check Cursor-Version (MCP Support ab v0.40+)

### SQLite DB wird nicht erstellt
```bash
# Check Ordner existiert
ls -la knowledge_graph/

# Check Permissions
chmod 755 knowledge_graph/

# Manual DB creation (optional)
sqlite3 knowledge_graph/knowledgegraph.db "CREATE TABLE test (id INTEGER);"
```

---

## Warum lokal im Repo (kein Fork)?

### Vorteile:
- ✅ **Direkt erweiterbar**: Wir können MCP-Code anpassen (z.B. neue Tools, Schema-Erweiterungen)
- ✅ **Keine Upstream-Abhängigkeit**: Keine Sync-Probleme mit Original-Repo
- ✅ **Versionskontrolle**: Änderungen am MCP = Teil unserer Git-History
- ✅ **Deployment**: Alles in einem Repo → einfacher Deploy

### Trade-offs:
- ❌ Keine automatischen Updates vom Original (aber wir wollen eh customizen)
- ❌ Etwas mehr Code im Repo (aber MCP ist klein, ~350 packages)

**Entscheidung**: Lokal im Repo = richtig, weil wir MCP erweitern werden (custom tools, schema, etc.)

