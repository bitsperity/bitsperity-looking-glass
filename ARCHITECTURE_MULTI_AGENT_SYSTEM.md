# Multi-Agent Orchestration Architecture: World-Modeling & Trading

**Problem Statement**:  
Wir wollen die Welt beobachten (News/Preise/Macro), Zusammenhänge verstehen (Embeddings/Graph), Rückschlüsse ziehen (Hypothesen), Wissen aufbauen (Memory), vernetzen (Graph) und auf Basis dieses Weltmodels Trading-Entscheidungen treffen.

**Core Design Principles**:
- **Agents sind zeitlos**: Keine Themen/Ticker hardcoded in Prompts
- **Watchlists als Steuerung**: Agents verwalten täglich, was sie beobachten
- **MCP-Native Outputs**: Qualitative Outputs → Manifold/Ariadne (Persistence), nicht Files
- **Observability-Only Files**: Chat-Verlauf (Prompt/Tools/Response) loggbar für UI-Replay
- **Agent Rules**: Ähnlich Cursor Rules – Dokumentation der MCPs pro Agent
- **Per-Agent Models**: Haiku für Routing/Einfaches, Sonnet 4.5 für komplexe Reasoning
- **Trade-Hypothesis-Loop**: Jeder Trade verknüpft mit Hypothesis; post-trade Evaluation für Learning

---

## 1. System-Rollen (4 MCPs + Orchestrator)

### **Satbase**: "Das Sensorium" (Datenquelle)
**Kapazität**:
- News-Corpus: semantisch durchsuchbar, nach Ticker/Datum/Thema filterbar
- Preise: OHLCV, historisch, per Ticker
- Macro: FRED (Wirtschaftsindikatoren), nach Serie/Datum
- Watchlist-Management: gezielt Ingestion für wichtige Tickers
- Topics-Management: gezielt News-Feeds für Themen

**Agent-Facing Tools** (11):
- `list-news`, `news-heatmap`, `trending-tickers` (Discovery)
- `list-prices`, `fred-observations`, `fred-categories` (Enrichment)
- `enqueue-news` (Ingestion trigger)
- `get-watchlist`, `add-watchlist`, `refresh-watchlist` (Steuerung)

**Workflow-Role**:
- Agents rufen **täglich** `get-watchlist` auf, erhalten ihre zu beobachtenden Tickers
- Agents verwalten ihre Watchlist (`add-watchlist` bei neuen Signals)
- Scheduler triggert täglich `refresh-watchlist` (kein Agent)

---

### **Tesseract**: "Das Sehvermögen" (Semantic Understanding)
**Kapazität**:
- Embeddings aller News (multilingual-e5-large)
- Semantic Search (cosine similarity)
- "Find Similar" (verwandte Articles)
- Batch-Embedding (neue News in Qdrant)

**Agent-Facing Tools** (7):
- `semantic-search`: Query (free-form) + optional Filter (Tickers/Datum) → ähnliche Articles + Scores
- `find-similar-articles`: News-ID → Cluster
- `start-batch-embedding`, `get-embedding-status` (Admin)

**Workflow-Role**:
- Analyst Agents nutzen `semantic-search` mit offenen Queries ("supply chain bottleneck", "regulatory risk")
- Validator Agent nutzt `semantic-search` um Hypothesen gegen Article-Base zu verifizieren (neu!)
- Scheduler triggert täglich `start-batch-embedding`

---

### **Manifold**: "Die Gedanken" (Episodic Memory)
**Kapazität**:
- **Thoughts**: Erkenntnisse speichern (type: signal/pattern/risk/opportunity/trade-idea/meta, title, body, tickers, tags, status, confidence)
- **Search**: Full-Text + Semantic über Thoughts
- **Relations**: Thoughts verlinken (supports, contradicts, followup, related)
- **Graph**: Visuell durchsuchbar

