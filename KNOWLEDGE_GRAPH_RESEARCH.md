# Knowledge Graph (Subsystem 3) - Research & Design

**Datum:** 2025-10-21  
**Ziel:** State-of-the-Art Knowledge Graph für intelligente Trading-Signale durch Verständnis von Wirtschaft, Politik & Geschichte

---

## Use Case Definition

### Was wollen wir verstehen?

1. **Wirtschaft (Economy)**
   - Supply Chain Dependencies (TSMC → NVDA → Cloud Hyperscaler)
   - Market Relationships (Semiconductors → AI → Data Centers)
   - Competitor Analysis (AMD vs NVDA vs Intel)
   - Supplier-Customer Networks
   - Industry Hierarchies (Sector → Industry → Company)

2. **Politik (Politics)**
   - Regulatory Impact (US-China Chip Export Controls → NVDA Market Share)
   - Geopolitical Events (Taiwan Tensions → TSMC Risk → Semiconductor Shortage)
   - Trade Agreements & Tariffs
   - Government Contracts & Subsidies
   - Political Stability → Market Impact

3. **Geschichte (History)**
   - Recurring Patterns ("Gold as Safe Haven during Crisis")
   - Historical Correlations (Oil Prices ↔ Inflation ↔ Fed Rates)
   - Crisis Response Patterns (2008, 2020, etc.)
   - Long-term Trends (Tech Adoption Curves)
   - Sentiment Shifts over Time

### Trading Signal Examples

**Deduktive Signale:**
1. "TSMC announces capacity expansion" → (KG: TSMC supplies NVDA) → **NVDA bullish**
2. "US bans chip exports to China" → (KG: NVDA has 95% China market share) → **NVDA bearish**
3. "Gold price spike" + (KG: Gold spikes during uncertainty) → **Risk-off sentiment** → **Tech bearish**
4. "Lithium shortage news" → (KG: Tesla needs Lithium) → **TSLA supply risk**

---

## Knowledge Graph Fundamentals

### Was ist ein Knowledge Graph?

Ein Knowledge Graph ist eine **strukturierte Repräsentation von Wissen** in Form von:
- **Entities (Nodes):** Companies, Events, Concepts, People, Locations
- **Relations (Edges):** supplies, competes_with, affects, causes, located_in
- **Properties (Attributes):** timestamps, values, metadata

**Beispiel:**
```
(NVDA:Company) -[SUPPLIES_TO]-> (Microsoft:Company)
(NVDA) -[HAS_SUPPLIER]-> (TSMC:Company)
(TSMC) -[LOCATED_IN]-> (Taiwan:Country)
(Taiwan) -[GEOPOLITICAL_RISK]-> (China_Tensions:Event)
```

**Query:**  
"Wenn China-Taiwan Spannungen steigen, welche US-Unternehmen sind betroffen?"
→ Traversiere Graph: China_Tensions → Taiwan → TSMC → {NVDA, AMD, Apple, ...}

### Warum besser als SQL?

| Aspekt | SQL (Relational) | Knowledge Graph |
|--------|------------------|-----------------|
| **Relationships** | JOINs (slow, rigid) | Native (fast, flexible) |
| **Schema** | Fixed | Dynamic |
| **Multi-hop Queries** | Complex, nested JOINs | Simple path traversal |
| **Pattern Discovery** | Difficult | Built-in algorithms |
| **Temporal Data** | Denormalized tables | Time-aware edges |

**SQL:**
```sql
SELECT c2.* FROM companies c1
JOIN supply_chain sc ON c1.id = sc.supplier_id
JOIN companies c2 ON sc.customer_id = c2.id
WHERE c1.name = 'TSMC'
```

**Graph (Cypher):**
```cypher
MATCH (tsmc:Company {name: "TSMC"})-[:SUPPLIES_TO]->(customer)
RETURN customer
```

---

## Graph Database Options

### 1. **Neo4j** (⭐ Industry Standard)

