# Coalescence 160IQ Agent Vision

## Aktueller Stand ✅

### Was bereits funktioniert:
1. **Multi-Turn Context**: Context wird jetzt zwischen Turns weitergegeben (FIXED)
2. **4 MCPs verfügbar**: Satbase, Tesseract, Manifold, Ariadne
3. **Agent-Koordination**: Mehrere spezialisierte Agents können parallel laufen
4. **Knowledge Graph**: MCP existiert bereits (`mcp-knowledge-graph`)

---

## Was fehlt für 160IQ Agent-Vision

### 1. **Langfristiges Memory & Knowledge-Building** 🧠

**Problem**: Agent vergisst zwischen Runs alles. Keine langfristige Wissensbasis.

**Lösung**:
- **Knowledge Graph Integration**: Agent sollte automatisch wichtige Erkenntnisse im KG speichern
- **Run-to-Run Memory**: Agent sollte vor jedem Run relevante Kontext aus früheren Runs laden
- **Semantic Memory Search**: Agent sollte ähnliche Situationen aus der Vergangenheit finden können

**Implementierung**:
```typescript
// Vor jedem Run: Load relevant context
async function loadRunContext(agentName: string, db: OrchestrationDB) {
  // 1. Finde ähnliche frühere Runs (basierend auf Prompt/Topic)
  // 2. Lade wichtige Erkenntnisse aus Knowledge Graph
  // 3. Lade relevante Thoughts aus Manifold
  // 4. Erstelle Context-Zusammenfassung für Agent
}

// Nach jedem Run: Save insights
async function saveRunInsights(runId: string, insights: string[], db: OrchestrationDB) {
  // 1. Speichere Erkenntnisse im Knowledge Graph
  // 2. Erstelle Thoughts in Manifold
  // 3. Verknüpfe Insights mit relevanten Entities
}
```

---

### 2. **Agent-to-Agent Kommunikation** 📡

**Problem**: Agents arbeiten isoliert, können nicht voneinander lernen.

**Lösung**:
- **Shared Message Board**: Agents können Nachrichten für andere Agents hinterlassen
- **Event Bus**: Agents können Events publizieren (z.B. "Market anomaly detected")
- **Knowledge Sharing**: Agent A findet etwas → Agent B kann es nutzen

**Implementierung**:
```typescript
interface AgentMessage {
  from: string;
  to: string | 'all';
  type: 'insight' | 'warning' | 'data' | 'question';
  content: string;
  timestamp: Date;
  related_entities?: string[];
}

// Agent A findet wichtiges Signal
await db.publishAgentMessage({
  from: 'analyst_tech',
  to: 'trader_main',
  type: 'insight',
  content: 'NVDA showing unusual volume spike - supply chain disruption detected',
  related_entities: ['NVDA', 'supply_chain']
});

// Agent B liest beim Start
const messages = await db.getAgentMessages('trader_main');
```

---

### 3. **Reflexive Metakognition** 🔄

**Problem**: Agent reflektiert nicht über eigene Entscheidungen und Verbesserungen.

**Lösung**:
- **Post-Run Reflection**: Nach jedem Run reflektiert Agent über Erfolg/Fehler
- **Strategy Evolution**: Agent passt eigene Strategie basierend auf Ergebnissen an
- **Confidence Tracking**: Agent trackt eigene Confidence vs. tatsächliche Outcomes

**Implementierung**:
```typescript
interface RunReflection {
  runId: string;
  agent: string;
  selfAssessment: {
    confidence: number;  // 0-1
    keyDecisions: string[];
    expectedOutcome: string;
    actualOutcome?: string;  // Filled later
  };
  improvements: string[];
  nextRunStrategy: string;
}

// Nach jedem Run
async function reflectOnRun(runId: string, agent: string, db: OrchestrationDB) {
  // Agent analysiert eigenen Run
  // Identifiziert was gut/ schlecht lief
  // Erstellt Verbesserungsvorschläge für nächsten Run
}
```

---

### 4. **Adaptive Turn-Strategie** 🎯

**Problem**: Turns sind statisch definiert. Agent kann nicht dynamisch entscheiden was zu tun ist.

**Lösung**:
- **Dynamic Turn Generation**: Agent entscheidet selbst welche Turns nötig sind
- **Conditional Turns**: "Wenn X dann Y, sonst Z"
- **Meta-Turns**: Agent kann neue Turns generieren basierend auf Erkenntnissen

**Implementierung**:
```yaml
# agents.yaml
agents:
  adaptive_analyst:
    enabled: true
    adaptive: true  # NEW: Agent kann Turns dynamisch generieren
    initial_turns:
      - name: assess_situation
        prompt: "Assess current market situation and decide what data you need"
      - name: gather_critical_data
        prompt: "Gather the most critical data based on your assessment"
    # Agent entscheidet selbst welche weiteren Turns nötig sind
```

---

### 5. **Multi-Agent Orchestration** 🎭

**Problem**: Agents arbeiten sequenziell, nicht orchestriert.

**Lösung**:
- **Agent Hierarchies**: Supervisor-Agent koordiniert Worker-Agents
- **Parallel Execution**: Mehrere Agents arbeiten gleichzeitig an verschiedenen Tasks
- **Result Aggregation**: Supervisor sammelt Ergebnisse und trifft finale Entscheidung