**Agent-Facing Tools** (25):
- `mf-create-thought`: Insight speichern (Agent → Manifold)
- `mf-search`: Ähnliche Thoughts finden (für Deduplication/Linking)
- `mf-link-related`: Zwischen Thoughts verlinken
- `mf-promote-thought`: Thought → Ariadne KG (high-confidence)

**Workflow-Role**:
- **Analyst Output**: Jede Erkenntnis → Thought (type: signal/pattern/risk)
- **Trader Output**: Jede Trade-Idee → Thought (type: trade-idea)
- **Feedback Loop**: Post-trade, Reflection Agent updatet Thought mit Outcome

---

### **Ariadne**: "Das Weltmodell" (Causal Graph + Validation)
**Kapazität**:
- **Graph**: Entities (Company, Event, Regime, …), Relations (AFFECTS, SUPPLIES_TO, …)
- **Hypotheses**: "If X, then Y"; Evidence sammeln; Validation Workflow
- **Patterns**: Erkannte Kausalitäten (z. B. "TSMC disruption → NVIDIA GPU shortage")
- **Market Regimes**: Marktphasen (crisis, recovery, boom, …)
- **Impact Ranking**: "CHIPS Act → welche Entities am stärksten betroffen?"

**Agent-Facing Tools** (25):
- `ar-add-hypothesis`: Kausalitäts-These erstellen (Analyst → Ariadne)
- `ar-add-evidence`: Supporting/Contradicting Evidence sammeln (Validator)
- `ar-validate-hypothesis`: These validieren (→ Pattern)
- `ar-add-fact`: Entity + Relation speichern
- `ar-add-observation`: Beobachtung (Market Event, …)
- `ar-context`, `ar-timeline`, `ar-impact`, `ar-patterns-search`, `ar-regimes-current` (Abfrage)

**Workflow-Role**:
- **Analyst Output**: High-confidence Signals → Hypotheses in Ariadne
- **Validator**: Validiert Hypotheses via Evidence (News, Prices, Thoughts)
- **Trader**: Queries Ariadne (Patterns, Regimes, Impact) → Trade Ideas

---

## 2. Agent-Rollen & Durchführung (4–5 Agents)

### **Agent 1: Discovery Agent** (täglich 06:00 UTC, ~2–3 min)
**Zweck**: "Was ist heute im Fokus?"

**Model**: Claude Haiku 4.5 (simple routing)

**High-Level Prompt** (zeitlos, generisch):
```
Du bist der Discovery Agent. Deine Aufgabe:
1. Lade deine Watchlist (Satbase)
2. Für jede Watchlist-Kategorie (Tech, Biotech, …): Hole News-Volumen und Trends
3. Identifiziere die TOP-5 Entwicklungen des Tages (nach Volumen und Volatilität)
4. Speichere pro Discovery als Thought (type: signal)

Nutze folgende MCPs: Satbase (watchlist, heatmap, trending), Manifold (create-thought).
```

**Workflow** (deterministisch):
```
1. Call: satbase.get-watchlist() → {tech: [NVDA, ASML, …], biotech: [MRNA, …], …}
2. For each category:
   a. Call: satbase.news-heatmap(category) → {topic: count, …}
   b. Call: satbase.trending-tickers() → top 10 tickers by news volume
3. LLM Reasoning: Synthesize → TOP-5 Discoveries
4. For each discovery:
   Call: manifold.mf-create-thought({
     type: 'signal',
     title: 'Discovery: {theme}',
     body: 'Volume: {count}, affected_tickers: {list}, confidence: 0.6'
     tags: [discovery, {category}],
     tickers: […]
   })
5. Return: UUID der erstellten Thoughts
```

**Output**: Manifold Thoughts (nicht Files)

---

### **Agent 2: Analyst Agents** (5x täglich, parallel Batches)
**Zweck**: "Warum ist das wichtig? Welche Kausalitäten?"

**Model**:
- Tech, Biotech, Macro Analysts: Claude Sonnet 4.5 (complex reasoning)
- Commodities, Geopolitics: Claude Haiku 4.5 (lower variance data)