**Pros:**
- ✅ Mature, battle-tested (seit 2007)
- ✅ Native Graph Storage (optimiert für Traversals)
- ✅ Cypher Query Language (intuitive, SQL-like)
- ✅ ACID Transactions
- ✅ Excellent Python Driver (`neo4j-driver`)
- ✅ Built-in Graph Algorithms (PageRank, Community Detection, etc.)
- ✅ Temporal Queries (Zeit-Aware)
- ✅ Visualization Tools (Neo4j Browser, Bloom)
- ✅ Large Community & Ecosystem

**Cons:**
- ❌ Community Edition: Single-server only (aber ausreichend für uns)
- ❌ Memory-hungry (aber wir haben 64GB RAM)
- ❌ Licensing (Enterprise features kostenpflichtig, aber Community reicht)

**Use Case Fit:** ⭐⭐⭐⭐⭐ (Perfect)
- Ideal für Supply Chain, Entity Relationships
- Native Multi-hop Queries
- Time-series Support
- Extensive Algo Library

**Docker:**
```yaml
neo4j:
  image: neo4j:5.15-community
  ports:
    - "7474:7474"  # Browser
    - "7687:7687"  # Bolt protocol
  environment:
    - NEO4J_AUTH=neo4j/password
  volumes:
    - ./data/neo4j:/data
```

---

### 2. **ArangoDB** (Multi-Model)

**Pros:**
- ✅ Multi-model (Graph + Document + Key-Value)
- ✅ AQL Query Language (flexible)
- ✅ Horizontal Scaling (Cluster support)
- ✅ Good Performance
- ✅ Free & Open Source

**Cons:**
- ❌ Nicht native Graph (Document-based mit Graph Layer)
- ❌ Kleinere Community als Neo4j
- ❌ Weniger Graph-specific Algorithms

**Use Case Fit:** ⭐⭐⭐ (Good, aber Overkill)
- Gut für Hybrid-Use-Cases
- Mehr Features als wir brauchen
- Neo4j ist spezialisierter für Graphs

---

### 3. **JanusGraph** (Scalable)

**Pros:**
- ✅ Massive Scalability (Google/Facebook-scale)
- ✅ Pluggable Storage Backends (Cassandra, HBase, Berkeley DB)
- ✅ Open Source (Apache License)

**Cons:**
- ❌ Komplex zu setup & maintain
- ❌ Overkill für unseren Use Case
- ❌ Weniger intuitive als Neo4j

**Use Case Fit:** ⭐⭐ (Overkill)

---

### 4. **Memgraph** (In-Memory)

**Pros:**
- ✅ In-Memory (sehr schnell)
- ✅ Cypher-compatible
- ✅ Stream Processing (Kafka, Pulsar)

**Cons:**
- ❌ Kleinere Community
- ❌ Weniger Algo-Library als Neo4j

**Use Case Fit:** ⭐⭐⭐⭐ (Interessant, aber Neo4j reifer)

---

## Graph Algorithms (Warum wichtig?)

### 1. **Centrality Algorithms** (Wer ist wichtig?)

#### PageRank
**Was:** Misst globale Wichtigkeit eines Nodes basierend auf eingehenden Links  
**Use Case:** "Welche Unternehmen sind systemrelevant im Semiconductor-Netzwerk?"  
**Beispiel:** TSMC hat höchsten PageRank → Single Point of Failure → Risiko

#### Betweenness Centrality
**Was:** Misst wie oft ein Node auf kürzesten Pfaden liegt  
**Use Case:** "Welche Unternehmen sind Bottlenecks in der Supply Chain?"  
**Beispiel:** ASML (Lithography Machines) → Einziger Supplier für <7nm → Kritischer Bottleneck

#### Degree Centrality
**Was:** Anzahl direkter Verbindungen  
**Use Case:** "Welche Unternehmen haben die meisten Supplier/Customers?"  
**Beispiel:** Apple hat 200+ Suppliers → Hohe Abhängigkeit

---

### 2. **Community Detection** (Cluster finden)

#### Louvain Algorithm
**Was:** Findet dicht verbundene Cluster im Graph  
**Use Case:** "Welche Unternehmen bilden ein Ökosystem?"  
**Beispiel:** {NVDA, AMD, TSMC, ASML} = Semiconductor Cluster

