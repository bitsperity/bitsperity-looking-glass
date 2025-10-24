# Agent System Architecture: From World Model to Portfolio Management

## Executive Summary

Das System orchestriert spezialisierte AI-Agents, um ein umfassendes, rationales Weltmodell aufzubauen und darauf basierend automatisiert ein Portfolio zu managen. Die drei Hauptkomponenten (repo-konform):

- **Satbase**: News-/Prices-/Macro-Daten (EOD), Watchlist-gesteuert
- **Tesseract**: Semantische News-Suche über den Satbase-Corpus (Batch/inkrementelle Embeddings)
- **Manifold**: Hypothesis generation, reasoning, temporal knowledge management
- **Ariadne**: Structured knowledge graph, causal inference, impact analysis

## System Overview

```mermaid
graph TB
    subgraph "Data Sources"
        Market[Market Data<br/>EOD Prices]
        News[News & Events<br/>RSS/APIs]
        Macro[Macro Data<br/>FRED]
    end

    subgraph "Satbase Layer (täglich)"
        SBNews[News Connectors]
        SBPrices[EOD Prices]
        SBMacro[Macro (FRED)]
        SBWatch[Watchlists]
    end

    subgraph "Tesseract Layer (Batch)"
        Embed[Batch/Incremental Embedding aus Satbase-News]
        Search[Semantic Search API]
    end

    subgraph "Manifold Layer (60min/daily)"
        Observe[Observation Agent]
        Reason[Reasoning Agent]
        Hypo[Hypothesis Agent]
        Reflect[Reflection Agent]
        Synthesize[Synthesis Agent]
    end

    subgraph "Ariadne Layer (hourly/on-demand)"
        Validate[Validation Agent]
        Graph[Graph Builder Agent]
        Impact[Impact Analysis Agent]
        Pattern[Pattern Recognition Agent]
        Regime[Regime Detection Agent]
    end

    subgraph "Decision Layer"
        Risk[Risk Assessment Agent]
        Portfolio[Portfolio Construction Agent]
        Execution[Execution Agent]
        Monitor[Monitoring Agent]
    end

    Market --> SBPrices
    News --> SBNews
    Macro --> SBMacro
    SBWatch --> SBNews
    SBWatch --> SBPrices

    SBNews --> Embed --> Search --> Observe
    SBPrices --> Graph
    SBMacro --> Graph

    Observe --> Reason
    Reason --> Hypo
    Observe --> Reflect
    Reflect --> Synthesize
    Hypo --> Synthesize

    Synthesize --> Validate
    Validate --> Graph
    Graph --> Impact
    Graph --> Pattern
    Graph --> Regime

    Impact --> Risk
    Pattern --> Risk
    Regime --> Risk
    Risk --> Portfolio
    Portfolio --> Execution
    Execution --> Monitor
    Monitor --> Reflect
```

---

## 2. Manifold Layer: Reasoning and Hypothesis Generation

### 2.1 Observation Agent

**Purpose**: Aufnahme von News-Top-N und erste Interpretation

**Schedule**: alle 60 Minuten (event-triggered für High-Importance möglich)

**Process**:
1. Consume Top-N aus Tesseract Search
2. Relevanz/Novelty Heuristik + Embedding-Gate
3. Create Observation thoughts
4. Link zu verwandten Thoughts (Similarity)
5. Store in Qdrant

### 2.2 Reasoning Agent

**Purpose**: Ableitung von Kausal-Ketten und Implikationen

**Schedule**: stündlich; LLM nur für Top-Cluster (Budget-gated)

**Process**:
1. Cluster letzte 24h Observations
2. Kausal-Relationen extrahieren
3. Zweite/Dritte-Ordnungseffekte
4. Reasoning Thoughts erstellen

### 2.3 Hypothesis Agent

**Schedule**: täglich (EOD), trigger auf starke Kausal-Ketten

### 2.4 Reflection/Synthesis

**Reflection**: wöchentlich; **Synthesis**: täglich (EOD)

---

## 3. Ariadne Layer: Structured Knowledge and Causal Inference

### 3.1 Validation Agent

**Schedule**: stündlich (priorisierte Queue)

### 3.2 Graph Builder Agent

**Mode**: eventgetrieben + tägliche Pflege (Dedupe/Prune/Communities)

### 3.3 Impact Analysis Agent

**Schedule**: On-demand (UI/API) + bei High-Importance Events

**Process**:

```python
def calculate_impact(event_id, max_depth=3):
    """
    Impact = f(direct_effect, indirect_effects, temporal_decay, confidence)
    """
    query = """
    MATCH (e:Event {id: $event_id})
    MATCH path = (e)-[r:(AFFECTS|INCREASES|DECREASES|BENEFITS_FROM|DEPENDS_ON|COMPETES_WITH)*1..3]->(impacted)
    WHERE impacted:Company OR impacted:Concept
    WITH relationships(path) as path_rels, impacted, size(relationships(path)) as depth
    WITH impacted, depth,
         reduce(score = 1.0, r IN path_rels |
            score * coalesce(r.weight, 1.0) * coalesce(r.confidence, 1.0) * 0.8
         ) AS impact_score,
         all(r IN path_rels WHERE $as_of >= r.valid_from AND ($as_of <= r.valid_to OR r.valid_to IS NULL)) AS is_valid
    WHERE is_valid = true
    RETURN impacted.ticker AS ticker,
           impacted.name AS name,
           impact_score,
           depth
    ORDER BY impact_score DESC
    LIMIT 50
    """
    return execute_query(query, event_id=event_id, max_depth=max_depth, as_of=now())
```

---

## 5. Cross-Layer Integration and Data Flow

### 5.2 Daily Operational Schedule (kostenbewusst, repo-konform)

**00:00 - Market Closed**
- Manifold: Synthesis Agent summarizes day
- Ariadne: Pattern Recognition wöchentlich (So)
- Decision: Portfolio Construction Agent rebalances

**04:00 - Pre-Market**
- Tesseract: Nightly/inkrementelles Embedding aus Satbase-News
- Manifold: Reasoning verarbeitet Overnight-Observations
- Ariadne: Regime Detection updates

**09:30 - Market Open**
- On-demand Modus (keine RT-Streams)
- Tesseract: Semantische Suche on-demand
- Manifold: Observation alle 60 Min (Event-Trigger möglich)
- Ariadne: Impact Analysis on-demand
- Decision: Execution Agent aktiv

**16:00 - Market Close**
- Decision: Portfolio Construction für nächsten Tag
- Manifold: Reflection Review
- Ariadne: Graph Maintenance