**High-Level Prompt** (zeitlos):
```
Du bist ein Investment Analyst für Sektor {sector}.
Deine Aufgabe:
1. Lade deine Watchlist
2. Sammle News, Preise, Makro-Daten der letzten 48h
3. Identifiziere Kausalitäten: Warum bewegen sich Preise? Welche Supply-Chain-Effekte?
4. Formuliere Hypothesen (Ariadne) und Signals (Manifold)

Nutze: Satbase (news, prices, fred), Tesseract (semantic search), Manifold (thoughts), Ariadne (hypotheses).
```

**Workflow**:
```
1. Call: satbase.get-watchlist(sector=self.sector) → tickers
2. Call: satbase.list-news(tickers, date_range: last_48h, limit: 100)
3. Call: tesseract.semantic-search(queries: ["supply chain", "demand", "regulation"], tickers, limit: 50)
4. Call: satbase.list-prices(tickers, date_range: last_7d)
5. Call: satbase.fred-observations(macros: […]) // OPTIONAL, sector-specific
6. LLM Reasoning: 
   a. Synthesize News + Semantic Articles + Price Moves
   b. Identify Patterns: "ASML capacity constraint → NVDA GPU shortage"
   c. Formulate Hypotheses & Signals
7. For each Signal:
   Call: manifold.mf-create-thought({type: 'signal', …})
8. For each Hypothesis:
   Call: ariadne.ar-add-hypothesis({
     statement: '...',
     source: analyst_agent,
     confidence: 0.65  // initial
   })
   Call: manifold.mf-create-thought({
     type: 'hypothesis',
     body: '...linked to ar_hypothesis_id...',
     …
   })
9. Return: Created Thought/Hypothesis IDs
```

**Schedule**: 
- Batch 1 (08:00 UTC): Tech, Biotech, Commodities (parallel, ~8 min)
- Batch 2 (16:00 UTC): Macro, Geopolitics (parallel, ~6 min)

**Output**: Manifold Thoughts + Ariadne Hypotheses (not files)

---

### **Agent 3: Validator Agent** (täglich 18:00, ~5 min)
**Zweck**: "Sind unsere Hypothesen korrekt?"

**Model**: Claude Sonnet 4.5 (complex reasoning + multiple MCPs)

**High-Level Prompt**:
```
Du bist der Validator Agent.
Deine Aufgabe:
1. Lade alle pending Hypotheses aus Ariadne
2. Für jede Hypothesis: Sammle Evidence (News, Preise, Gedanken in Manifold)
3. Evaluiere: Wird die Hypothesis bestätigt oder widerlegt?
4. Speichere Evidence und eventuell Validierung

Nutze: Satbase (news, prices), Tesseract (semantic search über articles), Manifold (search thoughts), Ariadne (evidence, validate).
```

**Workflow**:
```
1. Call: ariadne.ar-pending-validations(min_annotations: 1) → [hyp1, hyp2, …]
2. For each hypothesis:
   a. Call: ariadne.ar-get-hypothesis(id) → full hypothesis + evidence_count
   b. Call: manifold.mf-search(query: hypothesis.statement) → supporting/contradicting thoughts
   c. Call: satbase.list-news(query: hypothesis.keywords, limit: 20)
   d. Call: tesseract.semantic-search(query: hypothesis.statement, limit: 30)  // NEW: Tesseract!
   e. Call: satbase.list-prices(tickers: hypothesis.tickers, date_range: last_7d)
3. LLM Reasoning: Score confidence (0–1) for validation
4. For supporting evidence:
   Call: ariadne.ar-add-evidence(hypothesis_id, {
     type: supporting,
     evidence: trade outcome,
     confidence: based on P&L
   })
5. If confidence >= 0.75:
   Call: ariadne.ar-validate-hypothesis(hypothesis_id, {
     decision: 'validate',
     reasoning: '...'
   })
   (This creates a Pattern in Ariadne)
6. Return: Validated/Rejected Hypotheses
```

**Output**: Ariadne Evidence + Validated Hypotheses/Patterns (not files)