#### Label Propagation
**Was:** Propagiert Labels durch Nachbarschaft  
**Use Case:** "Wie breitet sich ein Supply-Shock aus?"  
**Beispiel:** TSMC Outage → Propagiert zu NVDA, AMD, Apple, ...

---

### 3. **Path Finding** (Beziehungen entdecken)

#### Shortest Path
**Was:** Kürzester Pfad zwischen zwei Nodes  
**Use Case:** "Wie ist Unternehmen A mit B verbunden?"  
**Beispiel:** (Tesla) -[NEEDS]-> (Lithium) -[MINED_BY]-> (Albemarle) = 2 Hops

#### All Simple Paths
**Was:** Alle Pfade zwischen zwei Nodes  
**Use Case:** "Welche alternativen Supply Chains existieren?"  
**Beispiel:** NVDA kann Chips von TSMC ODER Samsung beziehen

---

### 4. **Link Prediction** (Was fehlt?)

**Was:** Vorhersage wahrscheinlicher zukünftiger Verbindungen  
**Use Case:** "Welche Partnerschaften sind wahrscheinlich?"  
**Beispiel:** OpenAI arbeitet mit MSFT + NVDA → Prediction: OpenAI-NVDA Partnership wahrscheinlich

---

### 5. **Temporal Analysis** (Zeit-Aware)

**Was:** Zeitliche Entwicklung von Beziehungen  
**Use Case:** "Wie hat sich die Supply Chain über Zeit verändert?"  
**Beispiel:** NVDA Supplier: 2020={TSMC}, 2023={TSMC, Samsung} → Diversification

---

## Knowledge Graph Schema (Domain Model)

### Node Types (Entities)

```python
# Companies
Company {
  id: UUID
  name: str
  ticker: str
  sector: str
  market_cap: float
  description: str
}

# Events
Event {
  id: UUID
  type: str  # "regulatory", "geopolitical", "earnings", "crisis"
  title: str
  date: datetime
  impact_score: float
  summary: str
}

# Concepts
Concept {
  id: UUID
  name: str  # "Semiconductor Shortage", "AI Boom", "Supply Chain Risk"
  category: str
  description: str
}

# Locations
Location {
  id: UUID
  name: str
  country: str
  region: str
  geopolitical_risk: float
}

# Products/Technologies
Product {
  id: UUID
  name: str
  category: str
  description: str
}

# People (CEOs, Politicians)
Person {
  id: UUID
  name: str
  role: str
  organization: str
}
```

### Relationship Types (Edges)

```python
# Supply Chain
(Company)-[SUPPLIES_TO {since: date, volume: float}]->(Company)
(Company)-[COMPETES_WITH {intensity: float}]->(Company)
(Company)-[PRODUCES]->(Product)

# Geopolitics
(Company)-[LOCATED_IN]->(Location)
(Event)-[AFFECTS {impact: float}]->(Company)
(Location)-[GEOPOLITICAL_RISK]->(Event)

# Concepts
(Event)-[INDICATES]->(Concept)
(Company)-[RELATED_TO]->(Concept)
(News)-[MENTIONS]->(Company|Event|Concept)

# Temporal
(Company)-[HAD_SUPPLIER {from: date, to: date}]->(Company)
(Event)-[CAUSED]->(Event)
(Event)-[FOLLOWED_BY]->(Event)

# Sentiment
(News)-[SENTIMENT {score: float, date: date}]->(Company)
```

---

## Knowledge Graph Architecture

### Extraction Pipeline

```
┌─────────────┐
│  Satbase    │  Raw News
│  (2,408)    │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  Named Entity       │  Spacy/LLM
│  Recognition (NER)  │  Extract: Companies, Events, Locations
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Relation           │  LLM/Rules
│  Extraction (RE)    │  "TSMC supplies NVDA"
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Entity Resolution  │  Deduplicate
│  & Linking          │  "Nvidia" = "NVDA" = "NVIDIA Corp"
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Neo4j              │  Store as Graph
│  Knowledge Graph    │
└─────────────────────┘
```

### Query Layer