**Implementierung**:
```typescript
interface AgentTask {
  agent: string;
  task: string;
  priority: number;
  dependencies?: string[];  // Andere Tasks die erst fertig sein müssen
}

// Supervisor Agent erstellt Task-Plan
const tasks: AgentTask[] = [
  { agent: 'analyst_tech', task: 'Analyze NVDA supply chain', priority: 1 },
  { agent: 'analyst_macro', task: 'Check Fed policy impact', priority: 1 },
  { agent: 'trader_main', task: 'Make trading decision', priority: 2, dependencies: ['analyst_tech', 'analyst_macro'] }
];

// Execute in parallel where possible
await executeTaskPlan(tasks);
```

---

### 6. **Knowledge Graph als Langzeit-Memory** 📚

**Problem**: Alle Erkenntnisse gehen verloren zwischen Runs.

**Lösung**:
- **Automatic KG Updates**: Agent speichert automatisch wichtige Erkenntnisse
- **Entity Tracking**: Ticker, Companies, Events werden als Entities gespeichert
- **Relationship Building**: Agent erkennt und speichert Relationen (z.B. "NVDA profits from AI boom")

**Workflow**:
1. Agent findet wichtige Information → Speichert als Entity/Observation im KG
2. Agent erkennt Muster → Erstellt Relationships
3. Nächster Run → Agent lädt relevante Entities aus KG
4. Agent nutzt Knowledge Graph für bessere Entscheidungen

---

### 7. **Trading Decision Pipeline** 💰

**Problem**: Agent sammelt Daten, aber nutzt sie nicht für konkrete Trading-Entscheidungen.

**Lösung**:
- **Signal Aggregation**: Agent sammelt alle Signale aus verschiedenen Quellen
- **Confidence Scoring**: Agent bewertet jedes Signal mit Confidence-Score
- **Decision Framework**: Klarer Prozess: Daten → Analyse → Signal → Decision → Execution

**Implementierung**:
```typescript
interface TradingSignal {
  ticker: string;
  direction: 'long' | 'short' | 'neutral';
  confidence: number;  // 0-1
  reasoning: string;
  sources: string[];  // Welche MCPs/Agents haben Signal generiert
  timestamp: Date;
}

// Agent aggregiert Signale
const signals = await aggregateSignals([
  await satbase.getTrendingTickers(),
  await tesseract.semanticSearch('supply chain disruption'),
  await manifold.getRelatedThoughts('NVDA')
]);

// Agent trifft Entscheidung
const decision = await makeTradingDecision(signals);
```

---

## Roadmap für Implementation

### Phase 1: Foundation (NOW) ✅
- [x] Context zwischen Turns (FIXED)
- [x] Umbenennung zu Coalescence
- [ ] Knowledge Graph MCP Integration

### Phase 2: Memory & Knowledge (Next)
- [ ] Run-to-Run Context Loading
- [ ] Automatic KG Updates nach Runs
- [ ] Semantic Memory Search

### Phase 3: Agent Communication (Then)
- [ ] Agent Message Board
- [ ] Event Bus für Agent Events
- [ ] Shared Knowledge Repository

### Phase 4: Intelligence (Future)
- [ ] Reflexive Metakognition
- [ ] Adaptive Turn Generation
- [ ] Multi-Agent Orchestration

### Phase 5: Trading Integration (Final)
- [ ] Signal Aggregation Framework
- [ ] Decision Pipeline
- [ ] Execution Integration (mit Alpaca API)

---

## Konkrete nächste Schritte

1. **Knowledge Graph MCP aktivieren** in ToolExecutor
2. **Run Context Loading** implementieren
3. **Post-Run KG Updates** automatisch durchführen
4. **Agent Message Board** Datenbank-Tabelle erstellen
5. **Reflection Framework** für Post-Run Analysis

---

## Beispiel: 160IQ Agent Workflow

```
1. Agent startet Run
   ↓
2. Lädt relevanten Context aus:
   - Frühere Runs mit ähnlichen Topics
   - Knowledge Graph Entities (relevant für heutige Analyse)
   - Manifold Thoughts (letzte 7 Tage)
   - Messages von anderen Agents
   ↓
3. Turn 1: "Assess Situation"
   - Nutzt geladenen Context
   - Entscheidet welche Daten kritisch sind
   ↓
4. Turn 2-4: "Gather Data"
   - Sammelt Daten von Satbase, Tesseract
   - Verknüpft neue Erkenntnisse mit KG
   ↓
5. Turn 5: "Analyze & Hypothesize"
   - Erstellt Hypothesen in Ariadne
   - Speichert Insights in Manifold
   ↓
6. Turn 6: "Make Decision"
   - Aggregiert alle Signale
   - Trifft Trading-Entscheidung
   ↓
7. Post-Run:
   - Speichert wichtige Erkenntnisse im KG
   - Publiziert wichtige Insights für andere Agents
   - Reflektiert über eigene Performance
   - Erstellt Verbesserungsvorschläge für nächsten Run
```

---

## Zusammenfassung

**Coalescence sollte werden**:
- Ein intelligentes Multi-Agent System mit langfristigem Memory
- Agents die voneinander lernen und kommunizieren
- Ein System das sich selbst verbessert durch Reflexion
- Eine Trading-Pipeline die Daten → Wissen → Entscheidungen transformiert

**Aktueller Status**: Foundation steht, Context-Problem gelöst ✅
**Nächster Schritt**: Knowledge Graph Integration für langfristiges Memory