---

### **Agent 4: Trader Agent** (täglich 22:00, ~8 min)
**Zweck**: "Auf Basis des Weltmodells: Trade Ideas?"

**Model**: Claude Sonnet 4.5 (complex multi-system reasoning)

**High-Level Prompt**:
```
Du bist der Trader Agent.
Deine Aufgabe:
1. Lade alle validated Patterns aus Ariadne (confidence >= 0.8)
2. Für jedes Pattern: Berechne Impact, aktuelle Preise, Risk/Reward
3. Formuliere Trade-Ideen mit Hypothesen-Verknüpfung
4. Speichere Trade-Ideas in Manifold und Ariadne

Nutze: Ariadne (patterns, impact, regimes), Satbase (prices), Manifold (create-thought).
```

**Workflow**:
```
1. Call: ariadne.ar-patterns-search(min_confidence: 0.8) → [pat1, pat2, …]
2. Call: ariadne.ar-regimes-current() → current market regime
3. For each pattern:
   a. Call: ariadne.ar-impact(pattern_id, k: 5) → top 5 impacted entities
   b. Call: satbase.list-prices(entities, date_range: last_5d)
   c. Call: manifold.mf-search(query: pattern.description) → related thoughts (risk/opportunity)
4. LLM Reasoning: Evaluate trade feasibility, size, risk
5. For each viable trade idea:
   a. Create Thought:
      Call: manifold.mf-create-thought({
        type: 'trade_idea',
        title: '{action} {ticker}',
        body: 'Entry: {price}, Stop: {stop}, Target: {target}, Thesis: {thesis}',
        tags: [trade, pattern.id, regime],
        tickers: [{ticker}],
        confidence: 0.7,  // trade idea confidence
        custom_metadata: {
          entry_price: ...,
          stop_loss: ...,
          take_profit: ...,
          position_size: ...,
          leverage: ...
        }
      })
   b. Link to Pattern Hypothesis:
      Call: ariadne.ar-add-hypothesis({
        statement: 'Trade {action} {ticker} based on {pattern}',
        source: trader_agent,
        linked_pattern_id: pattern.id,
        confidence: 0.7
      })
      Store hypothesis_id in trade_idea thought.
   c. Link Thought to Pattern:
      Call: manifold.mf-link-related(
        thought_id: trade_idea.id,
        related_id: pattern_hypothesis.id,
        relation_type: 'trade_based_on'
      )
6. Return: Created Trade Ideas with Hypothesis Links
```

**Output**: Manifold Thoughts (type: trade_idea) + Ariadne Hypotheses (not files)

---

### **Agent 5: Reflection Agent** (weekly Sunday 23:00, optional)
**Zweck**: "Lernen: Was stimmte? Was nicht?"

**Model**: Claude Haiku 4.5 (summary/aggregation)

**High-Level Prompt**:
```
Du bist der Reflection Agent.
Deine Aufgabe:
1. Lade alle Trade-Ideas der Woche (Manifold Thoughts)
2. Für jede Trade: Wurde geschlossen? Mit welchem Outcome?
3. Evaluiere: Waren die Hypothesen korrekt? Accuracy?
4. Speichere Learnings für nächste Woche

Nutze: Manifold (search trade ideas, create thought), Ariadne (validate hypotheses with outcome).
```

**Workflow**:
```
1. Call: manifold.mf-search(type: 'trade_idea', days_back: 7) → [trade1, trade2, …]
2. For each trade_idea:
   a. Fetch outcome (manually logged or auto-closed)
   b. Call: ariadne.ar-get-hypothesis(trade_idea.linked_hypothesis_id)
   c. Score accuracy (P&L / thesis validation)
3. Aggregate: Which patterns were predictive? Which sectors?
4. Call: manifold.mf-create-thought({
     type: 'meta',
     title: 'Weekly Reflection {week}',
     body: 'Accuracy: {pct}, Best sector: {sector}, Learnings: {…}',
     tags: ['reflection', 'weekly', 'learning']
   })
```