```
┌─────────────┐
│  Agent      │  "Welche Unternehmen sind von Taiwan-Risiko betroffen?"
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  KG Query API       │  Cypher Query Generation
│  (FastAPI)          │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Neo4j              │  Graph Traversal
│  (Cypher)           │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Result Formatter   │  {entities, relationships, paths, insights}
│  & Enricher         │
└──────┬──────────────┘
       │
       ▼
┌─────────────┐
│  Agent      │  Contextualized Response
└─────────────┘
```

---

## Implementation Plan

### Phase 1: Foundation (Week 1)
- [ ] Setup Neo4j (Docker, Community Edition)
- [ ] Define Core Schema (Company, Event, Concept)
- [ ] Python Client Library (`neo4j-driver`)
- [ ] Basic CRUD API (FastAPI)
- [ ] Manual Data Import (Top 100 Companies)

### Phase 2: Extraction (Week 2)
- [ ] NER Pipeline (Spacy + Custom Rules)
- [ ] Relation Extraction (LLM-based)
- [ ] Entity Resolution (Fuzzy Matching + Manual Curation)
- [ ] Batch Import from Satbase (2,408 articles)

### Phase 3: Algorithms (Week 3)
- [ ] PageRank für Company Importance
- [ ] Community Detection für Clusters
- [ ] Shortest Path für Supply Chain
- [ ] Temporal Queries für History

### Phase 4: Frontend (Week 4)
- [ ] Graph Visualization (D3.js oder Cytoscape.js)
- [ ] Query Interface (Natural Language → Cypher)
- [ ] Insights Dashboard (Top Entities, Communities, Trends)

---

## Tech Stack Recommendation

### Core
- **Graph DB:** Neo4j 5.15 Community Edition
- **Query Language:** Cypher
- **Python Client:** `neo4j` (official driver)
- **API Framework:** FastAPI (wie Satbase/Tesseract)

### NER & Extraction
- **NER:** `spacy` mit `en_core_web_trf` (Transformer-based)
- **Relation Extraction:** OpenAI API (GPT-4) oder lokales LLM
- **Entity Resolution:** `rapidfuzz` für Fuzzy Matching
- **Temporal Extraction:** `dateparser`

### Algorithms
- **Neo4j Graph Data Science (GDS) Library:**
  - PageRank
  - Louvain Community Detection
  - Shortest Path
  - Betweenness Centrality
  - Node Similarity

### Frontend
- **Visualization:** `neovis.js` (Neo4j native) oder `cytoscape.js`
- **Query Builder:** Custom React/Svelte Component
- **Framework:** Svelte (wie LookingGlass)

---

## Example Queries

### 1. Supply Chain Impact
```cypher
// Welche Unternehmen sind von TSMC abhängig?
MATCH path = (tsmc:Company {name: "TSMC"})-[:SUPPLIES_TO*1..3]->(dependent)
RETURN dependent.name, length(path) as hops
ORDER BY hops
```

### 2. Geopolitical Risk
```cypher
// Unternehmen mit Taiwan-Exposure
MATCH (company:Company)-[:LOCATED_IN|HAS_SUPPLIER*1..2]->(location:Location {country: "Taiwan"})
RETURN company.name, company.ticker, COUNT(*) as taiwan_dependencies
ORDER BY taiwan_dependencies DESC
```

### 3. Historical Pattern
```cypher
// "Gold als Safe Haven" Pattern
MATCH (gold:Concept {name: "Gold Price"})<-[r:CORRELATED_WITH]-(event:Event)
WHERE event.type = "crisis" AND r.correlation > 0.7
RETURN event.title, event.date, r.correlation
ORDER BY event.date DESC
```

### 4. Competitor Analysis
```cypher
// Direkte Konkurrenten von NVDA
MATCH (nvda:Company {ticker: "NVDA"})-[:COMPETES_WITH]-(competitor)
RETURN competitor.name, competitor.market_cap
ORDER BY competitor.market_cap DESC
```

### 5. Community Detection
```cypher
// Semiconductor Ecosystem
CALL gds.louvain.stream('company-graph')
YIELD nodeId, communityId
WHERE communityId = 42  // Semiconductor cluster
RETURN gds.util.asNode(nodeId).name
```

---

## Performance Considerations

### Neo4j Optimization
1. **Indexes:** Auf häufig queried Properties
   ```cypher
   CREATE INDEX company_ticker FOR (c:Company) ON (c.ticker)
   CREATE INDEX event_date FOR (e:Event) ON (e.date)
   ```