**Output**: Manifold Thought (type: meta, not files)

---

## 3. Watchlist Management (Central Control)

Watchlists sind **die zentrale Steuerung**, nicht Prompts.

### Watchlist Structure (per Agent)
```yaml
watchlists:
  discovery:
    # Autoupdate, always sync
    categories: [tech, biotech, commodities, macro, geopolitics]
    
  analyst_tech:
    tickers: [NVDA, ASML, TSM, AMD, INTC, CRM, MSFT, GOOGL]
    refresh_frequency: "daily"  # or "triggerd_by_discovery"
    themes: []  # NOT in prompt! Derived from Satbase themes
    
  analyst_biotech:
    tickers: [MRNA, BNTX, AMGN, JNJ, LLY]
    refresh_frequency: "daily"
    
  analyst_macro:
    tickers: [SPY, TLT, DXY]
    macro_series: [UNRATE, CPIAUCSL, FEDFUNDS]  # FRED series IDs
    refresh_frequency: "daily"
```

### Watchlist Management Workflow
```
Daily 05:30 UTC (before Discovery Agent):
1. For each agent:
   Call: satbase.get-watchlist(agent_name) → current
   Call: satbase.refresh-watchlist(agent_name) → load latest data
2. Analyst Agents (during run):
   Call: satbase.add-watchlist(new_ticker) → if discovery found interesting new ticker
   (e.g., "I found a supplier bottleneck in {ticker}, adding to watchlist for next run")
```

---

## 4. Agent Rules (Cursor Rules für Agents)

Jeder Agent hat eine **Agent Rules File** (Markdown), ähnlich Cursor `.cursorrules`:

### Example: Tech Analyst Rules

```markdown
# Tech Analyst Rules

## Identity
You are an Investment Analyst specialized in semiconductors, AI, and software.

## MCPs & Their Purposes

### Satbase
- **get-watchlist**: Load your daily tickers to analyze
- **list-news**: Get news for your tickers
- **list-prices**: Get OHLCV data
- **news-heatmap**: Understand topic trends
- **add-watchlist**: When you discover a new interesting ticker, add it

### Tesseract
- **semantic-search**: Find related articles by meaning (not keyword)
- Example: Query "chip shortage supply chain" finds articles about production, logistics, disruption

### Manifold
- **mf-create-thought**: Store insights
  - type: 'signal' for observations, 'pattern' for recognized repetitions
  - confidence: 0.5–1.0 (0.5 = uncertain, 1.0 = certain)
  - tags: instrument, theme, sector for later grouping

### Ariadne
- **ar-add-hypothesis**: Formulate causal theories ("If X, then Y")
- **ar-get-context**: Understand existing graph for your tickers

## Workflow

1. **Gather**: Load watchlist, news, prices, semantic articles
2. **Analyze**: Identify causal chains (supply chain, demand, regulation, competition)
3. **Formulate**: Create Hypotheses in Ariadne (not yet validated)
4. **Store**: Save Signals as Thoughts in Manifold
5. **Link**: Connect new Thoughts to existing Thoughts/Hypotheses

## Confidence Scoring
- 0.5: "I've heard rumors" (very uncertain)
- 0.7: "News + Price action aligned" (likely)
- 0.9: "Multiple sources + data confirm" (very likely)

## Do's & Don'ts
- ✅ Use watchlist, don't hardcode tickers
- ✅ Cite sources (article headline, price move %)
- ✅ Link to existing Thoughts (avoid duplicates)
- ❌ Don't claim certainty > 0.8 (Validator will check)
- ❌ Don't ignore contradicting evidence
```

---

## 5. Policy Configuration (Lightweight)

Policies sind **nicht** Step-basiert, sondern **Rollen + Budget**:

```yaml
# config/agent-policies.yaml
agents:
  discovery:
    model: "claude-haiku-4-5"
    max_tokens: 8000
    timeout_minutes: 3
    retry_strategy: "exponential_backoff"
    budget_daily_tokens: 8000
    rules_file: "./agent-rules/discovery.md"
    
  analyst_tech:
    model: "claude-sonnet-4-5"
    max_tokens: 15000
    timeout_minutes: 8
    budget_daily_tokens: 15000
    rules_file: "./agent-rules/analyst-tech.md"
    
  analyst_biotech:
    model: "claude-haiku-4-5"
    max_tokens: 10000
    timeout_minutes: 6
    budget_daily_tokens: 10000
    rules_file: "./agent-rules/analyst-biotech.md"
    
  analyst_macro:
    model: "claude-sonnet-4-5"
    max_tokens: 12000
    timeout_minutes: 7
    budget_daily_tokens: 12000
    rules_file: "./agent-rules/analyst-macro.md"
    
  analyst_commodities:
    model: "claude-haiku-4-5"
    max_tokens: 8000
    timeout_minutes: 6
    budget_daily_tokens: 8000
    rules_file: "./agent-rules/analyst-commodities.md"
    
  analyst_geopolitics:
    model: "claude-haiku-4-5"
    max_tokens: 8000
    timeout_minutes: 6
    budget_daily_tokens: 8000
    rules_file: "./agent-rules/analyst-geopolitics.md"
    
  validator:
    model: "claude-sonnet-4-5"
    max_tokens: 20000
    timeout_minutes: 8
    budget_daily_tokens: 20000
    rules_file: "./agent-rules/validator.md"
    
  trader:
    model: "claude-sonnet-4-5"
    max_tokens: 20000
    timeout_minutes: 10
    budget_daily_tokens: 20000
    rules_file: "./agent-rules/trader.md"
    
  reflection:
    model: "claude-haiku-4-5"
    schedule: "0 23 * * 0"  # Weekly
    max_tokens: 12000
    budget_weekly_tokens: 12000
    rules_file: "./agent-rules/reflection.md"

llm_budget:
  daily_tokens: 101000  # See breakdown below
  monthly_budget_usd: 50  # Hard limit
  
# Token budget breakdown (daily):
# discovery: 8k
# analyst_tech: 15k
# analyst_biotech: 10k  
# analyst_macro: 12k
# analyst_commodities: 8k
# analyst_geopolitics: 8k
# validator: 20k
# trader: 20k
# Total: 101k tokens/day

schedule:
  discovery:
    cron: "0 6 * * *"
    
  analyst_batch_1:
    cron: "0 8 * * *"
    agents: [analyst_tech, analyst_biotech, analyst_commodities]
    parallel: true
    
  analyst_batch_2:
    cron: "0 16 * * *"
    agents: [analyst_macro, analyst_geopolitics]
    parallel: true
    
  validator:
    cron: "0 18 * * *"
    
  trader:
    cron: "0 22 * * *"
    
  reflection:
    cron: "0 23 * * 0"
    enabled: true
```

---

## 6. Cost Breakdown (Updated with Haiku 4.5)

**Haiku 4.5**: $1 input / $5 output per 1M tokens  
**Sonnet 4.5**: $3 input / $15 output per 1M tokens

Assuming ~70% input tokens, 30% output:

| Agent | Model | Tokens/Day | Cost/Day |
|-------|-------|-----------|----------|
| Discovery | Haiku | 8k | $0.006 |
| Analyst Tech | Sonnet | 15k | $0.050 |
| Analyst Biotech | Haiku | 10k | $0.007 |
| Analyst Macro | Sonnet | 12k | $0.038 |
| Analyst Commodities | Haiku | 8k | $0.006 |
| Analyst Geopolitics | Haiku | 8k | $0.006 |
| Validator | Sonnet | 20k | $0.065 |
| Trader | Sonnet | 20k | $0.065 |
| **Daily Total** | - | **101k** | **~$0.24** |
| **Monthly Total** | - | **~3M** | **~$7** |

**Weekly Reflection** (optional): +$0.02 → ~$8.5/month

✅ **Well under $50/month!**

---