2. **Constraints:** Für Datenintegrität
   ```cypher
   CREATE CONSTRAINT company_id_unique FOR (c:Company) REQUIRE c.id IS UNIQUE
   ```

3. **Memory Configuration:**
   ```
   dbms.memory.heap.initial_size=2G
   dbms.memory.heap.max_size=4G
   dbms.memory.pagecache.size=2G
   ```

4. **Query Optimization:**
   - Profiling mit `PROFILE` keyword
   - Limit early with `LIMIT`
   - Use indexes (`USING INDEX`)

---

## Data Quality

### Entity Resolution Challenges
1. **Company Name Variations:**
   - "NVIDIA" = "Nvidia" = "NVDA" = "Nvidia Corporation"
   - Solution: Canonical Name + Aliases

2. **Ticker Ambiguity:**
   - "TSM" (Taiwan Semi) vs "TSMC"
   - Solution: Prefer Official Tickers + Validation

3. **Temporal Consistency:**
   - "Facebook" → "Meta" (name change)
   - Solution: Temporal Nodes mit `valid_from`/`valid_to`

### Validation Pipeline
1. **Automated Checks:**
   - Ticker validation against yfinance
   - Duplicate detection
   - Orphaned nodes (keine edges)

2. **Human-in-Loop:**
   - Ambiguous entities → Manual review
   - High-impact relationships → Verification
   - Quarterly audit of top 100 companies

---

## Success Metrics

### Coverage
- ✅ 500+ Companies indexed
- ✅ 1,000+ Events extracted
- ✅ 10,000+ Relationships discovered

### Quality
- ✅ >95% Entity Resolution Accuracy
- ✅ >90% Relation Extraction Precision
- ✅ <5% Duplicate Entities

### Utility
- ✅ Agent can answer 80% of Supply Chain questions
- ✅ <100ms Average Query Latency
- ✅ 10+ Actionable Insights per week

---

## Comparison: KG vs Alternatives

| Approach | Pros | Cons | Fit |
|----------|------|------|-----|
| **Knowledge Graph** | Native relationships, flexible schema, graph algorithms | Initial setup effort, NER complexity | ⭐⭐⭐⭐⭐ |
| **SQL Database** | Familiar, mature tooling | Multi-hop queries slow, rigid schema | ⭐⭐ |
| **Document Store** | Flexible, fast writes | No relationship queries, manual linking | ⭐⭐ |
| **Vector Search Only** | Semantic similarity | No structured relationships, black box | ⭐⭐⭐ |
| **LLM Only** | Zero setup | Hallucinations, no ground truth, expensive | ⭐⭐ |

**Hybrid Approach (Recommended):**
- **Tesseract:** Semantic Search (find relevant news)
- **Knowledge Graph:** Structured Relationships (understand connections)
- **LLM:** Reasoning Layer (generate insights)

```
Query: "Welche Chip-Unternehmen sind von Taiwan-Risiko betroffen?"

1. Tesseract: Finde News zu "Taiwan", "Chips", "Geopolitical Risk"
2. KG: Query Supply Chain Graph für Taiwan-exposed companies
3. LLM: Synthesize → "NVDA, AMD, Apple sind stark betroffen weil..."
```

---

## Next Steps

### Decision Points
1. **Neo4j vs ArangoDB?**
   - Recommendation: **Neo4j** (spezialisiert, reif, bessere Algo-Library)

2. **NER: Spacy vs LLM?**
   - Recommendation: **Hybrid** (Spacy für Entities, LLM für Relations)

3. **Manual Curation: How much?**
   - Recommendation: **Top 500 Companies** manual, Rest automated

4. **Visualization: Custom vs Neo4j Browser?**
   - Recommendation: **Start with Neo4j Browser**, custom later wenn nötig

### Ready to Start?
- ✅ Neo4j ist die richtige Wahl
- ✅ Clear Use Cases definiert
- ✅ Schema designed
- ✅ Pipeline geplant
- ✅ Satbase/Tesseract als Data Sources bereit

**Sollen wir mit Neo4j Setup + Core Schema beginnen?**