## 7. Trade-Hypothesis-Loop (Learning)

Jeder Trade ist eine "Experiment", verknüpft mit einer Hypothesis:

### Trade Creation (Trader Agent)
```
1. Create Thought (type: trade_idea, with metadata)
2. Create Hypothesis (statement: "NVDA long based on supply chain recovery pattern")
3. Link: trade_idea.thought ← relates_to → hypothesis.ariadne
4. Store: trade_id, entry_price, stop_loss, take_profit, position_size
```

### Trade Execution (External or Manual)
```
Execute trade with entry_price, position_size, stop_loss, take_profit
Log execution event in Ariadne: ar-add-fact(trader, executed_trade, position_id)
```

### Trade Close (End of Day / Position Stop)
```
Log outcome: P&L, exit_price, reason (stop loss / take profit / manual)
Store in Ariadne: ar-add-observation({
  content: "Trade closed: {ticker} {action} {P&L}%",
  tags: [trade_close, position_id]
})
```

### Post-Trade Hypothesis Evaluation (Reflection Agent)
```
1. Load trade_idea Thought
2. Fetch linked hypothesis from Ariadne
3. Evaluate:
   - Was the hypothesis correct? (Check price action, news, etc.)
   - Confidence before vs. after (Did actual outcome change our belief?)
4. ar-add-evidence(hypothesis, {
     type: supporting / contradicting,
     evidence: trade outcome,
     confidence: based on P&L
   })
5. If trade was profitable AND hypothesis correct:
   ar-validate-hypothesis → Pattern (for next Trader runs)
6. Store learning in Manifold (type: meta)
```

---

## 8. Observability & Logging (UI-Replay)

Agents sollen **nicht** Outputs in Files speichern, aber wir loggen **Chat-Verlauf** für UI-Replay:

```json
{
  "run_id": "analyst-tech__2025-10-25T08:00:00Z__uuid",
  "agent": "analyst_tech",
  "timestamp": "2025-10-25T08:00:00Z",
  "status": "completed",
  "duration_seconds": 7.3,
  
  "chat_history": [
    {
      "role": "user",
      "content": "[Agent Rules (from file) + High-level Prompt]"
    },
    {
      "role": "assistant",
      "content": "I'll analyze the tech sector. Let me start by loading my watchlist...",
      "tool_calls": [
        {"tool": "satbase.get-watchlist", "args": {"agent": "analyst_tech"}}
      ]
    },
    {
      "role": "user",
      "content": "Tool result: {tickers: [NVDA, ASML, TSM, ...], …}"
    },
    ... (tool calls) ...
    {
      "role": "assistant",
      "content": "Based on news + price action, I've identified 3 signals...",
      "tool_calls": [
        {"tool": "manifold.mf-create-thought", "args": {...}}
      ]
    }
  ],
  
  "outputs": {
    "created_thoughts": ["thought_id_1", "thought_id_2"],
    "created_hypotheses": ["hyp_id_1"]
  },
  
  "tokens": {
    "input": 12000,
    "output": 3000,
    "total": 15000,
    "cost_usd": 0.05
  }
}
```

This gets stored in a **timeseries DB** (optional: InfluxDB/Prometheus) or **S3** under `observability/runs/YYYY-MM-DD/`:
```
s3://alpaca-bot/observability/runs/2025-10-25/
  ├── analyst-tech__08:00:00Z__uuid.jsonl
  ├── validator__18:00:00Z__uuid.jsonl
  └── trader__22:00:00Z__uuid.jsonl
```

**UI Frontend** can then replay the chat history: User sees "Agent ran at 08:00, here's the chat, tools called, outputs created, tokens spent."

---

## 9. Integration: Orchestrator Bootstrap

```typescript
// src/main.ts
import cron from 'node-cron';
import { MCPPool } from './mcp-clients/mcp-pool';
import { PolicyLoader } from './policies/policy-loader';
import { TokenBudgetManager } from './budget/token-budget';
import { DiscoveryAgent, AnalystAgent, ValidatorAgent, TraderAgent, ReflectionAgent } from './agents';
import { runAgent } from './agent-runner';

async function main() {
  const mcpPool = await MCPPool.initialize();
  const policies = await PolicyLoader.load('./config/agent-policies.yaml');
  const budget = new TokenBudgetManager(policies.llm_budget);
  
  // Discovery (06:00 UTC)
  cron.schedule(policies.schedule.discovery.cron, async () => {
    const agent = new DiscoveryAgent(mcpPool, policies.agents.discovery);
    await runAgent(agent, budget);
  });
  
  // Analyst Batch 1 (08:00 UTC, parallel)
  cron.schedule(policies.schedule.analyst_batch_1.cron, async () => {
    const agents = [
      new AnalystAgent(mcpPool, policies.agents.analyst_tech, 'tech'),
      new AnalystAgent(mcpPool, policies.agents.analyst_biotech, 'biotech'),
      new AnalystAgent(mcpPool, policies.agents.analyst_commodities, 'commodities')
    ];
    await Promise.all(agents.map(a => runAgent(a, budget)));
  });
  
  // ... similar for batch_2, validator, trader, reflection
  
  logger.info('Orchestrator running. Schedule active.');
}

main().catch(e => {
  logger.error(e, 'Orchestrator failed');
  process.exit(1);
});
```

---

## 10. Summary: Principles & Architecture

### Design Principles Recap
✅ **Outputs in MCPs**: Thoughts → Manifold, Hypotheses/Facts → Ariadne  
✅ **Watchlists Central**: Agents check `get-watchlist`, manage via `add-watchlist`  
✅ **Prompts Timeless**: No hardcoded Themes/Tickers in prompts  
✅ **Agent Rules**: Documented MCP usage, per-agent  
✅ **Per-Agent Models**: Haiku for simple, Sonnet for complex  
✅ **Trade-Hypothesis Loop**: Trades link to Hypotheses; post-close evaluation  
✅ **Tesseract in Validator**: Semantic search over articles for evidence  
✅ **Observability Files**: Chat history logged for UI-replay, not outputs  
✅ **Cost Optimized**: ~$7–8/month (under $50 target)  

### File Structure
```
orchestrator/
├── src/
│   ├── agents/
│   │   ├── discovery.agent.ts
│   │   ├── analyst.agent.ts
│   │   ├── validator.agent.ts
│   │   ├── trader.agent.ts
│   │   └── reflection.agent.ts
│   ├── agent-runner.ts (Execute Agent + Track Budget + Log Chat)
│   ├── mcp-clients/
│   │   └── mcp-pool.ts
│   ├── budget/
│   │   └── token-budget.ts
│   └── main.ts
├── config/
│   └── agent-policies.yaml
├── agent-rules/
│   ├── discovery.md
│   ├── analyst-tech.md
│   ├── analyst-macro.md
│   └── …
└── package.json
```

### 24h Schedule
```
06:00 → Discovery (Haiku) → Watchlist + Trends
08:00 → Analyst Batch 1 (Sonnet/Haiku parallel) → Signals + Hypotheses
16:00 → Analyst Batch 2 (Haiku parallel) → Signals + Hypotheses
18:00 → Validator (Sonnet) → Evidence + Patterns
22:00 → Trader (Sonnet) → Trade Ideas + Hypothesis Linking
Next day repeat.
```

---

## Next Steps

1. **Implement Orchestrator** (TypeScript, Vercel AI SDK)
2. **Create Agent Rules** (discovery.md, analyst-tech.md, etc.)
3. **Code Agent Runners** (generic runner, MCP calling, budget tracking, chat logging)
4. **Setup Observability** (Chat history logs in S3, UI replay)
5. **Test Full Pipeline** (dry-run all agents, check Manifold/Ariadne outputs)
6. **Deploy** (Docker, systemd, or K8s CronJobs)
7. **Monitor & Iterate** (Watch accuracy, learn from Trade-Hypothesis loop)
